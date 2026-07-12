import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ElementHandle, Page } from 'playwright';
import type { RunnerParticipant } from '../participants.js';
import type { ParticipantResponse } from '../types.js';
import type { ParticipantDriver } from './base.js';
import {
  cleanClaudeResponseText,
  evaluateClaudeCandidateText,
  isClaudeShellOrStatusText,
} from './claudeFiltering.js';
import { verifyPastedPrompt } from './pasteVerification.js';

const noResponseText = '[No response text detected]';
const pendingClaudePrompts = new WeakMap<Page, string>();

const composerSelectors = [
  'div.ProseMirror[contenteditable="true"]',
  '.ProseMirror[contenteditable="true"]',
  '[data-testid*="composer" i] [contenteditable="true"]',
  '[data-testid*="input" i] [contenteditable="true"]',
  'textarea',
  '[contenteditable="true"]',
  '[contenteditable]',
  '[role="textbox"]',
  'textarea[placeholder*="Message" i]',
  'textarea[placeholder*="Ask" i]',
  '[aria-label*="message" i]',
  '[aria-label*="prompt" i]',
];

type ComposerKind = 'textarea' | 'contenteditable' | 'role=textbox';

type ComposerMatch = {
  element: ElementHandle<Element>;
  selector: string;
  kind: ComposerKind;
};

type ClaudeSubmitTarget = {
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
    score: number;
  }>;
};

type ClaudeStopDiagnostics = {
  visible: boolean;
  candidate: string;
};

type ClaudeResponseDiagnostics = {
  candidateCount: number;
  selectedText: string;
  selectedPreview: string;
  selectedGeometry?: { x: number; y: number; width: number; height: number };
  rejectedTop: Array<{ reason: string; preview: string }>;
  stop: ClaudeStopDiagnostics;
  respondingVisible: boolean;
};

type ClaudeSubmitState = {
  composerCleared: boolean;
  generationStarted: boolean;
  responseChanged: boolean;
};

function promptNeedle(prompt: string) {
  return prompt.replace(/\s+/g, ' ').trim().slice(0, 160).toLowerCase();
}

async function saveClaudeDebug(page: Page, name: string) {
  const debugDir = path.join(process.cwd(), 'debug');
  await mkdir(debugDir, { recursive: true });

  const htmlPath = path.join(debugDir, `${name}.html`);
  const screenshotPath = path.join(debugDir, `${name}.png`);

  await writeFile(htmlPath, await page.content().catch(() => ''), 'utf8');
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);

  return { htmlPath, screenshotPath };
}

async function claudeEditableCount(page: Page) {
  return page.evaluate<number>(`(() => {
    function visible(el) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    }

    return Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [contenteditable], [role="textbox"], .ProseMirror'))
      .filter(visible)
      .length;
  })()`).catch(() => 0);
}

async function createClaudeComposerError(page: Page) {
  const [title, candidateEditableCount, artifacts] = await Promise.all([
    page.title().catch(() => ''),
    claudeEditableCount(page),
    saveClaudeDebug(page, 'claude-composer-not-found'),
  ]);

  return new Error([
    'Could not find Claude composer.',
    `Current URL: ${page.url()}`,
    `Title: ${title || '(untitled)'}`,
    `Candidate editable count: ${candidateEditableCount}`,
    `Debug HTML: ${artifacts.htmlPath}`,
    `Debug screenshot: ${artifacts.screenshotPath}`,
  ].join('\n'));
}

async function dismissCookieBannerIfPresent(page: Page) {
  const labels = ['Accept', 'Accept all', 'I agree', 'Got it', 'Continue'];

  for (const label of labels) {
    const button = page
      .locator('button, [role="button"]')
      .filter({ hasText: new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') })
      .first();

    if (await button.isVisible({ timeout: 350 }).catch(() => false)) {
      await button.click({ timeout: 1000 }).catch(() => undefined);
      await page.waitForTimeout(250);
      return;
    }
  }
}

async function findComposer(page: Page): Promise<ComposerMatch> {
  for (const selector of composerSelectors) {
    const candidates = await page.$$(selector);

    for (const candidate of candidates) {
      const usable = await candidate.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        const disabled = el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
        const editable = 'value' in el ||
          el.getAttribute('contenteditable') === 'true' ||
          el.getAttribute('role') === 'textbox' ||
          el.classList.contains('ProseMirror');

        return editable &&
          !disabled &&
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0';
      }).catch(() => false);

      if (!usable) {
        continue;
      }

      const kind = selector.includes('textarea')
        ? 'textarea'
        : selector.includes('contenteditable') || selector.includes('ProseMirror')
          ? 'contenteditable'
          : 'role=textbox';

      return { element: candidate, selector, kind };
    }
  }

  throw await createClaudeComposerError(page);
}

