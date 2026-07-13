import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ElementHandle, Page } from 'playwright';
import type { ParticipantResponse } from '../types.js';
import type { ParticipantDriver } from './base.js';
import { verifyPastedPrompt } from './pasteVerification.js';
import {
  cleanPerplexityResponseText,
  perplexityPromptNeedle,
  selectPerplexityResponseCandidate,
  type PerplexityCandidate,
} from './perplexityFiltering.js';

const composerSelectors = [
  'textarea',
  '[contenteditable="true"]',
  '[role="textbox"]',
];

// Stable semantic answer containers observed in the live Perplexity DOM.
// These always beat transcript-level parents during candidate selection.
const semanticAnswerSelectors = [
  '[id^="markdown-content-"]',
  '[data-testid*="answer"]',
  '[class*="prose"]',
  '[class*="markdown"]',
];

// Broad fallback containers, used only when no semantic answer node exists.
const legacyContainerSelectors = [
  'main',
  'article',
  '[data-testid*="thread"]',
  '[data-testid*="message"]',
  '[class*="answer"]',
  '[class*="response"]',
];

const pendingPerplexityPrompts = new WeakMap<Page, string>();

type ComposerKind = 'textarea' | 'contenteditable' | 'role=textbox';

type ComposerMatch = {
  element: ElementHandle<Element>;
  selector: string;
  kind: ComposerKind;
};

async function savePerplexitySubmitDebug(page: Page) {
  const debugDir = path.join(process.cwd(), 'debug');
  await mkdir(debugDir, { recursive: true });

  const htmlPath = path.join(debugDir, 'perplexity-submit-blocked.html');
  const screenshotPath = path.join(debugDir, 'perplexity-submit-blocked.png');

  await writeFile(htmlPath, await page.content().catch(() => ''), 'utf8');
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);

  return { htmlPath, screenshotPath };
}

async function savePerplexitySubmitFailedDebug(page: Page) {
  const debugDir = path.join(process.cwd(), 'debug');
  await mkdir(debugDir, { recursive: true });

  const htmlPath = path.join(debugDir, 'perplexity-submit-failed.html');
  const screenshotPath = path.join(debugDir, 'perplexity-submit-failed.png');

  await writeFile(htmlPath, await page.content().catch(() => ''), 'utf8');
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);

  return { htmlPath, screenshotPath };
}

async function savePerplexityResponseNotFoundDebug(page: Page) {
  const debugDir = path.join(process.cwd(), 'debug');
  await mkdir(debugDir, { recursive: true });

  const htmlPath = path.join(debugDir, 'perplexity-response-not-found.html');
  const screenshotPath = path.join(debugDir, 'perplexity-response-not-found.png');

  await writeFile(htmlPath, await page.content().catch(() => ''), 'utf8');
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);

  return { htmlPath, screenshotPath };
}

async function savePerplexityLiveDebug(page: Page) {
  const debugDir = path.join(process.cwd(), 'debug');
  await mkdir(debugDir, { recursive: true });

  const htmlPath = path.join(debugDir, 'perplexity-live-debug.html');
  const screenshotPath = path.join(debugDir, 'perplexity-live-debug.png');

  await writeFile(htmlPath, await page.content().catch(() => ''), 'utf8');
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);

  return { htmlPath, screenshotPath };
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

        return { element: candidate, selector, kind };
      }
    }
  }

  throw new Error('Could not find Perplexity composer.');
}

async function overlayIsPresent(page: Page) {
  return page.evaluate<boolean>(`(() => {
    function visible(el) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    }

    const textPattern = /maybe later|not now|continue for free|skip|close|upgrade|pro|enterprise/i;
    const candidates = Array.from(document.querySelectorAll('[data-tier], [role="dialog"], [aria-modal="true"], .modal, [class*="modal" i], [class*="overlay" i], [class*="fixed" i]'))
      .filter(visible);

    return candidates.some((el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const text = String(el.textContent || '');
      const fixedOverlay = style.position === 'fixed' &&
        rect.width >= window.innerWidth * 0.6 &&
        rect.height >= window.innerHeight * 0.4;
      return fixedOverlay || textPattern.test(text) || el.hasAttribute('data-tier');
    });
  })()`).catch(() => false);
}

