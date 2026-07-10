import type { ElementHandle, Page } from 'playwright';
import type { ParticipantDriver } from './base.js';
import { verifyPastedPrompt } from './pasteVerification.js';

const composerSelectors = [
  'textarea',
  '[contenteditable="true"]',
  '[role="textbox"]',
];

const responseSelectors = [
  '[model-response]',
  '[class*="model-response"]',
  '[class*="response-container"]',
  '[class*="markdown"]',
  '[class*="prose"]',
  'article',
];

const geminiChromeLinePattern = /^(share|feedback|copy|export|google apps|sign in|sources?|related|show all|more|listen|thumbs up|thumbs down|which response is more helpful\??|choice a|choice b|response a|response b|gemini|new chat|recent|activity|settings|help|notebook|notebooks|saved info|extensions|apps|menu)$/i;

type ComposerKind = 'textarea' | 'contenteditable' | 'role=textbox';

type ComposerMatch = {
  element: ElementHandle<Element>;
  selector: string;
  kind: ComposerKind;
};

function cleanGeminiText(text: string) {
  const seenLines = new Set<string>();

  return text
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !geminiChromeLinePattern.test(line))
    .filter((line) => !/^which response is more helpful/i.test(line))
    .filter((line) => !/^(choice|response)\s+[ab]\b/i.test(line))
    .filter((line) => !/(double-check response|modify response|view other drafts|drafts?|google apps|gemini apps activity|notebooklm|saved info)/i.test(line))
    .filter((line) => !/^https?:\/\//i.test(line))
    .filter((line) => {
      const normalized = line.toLowerCase().replace(/\s+/g, ' ');

      if (seenLines.has(normalized)) {
        return false;
      }

      seenLines.add(normalized);
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

  throw new Error('Could not find Gemini composer.');
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
  await verifyPastedPrompt(page, 'Gemini', prompt, text);
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

async function latestResponseText(page: Page) {
  return page.evaluate<string>(`(() => {
    const selectors = ${JSON.stringify(responseSelectors)};
    function visible(el) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    }

    function readableText(el) {
      const clone = el.cloneNode(true);
      clone
        .querySelectorAll([
          'button',
          '[role="button"]',
          'nav',
          'footer',
          'header',
          'aside',
          'script',
          'style',
          'svg',
          'img',
          '[aria-hidden="true"]',
          '[hidden]',
          '[class*="source" i]',
          '[class*="citation" i]',
          '[class*="related" i]',
          '[class*="share" i]',
          '[class*="feedback" i]',
          '[class*="choice" i]',
          '[class*="rating" i]',
          '[class*="notebook" i]',
          '[class*="header" i]',
          '[class*="menu" i]',
          '[aria-label*="Share" i]',
          '[aria-label*="Feedback" i]'
        ].join(','))
        .forEach((child) => child.remove());

      return String(clone.textContent || '').trim();
    }

    const candidates = selectors
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .filter((el) => {
        const text = String(el.textContent || '').trim();
        return visible(el) &&
          !el.closest('nav, footer, header, aside, button, [role="button"]') &&
          text.length > 0;
      })
      .map((el) => ({
        bottom: el.getBoundingClientRect().bottom,
        text: readableText(el),
      }))
      .filter((candidate) => candidate.text.length > 0)
      .sort((a, b) => b.bottom - a.bottom);

    return candidates[0]?.text || '';
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

    const candidates = [
      ...Array.from(document.querySelectorAll('button[data-testid*="send" i]')),
      ...Array.from(document.querySelectorAll('button[aria-label*="Send"]')),
      ...Array.from(document.querySelectorAll('button[aria-label*="send"]')),
      ...Array.from(document.querySelectorAll('button:has(svg)')),
      ...Array.from(document.querySelectorAll('button'))
    ]
      .filter((button, index, all) => all.indexOf(button) === index)
      .filter((button) => visible(button) && enabled(button))
      .filter((button) => {
        const text = buttonText(button);
        return text.includes('send') || text.includes('submit') || text.includes('send-button') || button.querySelector('svg');
      });

    const button = candidates[0];

    if (!button) return false;
    button.click();
    return true;
  })()`);
}

export const geminiDriver: ParticipantDriver = {
  name: 'Gemini',

  matchParticipant(participant) {
    return participant.id === 'gemini' || participant.url.includes('gemini.google.com');
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
    console.log('Submit strategy:\n✓ Keyboard Enter');
  },

  async waitForCompletion(page: Page) {
    try {
      const startedAt = Date.now();
      const hardTimeoutMs = 180000;
      const stableMs = 5000;
      let lastText = await latestResponseText(page);
      let stableSince = Date.now();

      while (Date.now() - startedAt < hardTimeoutMs) {
        const text = await latestResponseText(page);

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

      throw new Error('Timed out waiting for Gemini completion.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Gemini waitForCompletion failed: ${message}`);
      throw error;
    }
  },

  async extractResponse(page: Page) {
    const response = await latestResponseText(page);
    return cleanGeminiText(response);
  },

  async extractParticipantResponse(page: Page, context) {
    const rawText = await latestResponseText(page);
    const cleanedText = cleanGeminiText(rawText);

    return {
      participant: this.name.toLowerCase(),
      question: context.question,
      answer: cleanedText,
      citations: [],
      elapsedSeconds: context.elapsedSeconds,
      rawText,
      cleanedText,
      rawHtml: await page.content().catch(() => undefined),
    };
  },
};