async function composerText(page: Page) {
  return page.evaluate<string>(`(() => {
    function visible(el) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    }

    const selector = 'textarea, [contenteditable="true"], [contenteditable], [role="textbox"], .ProseMirror';
    const active = document.activeElement;

    if (active && active.matches(selector) && visible(active)) {
      if ('value' in active) return String(active.value || '');
      return String(active.innerText || active.textContent || '');
    }

    const composer = Array.from(document.querySelectorAll(selector))
      .filter(visible)
      .sort((left, right) => right.getBoundingClientRect().bottom - left.getBoundingClientRect().bottom)[0];

    if (!composer) return '';
    if ('value' in composer) return String(composer.value || '');
    return String(composer.innerText || composer.textContent || '');
  })()`);
}

async function verifyComposerContainsPrompt(page: Page, prompt: string) {
  await page.waitForTimeout(500);
  await verifyPastedPrompt(page, 'Claude', prompt, await composerText(page));
}

async function activeClaudeStopDiagnostics(page: Page): Promise<ClaudeStopDiagnostics> {
  return page.evaluate<ClaudeStopDiagnostics>(`(() => {
    function visible(el) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    }

    function normalize(value) {
      return String(value || '').replace(/\\s+/g, ' ').trim().toLowerCase();
    }

    function debugLabel(element) {
      return [
        'text=' + JSON.stringify(String(element.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 120)),
        'aria=' + JSON.stringify(String(element.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim().slice(0, 120)),
        'class=' + JSON.stringify(String(element.getAttribute('class') || '').replace(/\\s+/g, ' ').trim().slice(0, 160))
      ].join(' ');
    }

    const selected = Array.from(document.querySelectorAll('button, [role="button"]'))
      .filter(visible)
      .find((element) => {
        const enabled = !element.hasAttribute('disabled') && element.getAttribute('aria-disabled') !== 'true';
        if (!enabled) return false;

        return [
          element.textContent,
          element.getAttribute('aria-label'),
          element.getAttribute('title')
        ].filter(Boolean).some((part) => {
          const label = normalize(part);
          return label === 'stop' || label === 'stop generating';
        });
      });

    return {
      visible: Boolean(selected),
      candidate: selected ? debugLabel(selected) : ''
    };
  })()`);
}

