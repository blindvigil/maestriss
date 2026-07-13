import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ElementHandle, Page } from 'playwright';
import type { ParticipantResponse } from '../types.js';
import type { ParticipantDriver } from './base.js';
import { verifyPastedPrompt } from './pasteVerification.js';
import {
  isKnownRekaChrome,
  selectRekaResponseCandidate,
  type RekaResponseCandidate,
} from './rekaFiltering.js';
import {
  selectRekaSubmitTarget,
  type RekaSubmitButtonDescriptor,
} from './rekaSubmitTargets.js';

const composerSelectors = [
  'textarea',
  '[contenteditable="true"]',
  '[contenteditable]',
  '[role="textbox"]',
  'div.ProseMirror',
  '.ProseMirror',
  '[data-testid*="input" i]',
  '[data-testid*="composer" i]',
  'textarea[placeholder*="message" i]',
  'textarea[placeholder*="prompt" i]',
  'textarea[placeholder*="Ask" i]',
  'textarea[placeholder*="ask" i]',
  'textarea[placeholder*="chat" i]',
  '[placeholder*="message" i]',
  '[placeholder*="prompt" i]',
  '[placeholder*="Ask" i]',
  '[aria-label*="message" i]',
  '[aria-label*="prompt" i]',
  '[aria-label*="ask" i]',
  '[data-testid*="composer" i] textarea',
  '[data-testid*="input" i] textarea',
  '[class*="composer" i] textarea',
  '[class*="input" i] textarea',
];

// Stable semantic assistant-answer containers observed in the live Reka DOM
// (div.prose.prose-chat markdown renderer inside a justify-start row). These
// always beat transcript-level parents during candidate selection.
const semanticAnswerSelectors = [
  '[class*="prose"]',
  '[class*="markdown-renderer"]',
  '[class*="markdown"]',
  '[data-testid*="assistant" i]',
  '[data-role*="assistant" i]',
  '[data-message-author-role="assistant"]',
];

// Broad fallback containers, used only when no semantic answer node exists.
const legacyContainerSelectors = [
  '[data-testid*="message" i]',
  '[class*="assistant" i]',
  '[class*="response" i]',
  '[class*="message"]',
  'article',
  'main',
  'section',
  '[data-testid]',
  '[class]',
  'p',
  'li',
  'div',
];

const pendingRekaPrompts = new WeakMap<Page, string>();
const pendingRekaSubmittedAt = new WeakMap<Page, number>();

type ComposerKind = 'textarea' | 'contenteditable' | 'role=textbox';

type ComposerMatch = {
  element: ElementHandle<Element>;
  selector: string;
  kind: ComposerKind;
};

function logRekaEvaluateBlock(name: string) {
  console.log(`Reka evaluate block: ${name}`);
}

async function rekaEditableCount(page: Page) {
  logRekaEvaluateBlock('rekaEditableCount');
  return page.evaluate<number>(`(() => {
    return Array.from(document.querySelectorAll([
      'textarea',
      '[contenteditable="true"]',
      '[contenteditable]',
      '[role="textbox"]',
      'div.ProseMirror',
      '.ProseMirror',
      '[data-testid*="input" i]',
      '[data-testid*="composer" i]',
      '[placeholder*="message" i]',
      '[placeholder*="prompt" i]',
      '[placeholder*="Ask" i]'
    ].join(','))).filter((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden';
    }).length;
  })()`).catch(() => 0);
}

async function saveRekaComposerDebug(page: Page) {
  const debugDir = path.join(process.cwd(), 'debug');
  await mkdir(debugDir, { recursive: true });

  const htmlPath = path.join(debugDir, 'reka-composer-not-found.html');
  const screenshotPath = path.join(debugDir, 'reka-composer-not-found.png');

  await writeFile(htmlPath, await page.content().catch(() => ''), 'utf8');
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);

  return { htmlPath, screenshotPath };
}

async function saveRekaResponseNotFoundDebug(page: Page) {
  const debugDir = path.join(process.cwd(), 'debug');
  await mkdir(debugDir, { recursive: true });

  const htmlPath = path.join(debugDir, 'reka-response-not-found.html');
  const screenshotPath = path.join(debugDir, 'reka-response-not-found.png');

  await writeFile(htmlPath, await page.content().catch(() => ''), 'utf8');
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);

  return { htmlPath, screenshotPath };
}

