import type { ElementHandle, Page } from 'playwright';
import type { ParticipantDriver } from './base.js';
import {
  chatGptCandidateRejectionReason,
  chatGptSubmissionEvidenceReasons,
  cleanChatGptResponseText,
  type ChatGptCandidateGeometry,
} from './chatgptFiltering.js';
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

type ChatGptResponseCandidate = ChatGptCandidateGeometry & {
  selector: string;
  cleanedText: string;
  bottom: number;
};

type ChatGptSubmissionEvidence = {
  accepted: boolean;
  reasons: string[];
};

const submittedPrompts = new WeakMap<Page, string>();

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

export const chatGptComposerTextScript = `(() => {
  const composer = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]'))
    .find((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });

  if (!composer) return '';
  if ('value' in composer) return String(composer.value || '');
  return String(composer.innerText || composer.textContent || '');
})()`;

async function composerText(page: Page) {
  return page.evaluate<string>(chatGptComposerTextScript);
}

async function verifyComposerContainsPrompt(page: Page, prompt: string) {
  await page.waitForTimeout(500);
  const text = await composerText(page);
  await verifyPastedPrompt(page, 'ChatGPT', prompt, text);
}

export const chatGptStopControlScript = `(() => {
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
})()`;

async function hasStopControl(page: Page) {
  return page.evaluate<boolean>(chatGptStopControlScript);
}

export const chatGptComposerReadyScript = `(() => {
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
  })()`;

async function isComposerReady(page: Page) {
  return page.evaluate<boolean>(chatGptComposerReadyScript);
}

export function buildChatGptAssistantCandidatesScript() {
  const script = `(() => {
    const selectors = ${JSON.stringify(assistantSelectors)};

    return selectors
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)).map((element) => ({ element, selector })))
      .filter(({ element }) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      })
      .map(({ element, selector }) => {
        const rect = element.getBoundingClientRect();

        return {
          selector,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
          text: String(element.textContent || '').trim(),
        };
      })
      .filter((candidate) => candidate.text.length > 0)
      .sort((a, b) => b.bottom - a.bottom);
  })()`;

  if (script.includes('__name')) {
    throw new Error('ChatGPT assistant-candidate script unexpectedly contains __name');
  }

  return script;
}

async function getAssistantCandidates(page: Page, promptNeedle = '') {
  const rawCandidates = await page.evaluate<Array<Omit<ChatGptResponseCandidate, 'cleanedText'>>>(
    buildChatGptAssistantCandidatesScript(),
  );

  return rawCandidates
    .map((candidate) => ({
      ...candidate,
      cleanedText: cleanChatGptResponseText(candidate.text),
    }))
    .filter((candidate, _index, candidates) => (
      chatGptCandidateRejectionReason(candidate, promptNeedle, candidates) === ''
    ));
}

async function latestAssistantText(
  page: Page,
  promptNeedle = '',
  options: { logSelected?: boolean } = {},
) {
  const candidates = await getAssistantCandidates(page, promptNeedle);
  const selected = candidates[0];

  if (!selected) {
    return '';
  }

  if (options.logSelected) {
    console.log(
      `ChatGPT selected response candidate: length=${selected.cleanedText.length} ` +
      `geometry=x=${Math.round(selected.x)} y=${Math.round(selected.y)} ` +
      `width=${Math.round(selected.width)} height=${Math.round(selected.height)} ` +
      `selector=${selected.selector} preview=${JSON.stringify(selected.cleanedText.slice(0, 120))}`,
    );
  }

  return selected.cleanedText;
}

export function buildChatGptPromptVisibleScript(prompt: string) {
  const script = `(() => {
    const promptNeedle = ${JSON.stringify(prompt)}.replace(/\\s+/g, ' ').trim().toLowerCase();

    if (!promptNeedle) {
      return false;
    }

    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    };

    const readableText = (el) => {
      const clone = el.cloneNode(true);
      clone
        .querySelectorAll('button, [role="button"], nav, footer, header, aside, script, style, svg, img')
        .forEach((child) => child.remove());
      return String(clone.textContent || '').replace(/\\s+/g, ' ').trim().toLowerCase();
    };

    const selectors = [
      '[data-message-author-role="user"]',
      '[data-testid*="conversation-turn"][data-testid*="user"]',
      '[class*="user" i]',
      'article'
    ];

    return selectors
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .filter((el, index, all) => all.indexOf(el) === index)
      .filter(visible)
      .some((el) => {
        const text = readableText(el);
        return text === promptNeedle ||
          (text.includes(promptNeedle) && text.length <= promptNeedle.length + 200);
      });
  })()`;

  if (script.includes('__name')) {
    throw new Error('ChatGPT prompt-visible script unexpectedly contains __name');
  }

  return script;
}

async function promptVisibleAsUserMessage(page: Page, prompt: string) {
  if (!prompt.trim()) {
    return false;
  }

  return page.evaluate<boolean>(buildChatGptPromptVisibleScript(prompt)).catch(() => false);
}

