import type { ElementHandle, Page } from 'playwright';
import type { ParticipantResponse } from '../types.js';
import type { ParticipantDriver } from './base.js';
import { verifyPastedPrompt } from './pasteVerification.js';

const composerSelectors = [
  'textarea',
  '[contenteditable="true"]',
  '[contenteditable]',
  '[role="textbox"]',
  '[aria-label*="message" i]',
  '[aria-label*="prompt" i]',
  '[aria-label*="ask" i]',
  '[placeholder*="message" i]',
  '[placeholder*="ask" i]',
  '[data-testid*="composer" i] textarea',
  '[data-testid*="input" i] textarea',
];

type ComposerKind = 'textarea' | 'contenteditable' | 'role=textbox';

type ComposerMatch = {
  element: ElementHandle<Element>;
  selector: string;
  kind: ComposerKind;
};

type GenericDriverOptions = {
  participantId: string;
  name: string;
  hostPattern: string;
  answerSelectors?: string[];
  chromeLinePattern?: RegExp;
  minimumAnswerLength?: number;
  submitPrompt?: (
    page: Page,
    helpers: {
      findComposer: () => Promise<ComposerMatch>;
      composerText: () => Promise<string>;
      hasStopControl: () => Promise<boolean>;
    },
  ) => Promise<void>;
};

function cleanText(text: string, chromeLinePattern?: RegExp) {
  const seenLines = new Set<string>();
  const uiPattern = chromeLinePattern ??
    /^(share|copy|feedback|regenerate|retry|sources?|related|sign in|sign up|new chat|settings|show all|more|upgrade|try pro)$/i;

  return text
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !uiPattern.test(line))
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

async function findComposer(page: Page, participantName: string): Promise<ComposerMatch> {
  for (const selector of composerSelectors) {
    const candidates = await page.$$(selector);

    for (const candidate of candidates) {
      if (await candidate.isVisible().catch(() => false)) {
        const kind = selector.includes('textarea')
          ? 'textarea'
          : selector.includes('contenteditable')
            ? 'contenteditable'
            : 'role=textbox';

        return { element: candidate, selector, kind };
      }
    }
  }

  throw new Error(`Could not find ${participantName} composer.`);
}