async function dismissOverlayIfPresent(page: Page) {
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.waitForTimeout(200);

  const dismissTexts = [
    'Maybe later',
    'Not now',
    'Continue for free',
    'Skip',
    'Close',
    '×',
  ];

  for (const text of dismissTexts) {
    const button = page
      .locator('button, [role="button"], [aria-label], [title]')
      .filter({ hasText: new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') })
      .first();

    if (await button.isVisible({ timeout: 500 }).catch(() => false)) {
      await button.click({ timeout: 1000 }).catch(() => undefined);
      await page.waitForTimeout(300);

      if (!await overlayIsPresent(page)) {
        return;
      }
    }
  }

  await page.evaluate<boolean>(`(() => {
    function visible(el) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    }

    const dismissPattern = /maybe later|not now|continue for free|skip|close|×/i;
    const button = Array.from(document.querySelectorAll('button, [role="button"], [aria-label], [title]'))
      .filter(visible)
      .find((el) => {
        const text = [
          el.textContent,
          el.getAttribute('aria-label'),
          el.getAttribute('title')
        ].filter(Boolean).join(' ');
        return dismissPattern.test(text);
      });

    if (!button) return false;
    button.click();
    return true;
  })()`).catch(() => false);
  await page.waitForTimeout(300);
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

async function userMessageDetected(page: Page, prompt: string) {
  return page.evaluate<boolean>(`(() => {
    const promptNeedle = ${JSON.stringify(perplexityPromptNeedle(prompt))};

    if (!promptNeedle) return false;

    function visible(el) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    }

    return Array.from(document.querySelectorAll([
      '[data-testid*="message" i]',
      '[data-testid*="query" i]',
      '[class*="message" i]',
      '[class*="query" i]',
      '[class*="question" i]',
      'article',
      'main'
    ].join(',')))
      .filter(visible)
      .some((el) => String(el.textContent || '').replace(/\\s+/g, ' ').toLowerCase().includes(promptNeedle));
  })()`).catch(() => false);
}

async function submitAccepted(page: Page, prompt: string, initialComposerLength: number) {
  const currentComposerText = await composerText(page);
  const composerCleared = currentComposerText.trim().length < Math.max(3, initialComposerLength * 0.25);
  const messageDetected = await userMessageDetected(page, prompt);

  console.log(`Perplexity composer cleared: ${composerCleared ? 'yes' : 'no'}`);
  console.log(`Perplexity user message detected: ${messageDetected ? 'yes' : 'no'}`);

  return composerCleared || messageDetected;
}

async function verifyComposerContainsPrompt(page: Page, prompt: string) {
  await page.waitForTimeout(500);
  await verifyPastedPrompt(page, 'Perplexity', prompt, await composerText(page));
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

type PerplexityAnswerDiagnostics = {
  candidateCount: number;
  topTextLengths: number[];
  selectedText: string;
  selectedLength: number;
  selectedPreview: string;
  rejectedSummaries: string[];
};

async function collectAnswerCandidates(page: Page): Promise<PerplexityCandidate[]> {
  return page.evaluate<PerplexityCandidate[]>(`(() => {
    const semanticSelectors = ${JSON.stringify(semanticAnswerSelectors)};
    const legacySelectors = ${JSON.stringify(legacyContainerSelectors)};

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
          '[class*="menu" i]',
          '[class*="composer" i]',
          '[class*="input" i]',
          'textarea',
          '[contenteditable="true"]',
          '[role="textbox"]'
        ].join(','))
        .forEach((child) => child.remove());

      return String(clone.textContent || '').trim();
    }

    const seen = new Set();
    const candidates = [];

    function collect(selectors, tier) {
      for (const selector of selectors) {
        for (const el of Array.from(document.querySelectorAll(selector))) {
          if (seen.has(el)) continue;
          seen.add(el);
          if (!visible(el)) continue;
          if (el.closest('nav, footer, header, aside, button, [role="button"], textarea, [contenteditable], [role="textbox"]')) continue;

          const text = readableText(el).replace(/\\r/g, '\\n').replace(/[ \\t]+/g, ' ').trim();

          candidates.push({
            text,
            tier,
            insideQueryContainer: Boolean(el.closest('[class*="group/query"], [role="heading"]')),
            bottom: el.getBoundingClientRect().bottom,
          });
        }
      }
    }

    collect(semanticSelectors, 'semantic-answer');
    collect(legacySelectors, 'legacy-container');
    return candidates;
  })()`);
}

async function answerDiagnostics(page: Page, prompt = ''): Promise<PerplexityAnswerDiagnostics> {
  const candidates = await collectAnswerCandidates(page);
  const selection = selectPerplexityResponseCandidate(candidates, prompt);
  const selectedText = selection.selected?.text ?? '';
  const acceptedLengths = candidates
    .filter((candidate) => !selection.rejected.some((entry) => entry.candidate === candidate))
    .map((candidate) => candidate.text.length)
    .sort((a, b) => b - a);

  return {
    candidateCount: candidates.length,
    topTextLengths: acceptedLengths.slice(0, 3),
    selectedText,
    selectedLength: selectedText.length,
    selectedPreview: selectedText.slice(0, 120),
    rejectedSummaries: selection.rejected.slice(0, 5).map((entry) => (
      `${entry.reason} tier=${entry.candidate.tier} bottom=${Math.round(entry.candidate.bottom)} ${entry.candidate.text.replace(/\s+/g, ' ').slice(0, 120)}`
    )),
  };
}

async function latestAnswerText(page: Page, prompt = '') {
  return (await answerDiagnostics(page, prompt)).selectedText;
}

async function clickComposerSendButton(page: Page) {
  return page.evaluate<{ clicked: boolean; label: string }>(`(() => {
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
        el.getAttribute('data-testid'),
        el.getAttribute('class')
      ].filter(Boolean).join(' ').replace(/\\s+/g, ' ').trim();
    }

    const composer = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]'))
      .find((el) => visible(el));

    if (!composer) return { clicked: false, label: 'composer-not-found' };

    const composerRect = composer.getBoundingClientRect();
    const explicitButtons = [
      ...Array.from(document.querySelectorAll('button[aria-label*="Submit" i]')),
      ...Array.from(document.querySelectorAll('button[aria-label*="Send" i]')),
      ...Array.from(document.querySelectorAll('button[data-testid*="submit" i]')),
      ...Array.from(document.querySelectorAll('button[data-testid*="send" i]'))
    ];
    const nearbyButtons = Array.from(document.querySelectorAll('button, [role="button"]'))
      .filter((button) => {
        const rect = button.getBoundingClientRect();
        const horizontallyNear = rect.left <= composerRect.right + 240 && rect.right >= composerRect.left - 80;
        const verticallyNear = rect.top <= composerRect.bottom + 140 && rect.bottom >= composerRect.top - 80;
        const sameContainer = Boolean(button.closest('form')) && button.closest('form') === composer.closest('form');
        return horizontallyNear && verticallyNear || sameContainer;
      })
      .filter((button) => {
        const text = textFor(button).toLowerCase();
        return text.includes('send') ||
          text.includes('submit') ||
          button.querySelector('svg');
      });

    const candidates = [...explicitButtons, ...nearbyButtons]
      .filter((button, index, all) => all.indexOf(button) === index)
      .filter((button) => visible(button) && enabled(button))
      .filter((button) => {
        const rect = button.getBoundingClientRect();
        const text = textFor(button).toLowerCase();
        const nearComposer = rect.left <= composerRect.right + 240 &&
          rect.right >= composerRect.left - 80 &&
          rect.top <= composerRect.bottom + 140 &&
          rect.bottom >= composerRect.top - 80;
        const explicit = text.includes('send') || text.includes('submit');
        return nearComposer && (explicit || button.querySelector('svg'));
      });

    const button = candidates[0];
    if (!button) return { clicked: false, label: 'no-candidate' };
    const label = textFor(button) || button.outerHTML.slice(0, 180);
    button.click();
    return { clicked: true, label };
  })()`);
}

async function extractNormalized(page: Page, question: string, elapsedSeconds: number): Promise<ParticipantResponse> {
  const rawText = await latestAnswerText(page, question || pendingPerplexityPrompts.get(page) || '');
  const cleanedText = cleanPerplexityResponseText(rawText);

  return {
    participant: 'perplexity',
    question,
    answer: cleanedText,
    citations: [],
    elapsedSeconds,
    rawText,
    cleanedText,
    rawHtml: await page.content().catch(() => undefined),
  };
}

export const perplexityDriver: ParticipantDriver = {
  name: 'Perplexity',

  matchParticipant(participant) {
    return participant.id === 'perplexity' || participant.url.includes('perplexity.ai');
  },

  async waitForReady(page: Page) {
    await page.waitForLoadState('domcontentloaded');
    await findComposer(page);
  },

  async pastePrompt(page: Page, prompt: string) {
    await this.waitForReady(page);
    await dismissOverlayIfPresent(page);
    const composer = await findComposer(page);
    console.log(`Composer found: ${composer.selector}`);
    console.log(`Composer strategy: ${composer.kind}`);
    console.log(`Prompt length: ${prompt.length}`);

    if (composer.kind === 'textarea') {
      await composer.element.fill(prompt);
      await verifyComposerContainsPrompt(page, prompt);
      pendingPerplexityPrompts.set(page, prompt);
      console.log('Prompt pasted');
      return;
    }

    await composer.element.click();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.insertText(prompt);

    try {
      await verifyComposerContainsPrompt(page, prompt);
      pendingPerplexityPrompts.set(page, prompt);
      console.log('Prompt pasted');
      return;
    } catch {
      await page.evaluate(async (text) => {
        await navigator.clipboard.writeText(text);
      }, prompt).catch(() => undefined);
      await composer.element.click();
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');
      await verifyComposerContainsPrompt(page, prompt);
      pendingPerplexityPrompts.set(page, prompt);
      console.log('Prompt pasted');
    }
  },

  async submitPrompt(page: Page) {
    await dismissOverlayIfPresent(page);
    const composer = await findComposer(page);
    const initialComposerText = await composerText(page);
    const initialComposerLength = initialComposerText.trim().length;
    const overlayPresent = await overlayIsPresent(page);

    if (!overlayPresent) {
      const clicked = await clickComposerSendButton(page);

      if (clicked.clicked) {
        console.log(`Perplexity submit candidate: ${clicked.label}`);
        await page.waitForTimeout(2000);

        if (await submitAccepted(page, initialComposerText, initialComposerLength)) {
          console.log('Submit strategy: clicked composer send button');
          return;
        }

        console.log('Perplexity click submit did not appear to be accepted; falling back to keyboard Enter');
      } else {
        console.log(`Perplexity submit candidate: ${clicked.label}`);
      }
    } else {
      const artifacts = await savePerplexitySubmitDebug(page);
      console.log(`Perplexity overlay still present; using keyboard Enter. Debug HTML: ${artifacts.htmlPath}`);
      console.log(`Perplexity overlay screenshot: ${artifacts.screenshotPath}`);
    }

    await composer.element.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);

    if (await submitAccepted(page, initialComposerText, initialComposerLength)) {
      console.log('Submit strategy: keyboard Enter');
      return;
    }

    if (!await overlayIsPresent(page)) {
      const artifacts = await savePerplexitySubmitFailedDebug(page);
      throw new Error([
        'Perplexity submit failed: prompt was not accepted',
        `Debug HTML: ${artifacts.htmlPath}`,
        `Debug screenshot: ${artifacts.screenshotPath}`,
      ].join('\n'));
    }

    const artifacts = await savePerplexitySubmitDebug(page);
    throw new Error([
      'Perplexity submit blocked by overlay.',
      `Debug HTML: ${artifacts.htmlPath}`,
      `Debug screenshot: ${artifacts.screenshotPath}`,
    ].join('\n'));
  },

  async waitForCompletion(page: Page) {
    console.log('Perplexity response detector version: v3');
    const startedAt = Date.now();
    const hardTimeoutMs = 180000;
    const stableMs = 5000;
    const prompt = pendingPerplexityPrompts.get(page) ?? '';
    let lastText = await latestAnswerText(page, prompt);
    let stableSince = Date.now();
    let lastProgressLogAt = 0;
    let responseNotFoundSaved = false;
    let liveDebugSaved = false;

    while (Date.now() - startedAt < hardTimeoutMs) {
      const diagnostics = await answerDiagnostics(page, prompt);
      const text = diagnostics.selectedText;

      if (text !== lastText) {
        lastText = text;
        stableSince = Date.now();
      }

      const stopVisible = await hasStopControl(page);
      const currentStableMs = Date.now() - stableSince;
      const cleanedLength = cleanPerplexityResponseText(text).length;
      const textStable = cleanedLength > 0 && currentStableMs >= stableMs;

      if (Date.now() - lastProgressLogAt >= 5000) {
        console.log([
          `Perplexity wait v3: responseLength=${cleanedLength}`,
          `stableMs=${currentStableMs}`,
          `stopVisible=${stopVisible}`,
          `candidateCount=${diagnostics.candidateCount}`,
          `top3=${diagnostics.topTextLengths.join(',') || '(none)'}`,
          `selectedLength=${diagnostics.selectedLength}`,
          `preview=${diagnostics.selectedPreview || '(none)'}`,
        ].join(' '));

        for (const summary of diagnostics.rejectedSummaries) {
          console.log(`Perplexity rejected candidate reason: ${summary}`);
        }

        lastProgressLogAt = Date.now();
      }

      if (!stopVisible && cleanedLength === 0 && Date.now() - startedAt > 10000 && !liveDebugSaved) {
        const artifacts = await savePerplexityLiveDebug(page);
        console.log(`Perplexity live debug HTML: ${artifacts.htmlPath}`);
        console.log(`Perplexity live debug screenshot: ${artifacts.screenshotPath}`);
        liveDebugSaved = true;
      }

      if (!stopVisible && cleanedLength === 0 && !responseNotFoundSaved) {
        const artifacts = await savePerplexityResponseNotFoundDebug(page);
        console.log(`Perplexity response not found. Debug HTML: ${artifacts.htmlPath}`);
        console.log(`Perplexity response not found screenshot: ${artifacts.screenshotPath}`);
        responseNotFoundSaved = true;
      }

      if (!stopVisible && textStable) {
        return;
      }

      await page.waitForTimeout(500);
    }

    throw new Error('Timed out waiting for Perplexity completion.');
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
