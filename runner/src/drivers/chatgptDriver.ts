import type { ElementHandle, Page } from 'playwright';
import type { ParticipantDriver } from './base.js';
import { verifyPastedPrompt } from './pasteVerification.js';

const composerSelectors = [
  'textarea',
  '[contenteditable="true"]',
  '[role="textbox"]',
];

const assistantSelectors = [
  '[data-message-author-role="assistant"]',
  '[data-testid*="conversation-turn"][data-testid*="assistant"]',
  '[class*="markdown"]',
  'article',
];

type ComposerKind = 'textarea' | 'contenteditable' | 'role=textbox';

type ComposerMatch = {
  element: ElementHandle<Element>;
  selector: string;
  kind: ComposerKind;
};

async function findVisibleElement(page: Page, selectors: string[]) {
  for (const selector of selectors) {
    const candidates = await page.$$(selector);

    for (const candidate of candidates) {
      if (await candidate.isVisible().catch(() => false)) {
        return candidate;
      }
    }
  }

  return undefined;
}

async function findComposer(page: Page): Promise<ComposerMatch> {
  for (const selector of composerSelectors) {
    const candidates = await page.$$(selector);

    for (const candidate of candidates) {
      if (await candidate.isVisible().catch(() => false)) {
        const kind = selector === 'textarea'
          ? 'textarea'
          : selector === '[contenteditable="true"]'
            ? 'contenteditable'
            : 'role=textbox';

        return {
          element: candidate,
          selector,
          kind,
        };
      }
    }
  }

  throw new Error('Could not find ChatGPT composer.');
}

async function composerText(page: Page) {
  return page.evaluate<string>(`(() => {
    const composer = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]'))
      .find((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      });

    if (!composer) return '';
    if ('value' in composer) return String(composer.value || '');
    return String(composer.innerText || composer.textContent || '');
  })()`);
}

async function verifyComposerContainsPrompt(page: Page, prompt: string) {
  await page.waitForTimeout(500);
  const text = await composerText(page);
  await verifyPastedPrompt(page, 'ChatGPT', prompt, text);
}

async function hasStopControl(page: Page) {
  return page.evaluate<boolean>(`(() => {
    return Array.from(document.querySelectorAll('button, [role="button"], [aria-label], [title]'))
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      })
      .some((el) => {
        const text = [
          el.textContent,
          el.getAttribute('aria-label'),
          el.getAttribute('title'),
          el.getAttribute('data-testid'),
        ].filter(Boolean).join(' ').toLowerCase();
        return text.includes('stop generating') || text.includes('stop');
      });
  })()`);
}

async function isComposerReady(page: Page) {
  return page.evaluate<boolean>(`(() => {
    const sendReady = Array.from(document.querySelectorAll('button, [role="button"], [aria-label], [title]'))
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      })
      .some((el) => {
        const text = [
          el.textContent,
          el.getAttribute('aria-label'),
          el.getAttribute('title'),
          el.getAttribute('data-testid'),
        ].filter(Boolean).join(' ').toLowerCase();
        const enabled = !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true';
        return enabled && (
          text.includes('send') ||
          text.includes('submit') ||
          text.includes('prompt-button-send') ||
          text.includes('send-button')
        );
      });

    const composerReady = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]'))
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      })
      .some((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true');

    return sendReady || composerReady;
  })()`);
}

async function latestAssistantText(page: Page) {
  return page.evaluate<string>(`(() => {
    const selectors = ${JSON.stringify(assistantSelectors)};
    const candidates = selectors
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      })
      .map((el) => ({
        bottom: el.getBoundingClientRect().bottom,
        text: el.textContent?.trim() ?? '',
      }))
      .filter((candidate) => candidate.text.length > 0)
      .sort((a, b) => b.bottom - a.bottom);

    return candidates[0]?.text ?? '';
  })()`);
}

async function clickEnabledSendButton(page: Page) {
  return page.evaluate<boolean>(`(() => {
    function visible(el) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    }

    function enabled(el) {
      return !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true';
    }

    function buttonText(button) {
      return [
        button.textContent,
        button.getAttribute('aria-label'),
        button.getAttribute('title'),
        button.getAttribute('data-testid')
      ].filter(Boolean).join(' ').toLowerCase();
    }

    const selectorGroups = [
      'button[data-testid*="send" i]',
      'button[aria-label*="Send"]',
      'button[aria-label*="send"]',
      'button:has(svg)',
      'button'
    ];

    const candidates = selectorGroups
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .filter((button, index, all) => all.indexOf(button) === index)
      .filter((button) => visible(button) && enabled(button))
      .filter((button) => {
        const text = buttonText(button);
        return text.includes('send') ||
          text.includes('submit') ||
          text.includes('prompt-button-send') ||
          text.includes('send-button') ||
          button.querySelector('svg');
      });

    const button = candidates[0];

    if (!button) {
      return false;
    }

    button.click();
    return true;
  })()`);
}