async function saveRekaLiveDebug(page: Page) {
  const debugDir = path.join(process.cwd(), 'debug');
  await mkdir(debugDir, { recursive: true });

  const htmlPath = path.join(debugDir, 'reka-live-debug.html');
  const screenshotPath = path.join(debugDir, 'reka-live-debug.png');

  await writeFile(htmlPath, await page.content().catch(() => ''), 'utf8');
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);

  return { htmlPath, screenshotPath };
}

async function saveRekaSubmitFailedDebug(page: Page) {
  const debugDir = path.join(process.cwd(), 'debug');
  await mkdir(debugDir, { recursive: true });

  const htmlPath = path.join(debugDir, 'reka-submit-failed.html');
  const screenshotPath = path.join(debugDir, 'reka-submit-failed.png');

  await writeFile(htmlPath, await page.content().catch(() => ''), 'utf8');
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);

  return { htmlPath, screenshotPath };
}

async function saveRekaClickDebug(page: Page, attempt: number) {
  const debugDir = path.join(process.cwd(), 'debug');
  await mkdir(debugDir, { recursive: true });

  const screenshotPath = path.join(debugDir, `reka-click-${attempt}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
  return screenshotPath;
}

async function saveRekaAfterCoordinateClickDebug(page: Page) {
  const debugDir = path.join(process.cwd(), 'debug');
  await mkdir(debugDir, { recursive: true });

  const screenshotPath = path.join(debugDir, 'reka-after-coordinate-click.png');
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
  return screenshotPath;
}

async function createRekaComposerError(page: Page) {
  const [title, candidateEditableCount, artifacts] = await Promise.all([
    page.title().catch(() => ''),
    rekaEditableCount(page),
    saveRekaComposerDebug(page),
  ]);

  return new Error([
    'Could not find Reka composer.',
    `Current URL: ${page.url()}`,
    `Title: ${title || '(untitled)'}`,
    `Candidate editable count: ${candidateEditableCount}`,
    `Debug HTML: ${artifacts.htmlPath}`,
    `Debug screenshot: ${artifacts.screenshotPath}`,
  ].join('\n'));
}

function cleanRekaText(text: string) {
  const seenLines = new Set<string>();

  return text
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isKnownRekaChrome(line))
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
        const kind = selector.includes('textarea')
          ? 'textarea'
          : selector.includes('contenteditable') || selector.includes('ProseMirror')
            ? 'contenteditable'
            : 'role=textbox';

        return { element: candidate, selector, kind };
      }
    }
  }

  throw await createRekaComposerError(page);
}

async function composerText(page: Page) {
  logRekaEvaluateBlock('composerText');
  return page.evaluate<string>(`(() => {
    const composer = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [contenteditable], [role="textbox"], div.ProseMirror, .ProseMirror'))
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

async function dismissCookieBannerIfPresent(page: Page) {
  const labels = [
    'Accept',
    'Accept all',
    'I agree',
    'Got it',
    'Continue',
  ];

  for (const label of labels) {
    const button = page
      .locator('button, [role="button"]')
      .filter({ hasText: new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') })
      .first();

    if (await button.isVisible({ timeout: 500 }).catch(() => false)) {
      await button.click({ timeout: 1000 }).catch(() => undefined);
      await page.waitForTimeout(250);
      return;
    }
  }

  logRekaEvaluateBlock('dismissCookieBannerIfPresent');
  await page.evaluate<boolean>(`(() => {
    function visible(el) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    }

    const button = Array.from(document.querySelectorAll('button, [role="button"]'))
      .filter(visible)
      .find((el) => /^(accept|accept all|i agree|got it|continue)$/i.test(String(el.textContent || '').trim()));

    if (!button) return false;
    button.click();
    return true;
  })()`).catch(() => false);
}

async function userMessageDetected(page: Page, prompt: string) {
  logRekaEvaluateBlock('userMessageDetected');
  return page.evaluate<boolean>(`(() => {
    const promptNeedle = ${JSON.stringify(promptNeedle(prompt))};

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

    return Array.from(document.querySelectorAll('[data-testid], [class], article, main, p, div'))
      .filter(visible)
      .some((el) => String(el.textContent || '').replace(/\\s+/g, ' ').toLowerCase().includes(promptNeedle));
  })()`).catch(() => false);
}

type RekaSubmitState = {
  composerCleared: boolean;
  generationStarted: boolean;
  responseChanged: boolean;
};

async function responseFingerprint(page: Page, prompt: string) {
  return (await answerDiagnostics(page, prompt)).selectedText;
}

async function submitGenerationStarted(
  page: Page,
  prompt: string,
  initialComposerLength: number,
  beforeResponseFingerprint: string,
): Promise<RekaSubmitState> {
  const currentComposerText = await composerText(page);
  const composerCleared = currentComposerText.trim().length < Math.max(3, initialComposerLength * 0.25);
  const generationStarted = await hasGeneratingControl(page);
  const currentResponseFingerprint = await responseFingerprint(page, prompt);
  const responseChanged = currentResponseFingerprint.length > 0 &&
    currentResponseFingerprint !== beforeResponseFingerprint;

  return {
    composerCleared,
    generationStarted,
    responseChanged,
  };
}

function logRekaSubmitState(state: RekaSubmitState, label: string) {
  console.log(`Reka composer cleared ${label}: ${state.composerCleared ? 'yes' : 'no'}`);
  console.log(`Reka generation started: ${state.generationStarted ? 'yes' : 'no'}`);
  console.log(`Reka assistant response changing: ${state.responseChanged ? 'yes' : 'no'}`);
}

function rekaSubmitStateAccepted(state: RekaSubmitState) {
  return state.composerCleared || state.generationStarted || state.responseChanged;
}

function logRekaSubmitStrategyResult(strategy: string, state: RekaSubmitState) {
  console.log(
    `Reka submit strategy result: ${strategy} ` +
    `composerCleared=${state.composerCleared ? 'yes' : 'no'} ` +
    `responseChanged=${state.responseChanged ? 'yes' : 'no'}`,
  );
}

async function verifyComposerContainsPrompt(page: Page, prompt: string) {
  await page.waitForTimeout(500);
  await verifyPastedPrompt(page, 'Reka', prompt, await composerText(page));
}

async function hasGeneratingControl(page: Page) {
  logRekaEvaluateBlock('hasGeneratingControl');
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
        return text.includes('stop') || text.includes('generating') || text.includes('loading') || text.includes('thinking');
      });
  })()`);
}

async function isComposerReady(page: Page) {
  logRekaEvaluateBlock('isComposerReady');
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

function promptNeedle(prompt: string) {
  return prompt.replace(/\s+/g, ' ').trim().slice(0, 120).toLowerCase();
}

type RekaAnswerDiagnostics = {
  candidateCount: number;
  topTextLengths: number[];
  topPreviews: string[];
  rejectedTop: Array<{
    preview: string;
    reason: string;
  }>;
  selectedText: string;
  selectedLength: number;
  selectedPreview: string;
};

async function collectAnswerCandidates(page: Page): Promise<RekaResponseCandidate[]> {
  logRekaEvaluateBlock('collectAnswerCandidates');
  return page.evaluate<RekaResponseCandidate[]>(`(() => {
    const semanticSelectors = ${JSON.stringify(semanticAnswerSelectors)};
    const legacySelectors = ${JSON.stringify(legacyContainerSelectors)};
    const submittedAt = ${JSON.stringify(pendingRekaSubmittedAt.get(page) ?? 0)};

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
          '[contenteditable]',
          '[role="textbox"]'
        ].join(','))
        .forEach((child) => child.remove());

      return String(clone.textContent || '').trim();
    }

    const composer = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [contenteditable], [role="textbox"], div.ProseMirror, .ProseMirror'))
      .filter(visible)
      .sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0];
    const composerTop = composer ? composer.getBoundingClientRect().top : 0;
    const composerBottom = composer ? composer.getBoundingClientRect().bottom : 0;

    const seen = new Set();
    const candidates = [];

    function collect(selectors, tier) {
      for (const selector of selectors) {
        for (const el of Array.from(document.querySelectorAll(selector))) {
          if (seen.has(el)) continue;
          seen.add(el);
          if (!visible(el)) continue;
          if (el.closest('nav, footer, header, aside, button, [role="button"], textarea, [contenteditable], [role="textbox"]')) continue;

          const rect = el.getBoundingClientRect();

          // Candidates fully inside the composer area are stale echoes of the
          // pasted prompt, not conversation content.
          if (composer && rect.top >= composerTop - 8 && rect.bottom <= composerBottom + 8) continue;

          const text = readableText(el).replace(/\\r/g, '\\n').replace(/[ \\t]+/g, ' ').trim();
          const previousText = el.getAttribute('data-maestriss-seen-text') || '';

          if (!el.getAttribute('data-maestriss-seen-at') || previousText !== text) {
            el.setAttribute('data-maestriss-seen-at', String(Date.now()));
            el.setAttribute('data-maestriss-seen-text', text);
          }

          const createdAt = Number(el.getAttribute('data-maestriss-seen-at') || 0);

          // Content last observed before this submit is a stale prior answer.
          if (submittedAt && createdAt && createdAt < submittedAt - 50) continue;

          candidates.push({
            text,
            tier,
            insideUserBubble: Boolean(el.closest('[class*="justify-end"]')),
            bottom: rect.bottom,
            createdAt,
          });
        }
      }
    }

    collect(semanticSelectors, 'semantic-answer');
    collect(legacySelectors, 'legacy-container');
    return candidates;
  })()`);
}

async function answerDiagnostics(page: Page, submittedPrompt = ''): Promise<RekaAnswerDiagnostics> {
  const candidates = await collectAnswerCandidates(page);
  const selection = selectRekaResponseCandidate(candidates, submittedPrompt);
  const selectedText = selection.selected?.text ?? '';
  const rejectedByCandidate = new Map(selection.rejected.map((entry) => [entry.candidate, entry.reason]));
  const accepted = candidates
    .filter((candidate) => !rejectedByCandidate.has(candidate))
    .sort((a, b) => b.text.length - a.text.length);

  return {
    candidateCount: candidates.length,
    topTextLengths: accepted.slice(0, 3).map((candidate) => candidate.text.length),
    topPreviews: accepted.slice(0, 3).map((candidate) => candidate.text.slice(0, 120)),
    rejectedTop: selection.rejected.slice(0, 5).map((entry) => ({
      preview: `tier=${entry.candidate.tier} ${entry.candidate.text.slice(0, 120)}`,
      reason: entry.reason,
    })),
    selectedText,
    selectedLength: selectedText.length,
    selectedPreview: selectedText.slice(0, 120),
  };
}

async function latestAnswerText(page: Page, submittedPrompt = '') {
  // Selection already runs the full candidate evaluation, so the selected
  // text is the accepted answer (or empty when none survives).
  return (await answerDiagnostics(page, submittedPrompt)).selectedText;
}

async function dispatchComposerInputEvents(page: Page) {
  logRekaEvaluateBlock('dispatchComposerInputEvents');
  return page.evaluate<boolean>(`(() => {
    function visible(el) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    }

    const composer = Array.from(document.querySelectorAll(${JSON.stringify(composerSelectors.join(','))}))
      .find((element) => visible(element));

    if (!composer) return false;

    composer.focus();

    try {
      const text = composer.value || composer.innerText || composer.textContent || '';
      composer.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text
      }));
    } catch {
      composer.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }

    composer.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    composer.dispatchEvent(new Event('compositionend', { bubbles: true, cancelable: true }));
    return true;
  })()`);
}

type RekaCoordinateSubmitTarget = {
  found: boolean;
  label: string;
  candidateCount?: number;
  selectedIndex?: number;
  x?: number;
  y?: number;
  composerBox?: { x: number; y: number; width: number; height: number };
  boundingBox?: { x: number; y: number; width: number; height: number };
  candidates?: Array<{
    index: number;
    tag: string;
    text: string;
    classes: string;
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    backgroundColor: string;
  }>;
};

type RekaSubmitCandidateCollection = {
  composerFound: boolean;
  composerBox: { x: number; y: number; width: number; height: number } | null;
  candidates: RekaSubmitButtonDescriptor[];
};

async function collectRekaSubmitCandidates(page: Page): Promise<RekaSubmitCandidateCollection> {
  logRekaEvaluateBlock('collectRekaSubmitCandidates');
  return page.evaluate<RekaSubmitCandidateCollection>(`(() => {
    const selectors = ${JSON.stringify(composerSelectors.join(','))};

    function visible(el) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
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
        el.getAttribute('data-slot'),
        el.getAttribute('class'),
        Array.from(el.querySelectorAll('svg,path')).map((svg) => [
          svg.getAttribute('aria-label'),
          svg.getAttribute('class'),
          svg.getAttribute('data-testid'),
          svg.getAttribute('d'),
        ].filter(Boolean).join(' ')).join(' '),
      ].filter(Boolean).join(' ').toLowerCase();
    }

    function legacyComposerControlBox(composer) {
      let current = composer;
      let best = composer;

      for (let depth = 0; current && depth < 8; depth += 1) {
        const rect = current.getBoundingClientRect();
        const buttonCount = current.querySelectorAll('button, [role="button"]').length;
        if (buttonCount > 0 && rect.width >= 260 && rect.height <= 260) {
          best = current;
        }
        current = current.parentElement;
      }

      return best.getBoundingClientRect();
    }

    const composers = Array.from(document.querySelectorAll(selectors))
      .filter((element, index, all) => all.indexOf(element) === index)
      .filter(visible);

    const composer = composers.find((element) => {
      const text = element.value || element.innerText || element.textContent || '';
      return text.trim().length > 0;
    }) || composers[0];

    if (!composer) {
      return { composerFound: false, composerBox: null, candidates: [] };
    }

    const composerBox = legacyComposerControlBox(composer);
    const overlapsComposerBox = (rect) => rect.left < composerBox.right + 4 &&
      rect.right > composerBox.left - 4 &&
      rect.top < composerBox.bottom + 4 &&
      rect.bottom > composerBox.top - 4;

    // Structural scopes: the composer's form is the strongest relation, then
    // the nearest composer ancestor that contains buttons.
    const composerForm = composer.closest('form');
    let ancestorWithButtons = null;
    let current = composer.parentElement;

    for (let depth = 0; current && depth < 8; depth += 1) {
      if (current.querySelectorAll('button, [role="button"]').length > 0) {
        ancestorWithButtons = current;
        break;
      }
      current = current.parentElement;
    }

    const candidates = Array.from(document.querySelectorAll('button, [role="button"]'))
      .filter((button, index, all) => all.indexOf(button) === index)
      .filter((button) => visible(button) && enabled(button))
      .map((button) => {
        const rect = button.getBoundingClientRect();
        const scope = composerForm && composerForm.contains(button)
          ? 'form'
          : ancestorWithButtons && ancestorWithButtons.contains(button)
            ? 'ancestor'
            : 'page';

        return {
          tag: button.tagName.toLowerCase(),
          text: textFor(button).replace(/\\s+/g, ' ').trim().slice(0, 240),
          classes: String(button.getAttribute('class') || '').replace(/\\s+/g, ' ').trim().slice(0, 220),
          scope,
          overlapsComposerBox: overlapsComposerBox(rect),
          hasSvgIcon: Boolean(button.querySelector('svg')),
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          centerX: rect.x + rect.width / 2,
          centerY: rect.y + rect.height / 2,
          backgroundColor: getComputedStyle(button).backgroundColor,
        };
      })
      // Page-scope buttons are only considered with geometric overlap
      // evidence; structurally related buttons are always considered.
      .filter((candidate) => candidate.scope !== 'page' || candidate.overlapsComposerBox)
      .map((candidate, index) => ({ ...candidate, index }));

    return {
      composerFound: true,
      composerBox: {
        x: composerBox.x,
        y: composerBox.y,
        width: composerBox.width,
        height: composerBox.height,
      },
      candidates,
    };
  })()`);
}

async function findRekaCoordinateSubmitTarget(page: Page): Promise<RekaCoordinateSubmitTarget> {
  const collection = await collectRekaSubmitCandidates(page);

  if (!collection.composerFound) {
    return { found: false, label: 'no visible Reka composer found' };
  }

  const selection = selectRekaSubmitTarget(collection.candidates);
  const composerBox = collection.composerBox ?? undefined;
  const candidates = collection.candidates.map((candidate) => ({
    index: candidate.index,
    tag: candidate.tag,
    text: `${candidate.scope}${candidate.overlapsComposerBox ? '+overlap' : ''} ${candidate.text}`.slice(0, 180),
    classes: candidate.classes,
    x: candidate.x,
    y: candidate.y,
    width: candidate.width,
    height: candidate.height,
    centerX: candidate.centerX,
    centerY: candidate.centerY,
    backgroundColor: candidate.backgroundColor,
  }));

  if (!selection.selected) {
    return {
      found: false,
      label: 'no structural or composer-overlapping Reka submit button found',
      candidateCount: selection.consideredCount,
      ...(composerBox ? { composerBox } : {}),
      candidates,
    };
  }

  const selected = selection.selected;

  return {
    found: true,
    label: `selector=${selected.tag} scope=${selected.scope} class="${selected.classes.slice(0, 160)}" score=${Math.round(selection.score ?? 0)}`,
    candidateCount: selection.consideredCount,
    selectedIndex: selected.index,
    x: selected.centerX,
    y: selected.centerY,
    ...(composerBox ? { composerBox } : {}),
    boundingBox: {
      x: selected.x,
      y: selected.y,
      width: selected.width,
      height: selected.height,
    },
    candidates,
  };
}

async function performRekaDomSubmitStrategy(
  page: Page,
  strategy: 'target-events' | 'ancestor-events' | 'form-submit',
  x: number,
  y: number,
) {
  logRekaEvaluateBlock(`performRekaDomSubmitStrategy:${strategy}`);
  return page.evaluate<boolean>(`(() => {
    const strategy = ${JSON.stringify(strategy)};
    const x = ${JSON.stringify(x)};
    const y = ${JSON.stringify(y)};

    function visible(el) {
      if (!el || !el.getBoundingClientRect) return false;
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    }

    function eventOptions() {
      return {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: x,
        clientY: y,
        screenX: x,
        screenY: y,
        button: 0,
        buttons: 1,
      };
    }

    function dispatchClickSequence(el) {
      if (!el) return false;
      if (typeof el.focus === 'function') {
        el.focus();
      }

      const pointerOptions = {
        ...eventOptions(),
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
      };

      try {
        el.dispatchEvent(new PointerEvent('pointerdown', pointerOptions));
        el.dispatchEvent(new MouseEvent('mousedown', eventOptions()));
        el.dispatchEvent(new PointerEvent('pointerup', pointerOptions));
        el.dispatchEvent(new MouseEvent('mouseup', eventOptions()));
        el.dispatchEvent(new MouseEvent('click', eventOptions()));
      } catch {
        el.dispatchEvent(new MouseEvent('mousedown', eventOptions()));
        el.dispatchEvent(new MouseEvent('mouseup', eventOptions()));
        el.dispatchEvent(new MouseEvent('click', eventOptions()));
      }

      return true;
    }

    const stack = document.elementsFromPoint(x, y).filter(visible);
    const target = stack[0] || null;
    const targetButton = target?.closest?.('button, [role="button"]') || target;
    const ancestor = target?.closest?.('button, form, [role="button"]') ||
      targetButton?.closest?.('button, form, [role="button"]') ||
      targetButton;
    const form = target?.closest?.('form') ||
      targetButton?.closest?.('form') ||
      ancestor?.closest?.('form') ||
      null;

    if (strategy === 'target-events') {
      return dispatchClickSequence(targetButton);
    }

    if (strategy === 'ancestor-events') {
      return dispatchClickSequence(ancestor);
    }

    if (strategy === 'form-submit') {
      if (!form) return false;
      const submitEvent = new SubmitEvent('submit', {
        bubbles: true,
        cancelable: true,
        composed: true,
        submitter: targetButton instanceof HTMLElement ? targetButton : null,
      });
      const notCancelled = form.dispatchEvent(submitEvent);
      if (notCancelled && typeof form.requestSubmit === 'function') {
        try {
          form.requestSubmit(targetButton instanceof HTMLElement ? targetButton : undefined);
        } catch {
          form.requestSubmit();
        }
      }
      return true;
    }

    return false;
  })()`);
}

async function extractNormalized(page: Page, question: string, elapsedSeconds: number): Promise<ParticipantResponse> {
  const rawText = await latestAnswerText(page, question || pendingRekaPrompts.get(page) || '');
  const cleanedText = cleanRekaText(rawText);

  if (!cleanedText || cleanedText.length <= 5 || isKnownRekaChrome(cleanedText)) {
    throw new Error('reka-no-assistant-response-detected');
  }

  return {
    participant: 'reka',
    question,
    answer: cleanedText,
    citations: [],
    elapsedSeconds,
    rawText,
    cleanedText,
    rawHtml: await page.content().catch(() => undefined),
  };
}

export const rekaDriver: ParticipantDriver = {
  name: 'Reka',

  matchParticipant(participant) {
    return participant.id === 'reka' || participant.url.includes('app.reka.ai');
  },

  async waitForReady(page: Page) {
    await page.waitForLoadState('domcontentloaded');
    await dismissCookieBannerIfPresent(page);

    try {
      await findComposer(page);
      return;
    } catch (error) {
      const currentUrl = page.url();

      if (!currentUrl.startsWith('https://app.reka.ai/')) {
        throw error;
      }
    }

    const fallbackUrls = [
      'https://app.reka.ai/',
      'https://app.reka.ai/chat',
      'https://app.reka.ai/playground',
    ];

    let lastError: unknown;

    for (const url of fallbackUrls) {
      await page.goto(url, { waitUntil: 'domcontentloaded' }).catch((error: unknown) => {
        lastError = error;
      });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);

      try {
        await findComposer(page);
        return;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw await createRekaComposerError(page);
  },

  async pastePrompt(page: Page, prompt: string) {
    await this.waitForReady(page);
    await dismissCookieBannerIfPresent(page);
    const composer = await findComposer(page);
    console.log(`Composer found: ${composer.selector}`);
    console.log(`Composer strategy: ${composer.kind}`);
    console.log(`Prompt length: ${prompt.length}`);

    if (composer.kind === 'textarea') {
      await composer.element.fill(prompt);
      await verifyComposerContainsPrompt(page, prompt);
      pendingRekaPrompts.set(page, prompt);
      console.log('Prompt pasted');
      return;
    }

    await composer.element.click();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.insertText(prompt);

    try {
      await verifyComposerContainsPrompt(page, prompt);
      pendingRekaPrompts.set(page, prompt);
      console.log('Prompt pasted');
      return;
    } catch {
      logRekaEvaluateBlock('clipboardPasteFallback');
      await page.evaluate(`navigator.clipboard.writeText(${JSON.stringify(prompt)})`).catch(() => undefined);
      await composer.element.click();
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');
      await verifyComposerContainsPrompt(page, prompt);
      pendingRekaPrompts.set(page, prompt);
      console.log('Prompt pasted');
    }
  },

  async submitPrompt(page: Page, options = {}) {
    await dismissCookieBannerIfPresent(page);
    const composer = await findComposer(page);
    const submittedPrompt = pendingRekaPrompts.get(page) || await composerText(page);
    const initialComposerLength = submittedPrompt.trim().length;
    const beforeResponseFingerprint = await responseFingerprint(page, submittedPrompt);

    await composer.element.focus();
    await dispatchComposerInputEvents(page);

    const coordinateTarget = await findRekaCoordinateSubmitTarget(page);
    console.log(`Reka composer box: ${JSON.stringify(coordinateTarget.composerBox ?? null)}`);
    console.log(`Reka candidate button count: ${coordinateTarget.candidateCount ?? 0}`);
    (coordinateTarget.candidates ?? []).forEach((candidate) => {
      console.log([
        `Reka candidate button ${candidate.index}:`,
        `tag=${candidate.tag}`,
        `text="${candidate.text}"`,
        `classes="${candidate.classes}"`,
        `x=${candidate.x}`,
        `y=${candidate.y}`,
        `width=${candidate.width}`,
        `height=${candidate.height}`,
        `centerX=${candidate.centerX}`,
        `centerY=${candidate.centerY}`,
        `backgroundColor=${candidate.backgroundColor}`,
      ].join(' '));
    });
    console.log(`Reka selected button index: ${coordinateTarget.selectedIndex ?? 'none'}`);
    console.log(`Reka actual submit control: ${coordinateTarget.label}`);
    console.log(`Reka submit bounding box: ${JSON.stringify(coordinateTarget.boundingBox ?? null)}`);

    const hasClickTarget = coordinateTarget.found &&
      coordinateTarget.x !== undefined &&
      coordinateTarget.y !== undefined;

    if (!hasClickTarget) {
      // A missing clickable target must not block verified keyboard
      // submission; keyboard strategies only need the composer.
      console.log('Reka submit control not found; attempting keyboard strategies before failing');
    }

    async function runStrategy(strategy: string, action: () => Promise<void>, waitMs = 1000) {
      pendingRekaSubmittedAt.set(page, Date.now());
      await action();
      await page.waitForTimeout(waitMs);

      const state = await submitGenerationStarted(
        page,
        submittedPrompt,
        initialComposerLength,
        beforeResponseFingerprint,
      );
      logRekaSubmitStrategyResult(strategy, state);

      if (rekaSubmitStateAccepted(state)) {
        console.log(`Submit strategy: ${strategy}`);
        return true;
      }

      return false;
    }

    const keyboardStrategies: Array<{ strategy: string; key: string }> = [
      { strategy: 'keyboard Enter', key: 'Enter' },
      { strategy: 'keyboard Ctrl+Enter', key: 'Control+Enter' },
      { strategy: 'keyboard Meta+Enter', key: 'Meta+Enter' },
    ];

    for (const keyboardStrategy of keyboardStrategies) {
      const submitted = await runStrategy(keyboardStrategy.strategy, async () => {
        await composer.element.focus();
        await dispatchComposerInputEvents(page);
        await page.keyboard.press(keyboardStrategy.key);
      });

      if (submitted) {
        return;
      }
    }

    if (!hasClickTarget) {
      const artifacts = await saveRekaSubmitFailedDebug(page);
      throw new Error([
        'reka-submit-failed',
        coordinateTarget.label,
        'Keyboard submit strategies produced no accepted-submission evidence and no clickable submit control was found.',
        `Debug HTML: ${artifacts.htmlPath}`,
        `Debug screenshot: ${artifacts.screenshotPath}`,
      ].join('\n'));
    }

    const domStrategies: Array<{
      strategy: string;
      mode: 'target-events' | 'ancestor-events' | 'form-submit';
    }> = [
      { strategy: 'DOM target pointer/mouse/click sequence', mode: 'target-events' },
      { strategy: 'DOM ancestor pointer/mouse/click sequence', mode: 'ancestor-events' },
      { strategy: 'DOM form submit event', mode: 'form-submit' },
    ];

    for (const domStrategy of domStrategies) {
      const submitted = await runStrategy(domStrategy.strategy, async () => {
        await performRekaDomSubmitStrategy(
          page,
          domStrategy.mode,
          coordinateTarget.x!,
          coordinateTarget.y!,
        );
      });

      if (submitted) {
        return;
      }
    }

    console.log(`Reka mouse click at: ${coordinateTarget.x},${coordinateTarget.y}`);
    pendingRekaSubmittedAt.set(page, Date.now());
    await page.mouse.click(coordinateTarget.x!, coordinateTarget.y!);
    const afterClickScreenshotPath = await saveRekaAfterCoordinateClickDebug(page);
    console.log(`Reka after coordinate click screenshot: ${afterClickScreenshotPath}`);
    console.log(`Reka composer text after click: ${await composerText(page)}`);

    if (options.debugClick) {
      throw new Error(`reka-debug-click-complete\nDebug screenshot: ${afterClickScreenshotPath}`);
    }

    await page.waitForTimeout(2000);

    const clickState = await submitGenerationStarted(
        page,
        submittedPrompt,
        initialComposerLength,
        beforeResponseFingerprint,
      );
    logRekaSubmitStrategyResult('coordinate mouse click', clickState);
    logRekaSubmitState(clickState, 'after coordinate click');

    if (rekaSubmitStateAccepted(clickState)) {
      console.log('Submit strategy: coordinate mouse click');
      return;
    }

    const artifacts = await saveRekaSubmitFailedDebug(page);
    throw new Error([
      'reka-submit-failed',
      `Debug HTML: ${artifacts.htmlPath}`,
      `Debug screenshot: ${artifacts.screenshotPath}`,
    ].join('\n'));
  },

  async waitForCompletion(page: Page) {
    console.log('Reka response detector version: v3');
    const startedAt = Date.now();
    const hardTimeoutMs = 180000;
    const stableMs = 5000;
    const submittedPrompt = pendingRekaPrompts.get(page) || '';
    let lastText = await latestAnswerText(page, submittedPrompt);
    let stableSince = Date.now();
    let lastProgressLogAt = 0;
    let liveDebugSaved = false;

    while (Date.now() - startedAt < hardTimeoutMs) {
      const diagnostics = await answerDiagnostics(page, submittedPrompt);
      const text = diagnostics.selectedText;

      if (text !== lastText) {
        lastText = text;
        stableSince = Date.now();
      }

      const stopVisible = await hasGeneratingControl(page);
      const responseLength = cleanRekaText(text).length;
      const currentStableMs = Date.now() - stableSince;
      const textStable = responseLength > 5 && currentStableMs >= stableMs;

      if (Date.now() - lastProgressLogAt >= 5000) {
        console.log(`Reka wait: responseLength=${responseLength} stableMs=${currentStableMs} stopVisible=${stopVisible} candidateCount=${diagnostics.candidateCount} topLengths=${diagnostics.topTextLengths.join(',') || '(none)'} preview=${diagnostics.selectedPreview || '(none)'}`);
        diagnostics.topPreviews.forEach((preview, index) => {
          console.log(`Reka candidate ${index + 1}: ${preview || '(empty)'}`);
        });
        diagnostics.rejectedTop.forEach((candidate) => {
          console.log(`Reka rejected candidate reason: ${candidate.reason} ${candidate.preview}`);
        });
        lastProgressLogAt = Date.now();
      }

      if (responseLength === 0 && Date.now() - startedAt > 10000 && !liveDebugSaved) {
        const artifacts = await saveRekaLiveDebug(page);
        console.log(`Reka live debug HTML: ${artifacts.htmlPath}`);
        console.log(`Reka live debug screenshot: ${artifacts.screenshotPath}`);
        liveDebugSaved = true;
      }

      if (!stopVisible && textStable) {
        return;
      }

      await page.waitForTimeout(500);
    }

    const artifacts = await saveRekaResponseNotFoundDebug(page);
    throw new Error([
      'Timed out waiting for Reka completion.',
      `Debug HTML: ${artifacts.htmlPath}`,
      `Debug screenshot: ${artifacts.screenshotPath}`,
    ].join('\n'));
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