async function composerText(page: Page) {
  return page.evaluate<string>(`(() => {
    const selector = 'textarea, [contenteditable="true"], [contenteditable], [role="textbox"]';
    const active = document.activeElement;

    if (active && active.matches(selector)) {
      if ('value' in active) return String(active.value || '');
      return String(active.innerText || active.textContent || '');
    }

    const composer = Array.from(document.querySelectorAll(selector))
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

async function verifyComposerContainsPrompt(page: Page, participantName: string, prompt: string) {
  await page.waitForTimeout(500);
  await verifyPastedPrompt(page, participantName, prompt, await composerText(page));
}

async function hasStopControl(page: Page) {
  return page.evaluate<boolean>(`(() => {
    return Array.from(document.querySelectorAll('button, [role="button"], [aria-label], [title], [data-testid]'))
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
        return text.includes('stop');
      });
  })()`);
}

async function isComposerReady(page: Page) {
  return page.evaluate<boolean>(`(() => {
    const composerReady = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]'))
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      })
      .some((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true');

    const sendReady = Array.from(document.querySelectorAll('button, [role="button"], [aria-label], [title], [data-testid]'))
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
        return enabled && (text.includes('send') || text.includes('submit') || text.includes('arrow'));
      });

    return composerReady || sendReady;
  })()`);
}

async function latestAnswerText(page: Page, answerSelectors: string[], minimumAnswerLength: number) {
  return page.evaluate<string>(`(() => {
    const selectors = ${JSON.stringify(answerSelectors)};
    const minimumAnswerLength = ${JSON.stringify(minimumAnswerLength)};

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
          '[class*="menu" i]'
        ].join(','))
        .forEach((child) => child.remove());

      return String(clone.textContent || '').trim();
    }

    const candidates = selectors
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .filter((el) => visible(el) && !el.closest('nav, footer, header, aside, button, [role="button"]'))
      .map((el) => ({
        bottom: el.getBoundingClientRect().bottom,
        text: readableText(el),
      }))
      .filter((candidate) => candidate.text.length >= minimumAnswerLength)
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

    function textFor(el) {
      return [
        el.textContent,
        el.getAttribute('aria-label'),
        el.getAttribute('title'),
        el.getAttribute('data-testid')
      ].filter(Boolean).join(' ').toLowerCase();
    }

    const candidates = Array.from(document.querySelectorAll('button, [role="button"]'))
      .filter((button, index, all) => all.indexOf(button) === index)
      .filter((button) => visible(button) && enabled(button))
      .filter((button) => {
        const text = textFor(button);
        return text.includes('send') || text.includes('submit') || button.querySelector('svg');
      });

    const button = candidates[0];
    if (!button) return false;
    button.click();
    return true;
  })()`);
}

export function createGenericAiDriver(options: GenericDriverOptions): ParticipantDriver {
  const answerSelectors = options.answerSelectors ?? [
    '[class*="message"]',
    '[class*="assistant"]',
    '[class*="markdown"]',
    '[class*="prose"]',
    'article',
    'main',
  ];
  const minimumAnswerLength = options.minimumAnswerLength ?? 40;

  async function extractNormalized(page: Page, question: string, elapsedSeconds: number): Promise<ParticipantResponse> {
    const rawText = await latestAnswerText(page, answerSelectors, minimumAnswerLength);
    const cleanedText = cleanText(rawText, options.chromeLinePattern);

    return {
      participant: options.participantId,
      question,
      answer: cleanedText,
      citations: [],
      elapsedSeconds,
      rawText,
      cleanedText,
      rawHtml: await page.content().catch(() => undefined),
    };
  }

  return {
    name: options.name,

    matchParticipant(participant) {
      return participant.id === options.participantId || participant.url.includes(options.hostPattern);
    },

    async waitForReady(page: Page) {
      await page.waitForLoadState('domcontentloaded');
      await findComposer(page, options.name);
    },

    async pastePrompt(page: Page, prompt: string) {
      await this.waitForReady(page);
      const composer = await findComposer(page, options.name);
      console.log(`Composer found: ${composer.selector}`);
      console.log(`Composer strategy: ${composer.kind}`);
      console.log(`Prompt length: ${prompt.length}`);

      if (composer.kind === 'textarea') {
        await composer.element.fill(prompt);
        await verifyComposerContainsPrompt(page, options.name, prompt);
        console.log('Prompt pasted');
        return;
      }

      await composer.element.click();
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
      await page.keyboard.press('Backspace');
      await page.keyboard.insertText(prompt);

      try {
        await verifyComposerContainsPrompt(page, options.name, prompt);
        console.log('Prompt pasted');
        return;
      } catch {
        await page.evaluate(async (text) => {
          await navigator.clipboard.writeText(text);
        }, prompt).catch(() => undefined);
        await composer.element.click();
        await page.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');
        await verifyComposerContainsPrompt(page, options.name, prompt);
        console.log('Prompt pasted');
      }
    },

    async submitPrompt(page: Page) {
      if (options.submitPrompt) {
        await options.submitPrompt(page, {
          findComposer: () => findComposer(page, options.name),
          composerText: () => composerText(page),
          hasStopControl: () => hasStopControl(page),
        });
        return;
      }

      if (await clickEnabledSendButton(page)) {
        console.log('Submit strategy: clicked enabled send button');
        return;
      }

      const composer = await findComposer(page, options.name);
      await composer.element.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      console.log('Submit strategy: keyboard Enter');
    },

    async waitForCompletion(page: Page) {
      const startedAt = Date.now();
      const hardTimeoutMs = 180000;
      const stableMs = 5000;
      let lastText = await latestAnswerText(page, answerSelectors, minimumAnswerLength);
      let stableSince = Date.now();

      while (Date.now() - startedAt < hardTimeoutMs) {
        const text = await latestAnswerText(page, answerSelectors, minimumAnswerLength);

        if (text !== lastText) {
          lastText = text;
          stableSince = Date.now();
        }

        const stopVisible = await hasStopControl(page);
        const textStable = cleanText(text, options.chromeLinePattern).length > 0 &&
          Date.now() - stableSince >= stableMs;

        if (!stopVisible && textStable) {
          return;
        }

        await page.waitForTimeout(500);
      }

      throw new Error(`Timed out waiting for ${options.name} completion.`);
    },

    async extractResponse(page: Page) {
      const response = await extractNormalized(page, '', 0);
      return response.answer;
    },

    async extractParticipantResponse(page: Page, context) {
      return extractNormalized(page, context.question, context.elapsedSeconds);
    },

    async extractNormalizedResponse(page: Page, context) {
      return extractNormalized(page, context.question, context.elapsedSeconds);
    },
  };
}