async function claudeRespondingVisible(page: Page) {
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

    return Array.from(document.querySelectorAll('main *, [data-testid], [class]'))
      .filter(visible)
      .some((element) => String(element.textContent || '').replace(/\\s+/g, ' ').trim().toLowerCase() === 'claude is responding');
  })()`);
}

async function claudeResponseDiagnostics(page: Page, submittedPrompt = ''): Promise<ClaudeResponseDiagnostics> {
  const diagnostics = await page.evaluate<Omit<ClaudeResponseDiagnostics, 'stop' | 'respondingVisible'>>(`(() => {
    const promptNeedle = ${JSON.stringify(promptNeedle(submittedPrompt))};
    const selectors = [
      '[data-testid*="assistant" i]',
      '[data-testid*="message" i]',
      '[data-is-streaming]',
      '[class*="font-claude-message" i]',
      '[class*="assistant" i]',
      '[class*="message" i]',
      '[class*="markdown" i]',
      '[class*="prose" i]',
      'article',
      'main p',
      'main li',
      'main div'
    ];

    function visible(el) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    }

    function normalize(text) {
      return text.replace(/\\s+/g, ' ').trim().toLowerCase();
    }

    const exactPromptMatch = promptNeedle.match(/^say exactly:\\s*(.+?)\\s*$/i);
    const exactExpectedAnswer = exactPromptMatch ? exactPromptMatch[1].trim() : '';

    function stripTransientPrefix(text) {
      return String(text || '')
        .replace(/^\\s*claude responded:\\s*/i, '')
        .replace(/^\\s*(?:thought for \\d+s|thinking(?:\\.\\.\\.|\\.)?|claude is responding)\\s*/i, '')
        .trim();
    }

    function cleanText(text) {
      if (exactExpectedAnswer && normalize(text).includes(normalize(exactExpectedAnswer))) {
        return exactExpectedAnswer;
      }

      const seen = new Set();
      return String(text || '')
        .replace(/\\r/g, '\\n')
        .split('\\n')
        .map((line) => stripTransientPrefix(line.trim()))
        .filter(Boolean)
        .filter((line) => !chromeText(line))
        .filter((line) => !/^(copy|retry|regenerate|share|edit|new chat|projects|artifacts|recents|search)$/i.test(line))
        .filter((line) => {
          const normalized = normalize(line);
          if (seen.has(normalized)) return false;
          seen.add(normalized);
          return true;
        })
        .join('\\n')
        .replace(/\\n{3,}/g, '\\n\\n')
        .trim();
    }

    function candidateBox(candidate) {
      return 'x=' + Math.round(candidate.left) +
        ' y=' + Math.round(candidate.top) +
        ' width=' + Math.round(candidate.width) +
        ' height=' + Math.round(candidate.height);
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
          'textarea',
          'input',
          '[contenteditable="true"]',
          '[contenteditable]',
          '[role="textbox"]',
          '[class*="composer" i]',
          '[class*="input" i]',
          '[class*="toolbar" i]',
          '[class*="button" i]',
          '[class*="copy" i]',
          '[class*="share" i]',
          '[class*="retry" i]',
          '[class*="regenerate" i]',
          '[class*="feedback" i]',
          '[class*="menu" i]'
        ].join(','))
        .forEach((child) => child.remove());

      return String(clone.textContent || '')
        .replace(/\\r/g, '\\n')
        .replace(/[ \\t]+/g, ' ')
        .trim();
    }

    function insideExcludedArea(element) {
      return Boolean(element.closest([
        'nav',
        'footer',
        'header',
        'aside',
        '[role="navigation"]',
        '[class*="sidebar" i]',
        '[class*="history" i]',
        '[class*="recents" i]',
        '[class*="project" i]',
        '[class*="artifact" i]',
        '[data-testid*="sidebar" i]',
        '[data-testid*="history" i]'
      ].join(',')));
    }

    function chromeText(text) {
      const normalized = normalize(text);
      return normalized.length === 0 ||
        [
          'new chat',
          'chats',
          'projects',
          'artifacts',
          'recents',
          'search',
          'settings',
          'copy',
          'retry',
          'regenerate',
          'share',
          'edit',
          'stop',
          'stop generating',
          'thinking',
          'thinking...',
          'loading',
          'loading...',
          'claude is responding',
          'claude can make mistakes'
        ].includes(normalized) ||
        normalized.includes('claude can make mistakes') ||
        normalized.includes('claude is responding') ||
        normalized.includes('search chats') ||
        normalized.includes('recent chats') ||
        normalized.includes('conversation history');
    }

    function promptOnly(text) {
      if (!promptNeedle) return false;
      const normalized = normalize(text);
      return normalized === promptNeedle ||
        (normalized.includes(promptNeedle) && normalized.length <= promptNeedle.length + 160);
    }

    function nearbyAssistantActions(element) {
      const rect = element.getBoundingClientRect();
      return Array.from(document.querySelectorAll('button, [role="button"], [aria-label], [title], [data-testid]'))
        .filter(visible)
        .some((button) => {
          const buttonRect = button.getBoundingClientRect();
          const nearby = buttonRect.top >= rect.top - 50 &&
            buttonRect.top <= rect.bottom + 150 &&
            buttonRect.left >= rect.left - 100 &&
            buttonRect.right <= rect.right + 200;
          if (!nearby) return false;
          const text = [
            button.textContent,
            button.getAttribute('aria-label'),
            button.getAttribute('title'),
            button.getAttribute('data-testid')
          ].filter(Boolean).join(' ').toLowerCase();
          return /copy|retry|regenerate|share|thumb|like|dislike|feedback/.test(text);
        });
    }

    function rejectionReason(candidate) {
      const cleanedText = candidate.cleanedText;
      if (!cleanedText || cleanedText.length <= 5) return 'too-short';
      if (candidate.insideExcludedArea) return 'sidebar-navigation-history-container';
      if (candidate.width < 40) return 'page-or-transcript-parent-container';
      if (candidate.height > 600) return 'page-or-transcript-parent-container';
      if (promptOnly(cleanedText) || promptOnly(candidate.text)) return 'submitted-prompt-only';
      if (chromeText(cleanedText) || chromeText(candidate.text)) return 'known-claude-chrome';

      const candidateArea = candidate.width * candidate.height;
      const normalizedRaw = normalize(candidate.text);
      const normalizedCleaned = normalize(cleanedText);
      const smallerValidChild = candidatesBeforeFiltering.some((sibling) => {
        if (sibling === candidate) return false;

        const siblingArea = sibling.width * sibling.height;
        return (sibling.cleanedText === cleanedText || normalizedRaw.includes(normalize(sibling.cleanedText))) &&
          siblingArea < candidateArea * 0.75 &&
          !sibling.insideExcludedArea &&
          !promptOnly(sibling.cleanedText) &&
          !chromeText(sibling.cleanedText);
      });

      if (smallerValidChild && normalizedRaw !== normalizedCleaned) return 'page-or-transcript-parent-container';
      return '';
    }

    const candidatesBeforeFiltering = selectors
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .filter((element, index, all) => all.indexOf(element) === index)
      .filter((element) => visible(element) && !element.closest('button, [role="button"], textarea, input, [contenteditable], [role="textbox"]'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const text = readableText(element);
        return {
          bottom: rect.bottom,
          top: rect.top,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
          textLength: text.length,
          text,
          cleanedText: cleanText(text),
          hasAssistantActions: nearbyAssistantActions(element),
          insideExcludedArea: insideExcludedArea(element),
        };
      })
      .filter((candidate) => candidate.text.length > 0);

    const rejectedTop = candidatesBeforeFiltering
      .map((candidate) => ({
        preview: candidateBox(candidate) + ' ' + candidate.text.slice(0, 140),
        reason: rejectionReason(candidate),
      }))
      .filter((candidate) => candidate.reason)
      .slice(0, 8);

    const candidates = candidatesBeforeFiltering
      .filter((candidate) => !rejectionReason(candidate))
      .sort((left, right) => {
        if (left.hasAssistantActions !== right.hasAssistantActions) {
          return left.hasAssistantActions ? -1 : 1;
        }
        const leftArea = left.width * left.height;
        const rightArea = right.width * right.height;
        const areaDelta = leftArea - rightArea;
        if (Math.abs(areaDelta) > 500) return areaDelta;
        const sizeDelta = left.cleanedText.length - right.cleanedText.length;
        if (Math.abs(sizeDelta) > 20) return sizeDelta;
        return right.bottom - left.bottom;
      });

    const selected = candidates[0];

    return {
      candidateCount: candidates.length,
      selectedText: selected?.text || '',
      selectedPreview: selected ? candidateBox(selected) + ' ' + selected.text.slice(0, 140) : '',
      selectedGeometry: selected
        ? { x: selected.left, y: selected.top, width: selected.width, height: selected.height }
        : undefined,
      rejectedTop,
    };
  })()`);
  const [stop, respondingVisible] = await Promise.all([
    activeClaudeStopDiagnostics(page),
    claudeRespondingVisible(page),
  ]);

  return {
    ...diagnostics,
    stop,
    respondingVisible,
  };
}

async function latestClaudeCleanedText(page: Page, submittedPrompt: string) {
  const diagnostics = await claudeResponseDiagnostics(page, submittedPrompt);
  const evaluation = evaluateClaudeCandidateText(diagnostics.selectedText, submittedPrompt);
  return evaluation.accepted ? cleanClaudeResponseText(diagnostics.selectedText) : '';
}

async function findClaudeSubmitTarget(page: Page): Promise<ClaudeSubmitTarget> {
  return page.evaluate<ClaudeSubmitTarget>(`(() => {
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
        el.getAttribute('class'),
        Array.from(el.querySelectorAll('svg,path')).map((svg) => [
          svg.getAttribute('aria-label'),
          svg.getAttribute('class'),
          svg.getAttribute('data-testid'),
          svg.getAttribute('d')
        ].filter(Boolean).join(' ')).join(' ')
      ].filter(Boolean).join(' ').toLowerCase();
    }

    function composerControlBox(composer) {
      let current = composer;
      let best = composer;

      for (let depth = 0; current && depth < 8; depth += 1) {
        const rect = current.getBoundingClientRect();
        const buttonCount = current.querySelectorAll('button, [role="button"]').length;
        if (buttonCount > 0 && rect.width >= 260 && rect.height <= 280) {
          best = current;
        }
        current = current.parentElement;
      }

      return best.getBoundingClientRect();
    }

    function labelFor(el, score) {
      const label = [
        el.getAttribute('aria-label'),
        el.getAttribute('title'),
        el.getAttribute('data-testid'),
        (el.textContent || '').trim()
      ].filter(Boolean).join(' | ').replace(/\\s+/g, ' ').slice(0, 140);
      const classes = String(el.getAttribute('class') || '').replace(/\\s+/g, ' ').slice(0, 180);
      return 'selector=' + el.tagName.toLowerCase() + ' label="' + label + '" class="' + classes + '" score=' + Math.round(score);
    }

    const composer = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [contenteditable], [role="textbox"], .ProseMirror'))
      .filter((element, index, all) => all.indexOf(element) === index)
      .filter(visible)
      .sort((left, right) => right.getBoundingClientRect().bottom - left.getBoundingClientRect().bottom)[0];

    if (!composer) {
      return { found: false, label: 'no visible Claude composer found' };
    }

    const composerBox = composerControlBox(composer);
    const overlapsComposerBox = (rect) => rect.left < composerBox.right + 80 &&
      rect.right > composerBox.left - 16 &&
      rect.top < composerBox.bottom + 70 &&
      rect.bottom > composerBox.top - 30;

    const candidates = Array.from(document.querySelectorAll('button, [role="button"]'))
      .filter((button, index, all) => all.indexOf(button) === index)
      .filter((button) => visible(button) && enabled(button))
      .map((button) => {
        const rect = button.getBoundingClientRect();
        const text = textFor(button);
        const sendStyle = /send|submit|arrow|paper|plane|up|message/.test(text);
        const filledStyle = /black|primary|filled|send|submit|bg-|background|accent/.test(text);
        const excluded = /attach|attachment|paperclip|clip|file|upload|model|settings|menu|sidebar|side panel|user|account|avatar|microphone|voice|dictate/.test(text);
        const proximity = Math.max(0, 240 - Math.abs((rect.left + rect.right) / 2 - composerBox.right));
        let score = rect.right;
        score += proximity;
        score += Math.min(rect.width * rect.height, 3600) / 20;
        if (sendStyle) score += 1000;
        if (filledStyle) score += 500;
        if (button.querySelector('svg,path')) score += 140;
        if (excluded) score -= 2500;

        return {
          button,
          rect,
          text,
          classes: String(button.getAttribute('class') || ''),
          backgroundColor: getComputedStyle(button).backgroundColor,
          score,
          excluded,
        };
      })
      .filter((candidate) => !candidate.excluded)
      .filter((candidate) => candidate.rect.width >= 18 && candidate.rect.height >= 18 && candidate.rect.width <= 90 && candidate.rect.height <= 90)
      .filter((candidate) => overlapsComposerBox(candidate.rect))
      .sort((left, right) => right.score - left.score);

    const selected = candidates[0];

    if (!selected) {
      return {
        found: false,
        label: 'no visible button inside or adjacent to Claude composer box',
        candidateCount: 0,
        selectedIndex: undefined,
        composerBox: {
          x: composerBox.x,
          y: composerBox.y,
          width: composerBox.width,
          height: composerBox.height
        },
        candidates: [],
      };
    }

    return {
      found: true,
      label: labelFor(selected.button, selected.score),
      candidateCount: candidates.length,
      selectedIndex: 0,
      x: selected.rect.x + selected.rect.width / 2,
      y: selected.rect.y + selected.rect.height / 2,
      composerBox: {
        x: composerBox.x,
        y: composerBox.y,
        width: composerBox.width,
        height: composerBox.height
      },
      boundingBox: {
        x: selected.rect.x,
        y: selected.rect.y,
        width: selected.rect.width,
        height: selected.rect.height
      },
      candidates: candidates.map((candidate, index) => ({
        index,
        tag: candidate.button.tagName.toLowerCase(),
        text: candidate.text.replace(/\\s+/g, ' ').trim().slice(0, 180),
        classes: candidate.classes.replace(/\\s+/g, ' ').trim().slice(0, 220),
        x: candidate.rect.x,
        y: candidate.rect.y,
        width: candidate.rect.width,
        height: candidate.rect.height,
        centerX: candidate.rect.x + candidate.rect.width / 2,
        centerY: candidate.rect.y + candidate.rect.height / 2,
        backgroundColor: candidate.backgroundColor,
        score: candidate.score,
      })),
    };
  })()`);
}

async function clickElementAtPoint(page: Page, x: number, y: number, strategy: 'target-events' | 'form-submit') {
  return page.evaluate<boolean>(`(() => {
    const x = ${JSON.stringify(x)};
    const y = ${JSON.stringify(y)};
    const strategy = ${JSON.stringify(strategy)};

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

    const element = document.elementFromPoint(x, y);
    const target = element?.closest?.('button, [role="button"]') || element;
    if (!target) return false;

    if (strategy === 'form-submit') {
      const form = target.closest?.('form');
      if (!form) return false;
      const submitEvent = new SubmitEvent('submit', {
        bubbles: true,
        cancelable: true,
        composed: true,
        submitter: target instanceof HTMLElement ? target : null
      });
      const notCancelled = form.dispatchEvent(submitEvent);
      if (notCancelled && typeof form.requestSubmit === 'function') {
        try {
          form.requestSubmit(target instanceof HTMLElement ? target : undefined);
        } catch {
          form.requestSubmit();
        }
      }
      return true;
    }

    if (typeof target.focus === 'function') target.focus();
    try {
      target.dispatchEvent(new PointerEvent('pointerdown', { ...eventOptions(), pointerId: 1, pointerType: 'mouse', isPrimary: true }));
      target.dispatchEvent(new MouseEvent('mousedown', eventOptions()));
      target.dispatchEvent(new PointerEvent('pointerup', { ...eventOptions(), pointerId: 1, pointerType: 'mouse', isPrimary: true }));
      target.dispatchEvent(new MouseEvent('mouseup', eventOptions()));
      target.dispatchEvent(new MouseEvent('click', eventOptions()));
    } catch {
      target.dispatchEvent(new MouseEvent('mousedown', eventOptions()));
      target.dispatchEvent(new MouseEvent('mouseup', eventOptions()));
      target.dispatchEvent(new MouseEvent('click', eventOptions()));
    }
    if (typeof target.click === 'function') target.click();
    return true;
  })()`);
}

async function submitState(
  page: Page,
  submittedPrompt: string,
  initialComposerLength: number,
  beforeResponse: string,
): Promise<ClaudeSubmitState> {
  const currentComposerText = await composerText(page);
  const composerCleared = currentComposerText.trim().length < Math.max(3, initialComposerLength * 0.25);
  const diagnostics = await claudeResponseDiagnostics(page, submittedPrompt);
  const currentResponse = evaluateClaudeCandidateText(diagnostics.selectedText, submittedPrompt).accepted
    ? cleanClaudeResponseText(diagnostics.selectedText)
    : '';
  const responseChanged = currentResponse.length > 0 && currentResponse !== beforeResponse;

  return {
    composerCleared,
    generationStarted: diagnostics.stop.visible || diagnostics.respondingVisible,
    responseChanged,
  };
}

function submitAccepted(state: ClaudeSubmitState) {
  return state.composerCleared || state.generationStarted || state.responseChanged;
}

function logSubmitStrategyResult(strategy: string, state: ClaudeSubmitState) {
  console.log(
    `Claude submit strategy result: ${strategy} ` +
    `composerCleared=${state.composerCleared ? 'yes' : 'no'} ` +
    `generationStarted=${state.generationStarted ? 'yes' : 'no'} ` +
    `responseChanged=${state.responseChanged ? 'yes' : 'no'}`,
  );
}

async function extractNormalized(page: Page, question: string, elapsedSeconds: number): Promise<ParticipantResponse> {
  const diagnostics = await claudeResponseDiagnostics(page, question || pendingClaudePrompts.get(page) || '');
  const evaluation = evaluateClaudeCandidateText(diagnostics.selectedText, question || pendingClaudePrompts.get(page) || '');
  const cleanedText = evaluation.accepted ? cleanClaudeResponseText(diagnostics.selectedText) : '';
  const answer = cleanedText || noResponseText;

  return {
    participant: 'claude',
    question,
    answer,
    citations: [],
    elapsedSeconds,
    rawText: diagnostics.selectedText,
    cleanedText: answer,
    rawHtml: await page.content().catch(() => undefined),
  } satisfies ParticipantResponse;
}

export const claudeDriver: ParticipantDriver = {
  name: 'Claude',

  matchParticipant(participant: RunnerParticipant) {
    return participant.id === 'claude' || participant.url.includes('claude.ai');
  },

  async waitForReady(page: Page) {
    await page.waitForLoadState('domcontentloaded');
    await dismissCookieBannerIfPresent(page);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);

    const composer = await findComposer(page);
    await composer.element.evaluate((el) => {
      if (el instanceof HTMLElement) {
        el.focus();
      }
    }).catch(() => undefined);
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
      pendingClaudePrompts.set(page, prompt);
      console.log('Prompt pasted');
      return;
    }

    await composer.element.click();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.insertText(prompt);

    try {
      await verifyComposerContainsPrompt(page, prompt);
      pendingClaudePrompts.set(page, prompt);
      console.log('Prompt pasted');
      return;
    } catch {
      await page.evaluate(`navigator.clipboard.writeText(${JSON.stringify(prompt)})`).catch(() => undefined);
      await composer.element.click();
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');
      await verifyComposerContainsPrompt(page, prompt);
      pendingClaudePrompts.set(page, prompt);
      console.log('Prompt pasted');
    }
  },

  async submitPrompt(page: Page) {
    await dismissCookieBannerIfPresent(page);
    const composer = await findComposer(page);
    const submittedPrompt = pendingClaudePrompts.get(page) || await composerText(page);
    const initialComposerLength = submittedPrompt.trim().length;
    const beforeResponse = await latestClaudeCleanedText(page, submittedPrompt);
    const target = await findClaudeSubmitTarget(page);

    console.log(`Claude composer box: ${JSON.stringify(target.composerBox ?? null)}`);
    console.log(`Claude candidate button count: ${target.candidateCount ?? 0}`);
    (target.candidates ?? []).forEach((candidate) => {
      console.log([
        `Claude candidate button ${candidate.index}:`,
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
        `score=${Math.round(candidate.score)}`,
      ].join(' '));
    });
    console.log(`Claude selected button index: ${target.selectedIndex ?? 'none'}`);
    console.log(`Claude actual submit control: ${target.label}`);

    async function runStrategy(strategy: string, action: () => Promise<void>, waitMs = 1300) {
      await action();
      await page.waitForTimeout(waitMs);
      const state = await submitState(page, submittedPrompt, initialComposerLength, beforeResponse);
      logSubmitStrategyResult(strategy, state);

      if (submitAccepted(state)) {
        console.log(`Submit strategy: Claude ${strategy}`);
        return true;
      }

      return false;
    }

    if (target.found && target.x !== undefined && target.y !== undefined) {
      console.log(`Claude mouse click at: ${target.x},${target.y}`);

      if (await runStrategy('DOM click on chosen button', async () => {
        await clickElementAtPoint(page, target.x!, target.y!, 'target-events');
      })) {
        return;
      }

      if (await runStrategy('Playwright forced coordinate click', async () => {
        await page.mouse.click(target.x!, target.y!);
      })) {
        return;
      }
    }

    const keyboardStrategies = [
      { strategy: 'keyboard Enter', key: 'Enter' },
      { strategy: 'keyboard Ctrl+Enter', key: 'Control+Enter' },
      { strategy: 'keyboard Meta+Enter', key: 'Meta+Enter' },
    ];

    for (const keyboardStrategy of keyboardStrategies) {
      if (await runStrategy(keyboardStrategy.strategy, async () => {
        await composer.element.focus();
        await page.keyboard.press(keyboardStrategy.key);
      })) {
        return;
      }
    }

    if (target.found && target.x !== undefined && target.y !== undefined) {
      if (await runStrategy('low-level pointer/mouse event sequence', async () => {
        await clickElementAtPoint(page, target.x!, target.y!, 'target-events');
      })) {
        return;
      }

      if (await runStrategy('form submit event', async () => {
        await clickElementAtPoint(page, target.x!, target.y!, 'form-submit');
      })) {
        return;
      }
    }

    const artifacts = await saveClaudeDebug(page, 'claude-submit-failed');
    throw new Error([
      'claude-submit-failed',
      target.label,
      `Debug HTML: ${artifacts.htmlPath}`,
      `Debug screenshot: ${artifacts.screenshotPath}`,
    ].join('\n'));
  },

  async waitForCompletion(page: Page) {
    const startedAt = Date.now();
    const hardTimeoutMs = 240000;
    const stableMs = 5000;
    const submittedPrompt = pendingClaudePrompts.get(page) || '';
    let lastText = '';
    let stableSince = Date.now();
    let lastProgressLogAt = 0;

    while (Date.now() - startedAt < hardTimeoutMs) {
      const diagnostics = await claudeResponseDiagnostics(page, submittedPrompt);
      const evaluation = evaluateClaudeCandidateText(diagnostics.selectedText, submittedPrompt);
      const cleanedText = evaluation.accepted ? cleanClaudeResponseText(diagnostics.selectedText) : '';

      if (cleanedText !== lastText) {
        lastText = cleanedText;
        stableSince = Date.now();
      }

      const responseLength = cleanedText.length;
      const stableForMs = Date.now() - stableSince;
      const stopVisible = diagnostics.stop.visible;
      const textStable = responseLength > 5 && stableForMs >= stableMs;

      if (Date.now() - lastProgressLogAt >= 5000) {
        console.log(
          `Claude wait: responseLength=${responseLength} ` +
          `stableMs=${stableForMs} ` +
          `stopVisible=${stopVisible} ` +
          `respondingVisible=${diagnostics.respondingVisible} ` +
          `candidateCount=${diagnostics.candidateCount} ` +
          `preview=${diagnostics.selectedPreview || '(none)'}`,
        );
        console.log(`Claude stop candidate: ${diagnostics.stop.candidate || 'none'}`);
        console.log(`Claude selected candidate preview: ${diagnostics.selectedPreview || '(none)'}`);
        if (!evaluation.accepted && diagnostics.selectedText) {
          console.log(`Claude rejected candidate reason: ${evaluation.reason ?? 'unknown'} ${diagnostics.selectedPreview}`);
        }
        diagnostics.rejectedTop.forEach((candidate) => {
          console.log(`Claude rejected candidate reason: ${candidate.reason} ${candidate.preview}`);
        });
        lastProgressLogAt = Date.now();
      }

      if (textStable && !stopVisible && !diagnostics.respondingVisible) {
        return;
      }

      await page.waitForTimeout(500);
    }

    const artifacts = await saveClaudeDebug(page, 'claude-response-not-found');
    throw new Error([
      'Timed out waiting for Claude completion.',
      `Debug HTML: ${artifacts.htmlPath}`,
      `Debug screenshot: ${artifacts.screenshotPath}`,
    ].join('\n'));
  },

  async extractResponse(page: Page) {
    const response = await extractNormalized(page, pendingClaudePrompts.get(page) || '', 0);
    return response.answer;
  },

  async extractParticipantResponse(page: Page, context: { question: string; elapsedSeconds: number }) {
    return extractNormalized(page, context.question, context.elapsedSeconds);
  },

  async extractNormalizedResponse(page: Page, context: { question: string; elapsedSeconds: number }) {
    return extractNormalized(page, context.question, context.elapsedSeconds);
  },
};