async function dispatchComposerEnter(page: Page) {
  return page.evaluate<boolean>(`(() => {
    function visible(el) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    }

    const composer = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]'))
      .find(visible);

    if (!composer) {
      return false;
    }

    composer.focus();
    const eventOptions = {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    };
    composer.dispatchEvent(new KeyboardEvent('keydown', eventOptions));
    composer.dispatchEvent(new KeyboardEvent('keypress', eventOptions));
    composer.dispatchEvent(new KeyboardEvent('keyup', eventOptions));
    return true;
  })()`);
}

export const chatgptDriver: ParticipantDriver = {
  name: 'ChatGPT',

  matchParticipant(participant) {
    return participant.id === 'chatgpt' || participant.url.includes('chatgpt.com');
  },

  async waitForReady(page: Page) {
    await page.waitForLoadState('domcontentloaded');
    await findComposer(page);
  },

  async pastePrompt(page: Page, prompt: string) {
    await this.waitForReady(page);
    const composer = await findComposer(page);
    console.log(`Composer found: ${composer.selector}`);
    console.log(`Composer strategy: ${composer.kind}`);
    console.log(`Prompt length: ${prompt.length}`);

    if (composer.kind === 'textarea') {
      await composer.element.fill(prompt);
      await verifyComposerContainsPrompt(page, prompt);
      console.log('Prompt pasted');
      return;
    }

    await composer.element.click();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.insertText(prompt);

    try {
      await verifyComposerContainsPrompt(page, prompt);
      console.log('Prompt pasted');
      return;
    } catch {
      await page.evaluate(
        async (text) => {
          await navigator.clipboard.writeText(text);
        },
        prompt,
      ).catch(() => undefined);
      await composer.element.click();
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');
      await verifyComposerContainsPrompt(page, prompt);
      console.log('Prompt pasted');
    }
  },

  async submitPrompt(page: Page) {
    if (await clickEnabledSendButton(page)) {
      console.log('Submit strategy:\n✓ Clicked enabled send button');
      return;
    }

    const composer = await findComposer(page);
    await composer.element.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    if (await hasStopControl(page)) {
      console.log('Submit strategy:\n✓ Keyboard Enter');
      return;
    }

    if (await dispatchComposerEnter(page)) {
      await page.waitForTimeout(500);
      console.log('Submit strategy:\n✓ KeyboardEvent Enter');
      return;
    }

    throw new Error('Unable to submit ChatGPT prompt.');
  },

  async waitForCompletion(page: Page) {
    try {
      const startedAt = Date.now();
      const hardTimeoutMs = 120000;
      const stableMs = 4000;
      let lastText = await latestAssistantText(page);
      let stableSince = Date.now();

      while (Date.now() - startedAt < hardTimeoutMs) {
        const text = await latestAssistantText(page);

        if (text !== lastText) {
          lastText = text;
          stableSince = Date.now();
        }

        const stopVisible = await hasStopControl(page);
        const sendReady = await isComposerReady(page);
        const textStable = text.length > 0 && Date.now() - stableSince >= stableMs;

        if (!stopVisible && sendReady && textStable) {
          return;
        }

        await page.waitForTimeout(500);
      }

      throw new Error('Timed out waiting for ChatGPT completion.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`ChatGPT waitForCompletion failed: ${message}`);
      throw error;
    }
  },

  async extractParticipantResponse(page: Page, context) {
    const response = await latestAssistantText(page);

    return {
      participant: this.name.toLowerCase(),
      question: context.question,
      answer: response.trim(),
      citations: [],
      elapsedSeconds: context.elapsedSeconds,
      rawText: response,
      cleanedText: response.trim(),
      rawHtml: await page.content().catch(() => undefined),
    };
  },

  async extractResponse(page: Page) {
    const response = await this.extractParticipantResponse?.(page, {
      question: '',
      elapsedSeconds: 0,
    });

    return response?.answer ?? '';
  },
};