async function submissionEvidence(
  page: Page,
  prompt: string,
  beforeAssistantText: string,
): Promise<ChatGptSubmissionEvidence> {
  const composerAfter = await composerText(page).catch(() => '');
  const currentAssistantText = await latestAssistantText(page, prompt).catch(() => '');
  const reasons = chatGptSubmissionEvidenceReasons({
    prompt,
    composerText: composerAfter,
    promptVisibleAsUserMessage: await promptVisibleAsUserMessage(page, prompt),
    stopVisible: await hasStopControl(page).catch(() => false),
    beforeAssistantText,
    currentAssistantText,
  });

  return {
    accepted: reasons.length > 0,
    reasons,
  };
}

async function waitForSubmissionEvidence(
  page: Page,
  prompt: string,
  beforeAssistantText: string,
  timeoutMs = 5000,
): Promise<ChatGptSubmissionEvidence> {
  const startedAt = Date.now();
  let lastEvidence: ChatGptSubmissionEvidence = { accepted: false, reasons: [] };

  while (Date.now() - startedAt < timeoutMs) {
    lastEvidence = await submissionEvidence(page, prompt, beforeAssistantText);

    if (lastEvidence.accepted) {
      return lastEvidence;
    }

    await page.waitForTimeout(250);
  }

  return lastEvidence;
}

function logSubmitEvidence(strategy: string, evidence: ChatGptSubmissionEvidence) {
  const details = evidence.reasons.length > 0 ? evidence.reasons.join(', ') : 'none';
  console.log(`ChatGPT submit evidence after ${strategy}: ${details}`);
}

export const chatGptClickSendButtonScript = `(() => {
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
  })()`;

async function clickEnabledSendButton(page: Page) {
  return page.evaluate<boolean>(chatGptClickSendButtonScript);
}

export const chatGptDispatchEnterScript = `(() => {
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
  })()`;

async function dispatchComposerEnter(page: Page) {
  return page.evaluate<boolean>(chatGptDispatchEnterScript);
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
      submittedPrompts.set(page, prompt);
      console.log('Prompt pasted');
      return;
    }

    await composer.element.click();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.insertText(prompt);

    try {
      await verifyComposerContainsPrompt(page, prompt);
      submittedPrompts.set(page, prompt);
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
      submittedPrompts.set(page, prompt);
      console.log('Prompt pasted');
    }
  },

  async submitPrompt(page: Page) {
    const prompt = submittedPrompts.get(page) || await composerText(page);
    const beforeAssistantText = await latestAssistantText(page, prompt).catch(() => '');

    if (await clickEnabledSendButton(page)) {
      const evidence = await waitForSubmissionEvidence(page, prompt, beforeAssistantText);
      logSubmitEvidence('clicked enabled send button', evidence);

      if (!evidence.accepted) {
        console.log('ChatGPT click submit was not verified; falling back to keyboard Enter');
      } else {
        console.log('Submit strategy:\n✓ Clicked enabled send button');
        return;
      }
    }

    const composer = await findComposer(page);
    await composer.element.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    const enterEvidence = await waitForSubmissionEvidence(page, prompt, beforeAssistantText);
    logSubmitEvidence('keyboard Enter', enterEvidence);

    if (enterEvidence.accepted) {
      console.log('Submit strategy: Keyboard Enter');
      return;
    }

    if (await hasStopControl(page)) {
      console.log('Submit strategy:\n✓ Keyboard Enter');
      return;
    }

    if (await dispatchComposerEnter(page)) {
      await page.waitForTimeout(500);
      const eventEvidence = await waitForSubmissionEvidence(page, prompt, beforeAssistantText);
      logSubmitEvidence('KeyboardEvent Enter', eventEvidence);

      if (!eventEvidence.accepted) {
        console.log('ChatGPT KeyboardEvent Enter was not verified.');
      } else {
        console.log('Submit strategy:\n✓ KeyboardEvent Enter');
        return;
      }
    }

    throw new Error('Unable to submit ChatGPT prompt.');
  },

  async waitForCompletion(page: Page) {
    try {
      const startedAt = Date.now();
      const hardTimeoutMs = 120000;
      const stableMs = 4000;
      const promptNeedle = submittedPrompts.get(page) ?? '';
      let lastText = await latestAssistantText(page, promptNeedle);
      let stableSince = Date.now();

      while (Date.now() - startedAt < hardTimeoutMs) {
        const text = await latestAssistantText(page, promptNeedle);

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
    const response = await latestAssistantText(page, context.question || submittedPrompts.get(page) || '', {
      logSelected: true,
    });

    return {
      participant: this.name.toLowerCase(),
      question: context.question,
      answer: response,
      citations: [],
      elapsedSeconds: context.elapsedSeconds,
      rawText: response,
      cleanedText: response,
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
