import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Page } from 'playwright';
import type { ParticipantResponse } from '../types.js';
import { createGenericAiDriver } from './genericAiDriver.js';
import {
  evaluateGrokCandidate,
  evaluateGrokOverlayCandidate,
  evaluateGrokTerminalErrorText,
  normalizeGrokCandidateText,
  type GrokOverlayCandidate,
} from './grokFiltering.js';

const pendingGrokPrompts = new WeakMap<Page, string>();
const lastOverlayDetected = new WeakMap<Page, boolean>();

type GrokSubmitTarget = {
  found: boolean;
  label: string;
  candidateCount?: number;
  selectedIndex?: number;
  x?: number;
  y?: number;
  composerBox?: { x: number; y: number; width: number; height: number };
};

type GrokResponseDiagnostics = {
  candidateCount: number;
  rejectedTop: Array<{
    preview: string;
    reason: string;
  }>;
  candidateDump: Array<{
    preview: string;
    reason: string;
    wordCount: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  selectedCandidate?: {
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  selectedText: string;
  selectedPreview: string;
};

type GrokStopDiagnostics = {
  visible: boolean;
  candidate: string;
};

type GrokTerminalError = {
  found: boolean;
  reason?: string;
  message?: string;
};

async function saveGrokSubmitFailedDebug(page: Page) {
  const debugDir = path.join(process.cwd(), 'debug');
  await mkdir(debugDir, { recursive: true });

  const htmlPath = path.join(debugDir, 'grok-submit-failed.html');
  const screenshotPath = path.join(debugDir, 'grok-submit-failed.png');

  await writeFile(htmlPath, await page.content().catch(() => ''), 'utf8');
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);

  return { htmlPath, screenshotPath };
}

async function collectGrokOverlayCandidates(page: Page) {
  return page.evaluate<GrokOverlayCandidate[]>(`(() => {
    function visible(el) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    }

    function inViewport(el) {
      const rect = el.getBoundingClientRect();
      return rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth;
    }

    function attributeText(el) {
      return [
        el.getAttribute('id'),
        el.getAttribute('name'),
        el.getAttribute('placeholder'),
        el.getAttribute('aria-label'),
        el.getAttribute('title'),
        el.getAttribute('data-testid'),
        el.getAttribute('class'),
      ].filter(Boolean).join(' ').toLowerCase();
    }

    function ancestorAttributeText(el) {
      const parts = [];
      let current = el.parentElement;
      for (let depth = 0; current && depth < 8; depth += 1) {
        parts.push([
          current.getAttribute('id'),
          current.getAttribute('aria-label'),
          current.getAttribute('data-testid'),
          current.getAttribute('class'),
        ].filter(Boolean).join(' '));
        current = current.parentElement;
      }
      return parts.join(' ').toLowerCase();
    }

    const candidates = [];

    Array.from(document.querySelectorAll('input, textarea'))
      .filter(visible)
      .forEach((element) => {
        const text = attributeText(element);
        if (!text.includes('search')) return;
        const modalAncestor = element.closest('[role="dialog"], [aria-modal="true"]');
        candidates.push({
          attributeText: text,
          ancestorAttributeText: ancestorAttributeText(element),
          inModal: Boolean(modalAncestor && visible(modalAncestor)),
          inViewport: inViewport(element),
        });
      });

    Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"]'))
      .filter(visible)
      .forEach((element) => {
        const text = String(element.textContent || '').toLowerCase();
        const hasSearchContext = text.includes('search') &&
          (text.includes('history') || text.includes('conversation') || element.querySelector('input, textarea'));
        if (!hasSearchContext) return;
        candidates.push({
          attributeText: attributeText(element) + ' ' + text.slice(0, 200),
          ancestorAttributeText: ancestorAttributeText(element),
          inModal: true,
          inViewport: inViewport(element),
        });
      });

    return candidates;
  })()`);
}

async function dismissBlockingOverlayIfPresent(page: Page) {
  const candidates = await collectGrokOverlayCandidates(page);
  const blocking = candidates.find((candidate) => evaluateGrokOverlayCandidate(candidate).blocking);
  const wasDetected = lastOverlayDetected.get(page) ?? false;

  if (!blocking) {
    if (wasDetected) {
      lastOverlayDetected.set(page, false);
    }
    return false;
  }

  if (!wasDetected) {
    console.log(`Grok blocking overlay detected: ${blocking.attributeText.slice(0, 160)}`);
  }
  lastOverlayDetected.set(page, true);
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.evaluate<boolean>(`(() => {
    function visible(el) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    }

    const dialog = Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"]')).filter(visible)[0];
    const scope = dialog || document;
    const closeButton = Array.from(scope.querySelectorAll('button, [role="button"], [aria-label], [title]'))
      .filter(visible)
      .find((element) => {
        const text = [
          element.textContent,
          element.getAttribute('aria-label'),
          element.getAttribute('title'),
          element.getAttribute('data-testid'),
          element.getAttribute('class'),
        ].filter(Boolean).join(' ').trim().toLowerCase();
        return text === 'x' ||
          text === '×' ||
          /\\b(close|dismiss)\\b/.test(text);
      });

    if (!closeButton) return false;
    closeButton.click();
    return true;
  })()`).catch(() => false);
  await page.waitForTimeout(500);

  const remaining = await collectGrokOverlayCandidates(page);
  const stillBlocking = remaining.some((candidate) => evaluateGrokOverlayCandidate(candidate).blocking);
  lastOverlayDetected.set(page, stillBlocking);

  if (!stillBlocking) {
    console.log('Grok blocking overlay dismissed');
  }

  return true;
}

async function grokGenerationStarted(page: Page) {
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

    return Array.from(document.querySelectorAll('button, [role="button"], [aria-label], [title], [data-testid], [class]'))
      .filter(visible)
      .some((element) => {
        const text = [
          element.textContent,
          element.getAttribute('aria-label'),
          element.getAttribute('title'),
          element.getAttribute('data-testid'),
          element.getAttribute('class'),
        ].filter(Boolean).join(' ').toLowerCase();
        return text.includes('stop') ||
          text.includes('generating') ||
          text.includes('loading') ||
          text.includes('thinking');
      });
  })()`);
}

async function grokStopOrGeneratingDiagnostics(page: Page) {
  return page.evaluate<GrokStopDiagnostics>(`(() => {
    function visible(el) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    }

    function textFor(element) {
      return [
        element.textContent,
        element.getAttribute('aria-label'),
        element.getAttribute('title'),
        element.getAttribute('data-testid'),
        element.getAttribute('class'),
      ].filter(Boolean).join(' ').toLowerCase();
    }

    const composer = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [contenteditable], [role="textbox"]'))
      .filter(visible)
      .sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0];
    const composerRect = composer ? composer.getBoundingClientRect() : null;

    function nearComposer(element) {
      if (!composerRect) return false;
      const rect = element.getBoundingClientRect();
      return rect.top >= composerRect.top - 120 &&
        rect.bottom <= composerRect.bottom + 120 &&
        rect.left >= composerRect.left - 80 &&
        rect.right <= composerRect.right + 120;
    }

    const candidate = Array.from(document.querySelectorAll('button, [role="button"], [aria-label], [title], [data-testid]'))
      .filter(visible)
      .find((element) => {
        const text = textFor(element);
        const explicitStop = text.includes('stop generating') ||
          text.includes('stop generation') ||
          text === 'stop' ||
          text.includes('aria-label stop') ||
          text.includes('data-testid stop');
        const explicitGenerating = text.includes('generating response') ||
          text.includes('generating answer') ||
          text.includes('response loading');
        return explicitStop ||
          explicitGenerating ||
          (nearComposer(element) && (text.includes('stop') || text.includes('generating')));
      });

    if (!candidate) {
      return { visible: false, candidate: '' };
    }

    return {
      visible: true,
      candidate: [
        candidate.textContent,
        candidate.getAttribute('aria-label'),
        candidate.getAttribute('title'),
        candidate.getAttribute('data-testid'),
        candidate.getAttribute('class'),
      ].filter(Boolean).join(' ').replace(/\\s+/g, ' ').slice(0, 180),
    };
  })()`);
}

async function grokStopOrGeneratingVisible(page: Page) {
  const diagnostics = await grokStopOrGeneratingDiagnostics(page);

  if (diagnostics.visible) {
    console.log(`Grok stop candidate: ${diagnostics.candidate || '(empty)'}`);
  }

  return diagnostics.visible;
}

type GrokTerminalErrorScan = {
  texts: Array<{ text: string; top: number }>;
  promptBottom: number;
};

const noPromptBubbleSentinel = -1e9;

async function collectGrokTerminalErrorTexts(
  page: Page,
  submittedPrompt: string,
): Promise<GrokTerminalErrorScan> {
  const promptNeedle = normalizeGrokCandidateText(submittedPrompt).slice(0, 120);

  return page.evaluate<GrokTerminalErrorScan>(`(() => {
    const promptNeedle = ${JSON.stringify(promptNeedle)};

    function visible(el) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    }

    function normalizedText(el) {
      return String(el.textContent || '').replace(/\\s+/g, ' ').trim();
    }

    // Error banners are short standalone blocks in the conversation area; skip
    // composer, buttons, and navigation chrome so transcript/prompt content that
    // merely mentions error phrases cannot trigger a terminal state.
    const texts = Array.from(document.querySelectorAll('p, div, span, [role="alert"]'))
      .filter(visible)
      .filter((element) => !element.closest([
        'button',
        '[role="button"]',
        'textarea',
        '[contenteditable]',
        '[role="textbox"]',
        'nav',
        'aside',
        'header',
        'footer',
        '[role="navigation"]',
        '[class*="sidebar" i]',
        '[class*="history" i]'
      ].join(',')))
      .map((element) => ({
        text: normalizedText(element),
        top: element.getBoundingClientRect().top,
      }))
      .filter((entry) => entry.text.length > 0 && entry.text.length <= 240)
      .slice(0, 300);

    let promptBottom = ${noPromptBubbleSentinel};

    if (promptNeedle) {
      Array.from(document.querySelectorAll('p, div, span'))
        .filter(visible)
        .forEach((element) => {
          const normalized = normalizedText(element).toLowerCase();
          if (!normalized.includes(promptNeedle)) return;
          if (normalized.length > promptNeedle.length + 200) return;
          const rect = element.getBoundingClientRect();
          if (rect.bottom > promptBottom) promptBottom = rect.bottom;
        });
    }

    return { texts, promptBottom };
  })()`);
}

// Only error text positioned at/below the current prompt bubble counts as terminal;
// capacity errors left in the conversation from earlier turns must not fail new asks.
async function grokTerminalError(page: Page, submittedPrompt: string): Promise<GrokTerminalError> {
  const scan = await collectGrokTerminalErrorTexts(page, submittedPrompt);
  const belowPrompt = scan.promptBottom === noPromptBubbleSentinel
    ? scan.texts
    : scan.texts.filter((entry) => entry.top >= scan.promptBottom - 10);

  for (const entry of belowPrompt) {
    const evaluation = evaluateGrokTerminalErrorText(entry.text, submittedPrompt);

    if (evaluation.found) {
      return evaluation;
    }
  }

  return { found: false };
}

async function grokResponseDiagnostics(page: Page, submittedPrompt = '') {
  return page.evaluate<GrokResponseDiagnostics>(`(() => {
    const selectors = [
      'article',
      '[data-testid*="message" i]',
      '[class*="message" i]',
      '[class*="markdown" i]',
      '[class*="prose" i]',
      '[class*="response" i]',
      'p',
      'div',
      'span'
    ];
    const promptNeedle = ${JSON.stringify(submittedPrompt.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 120))};

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
          'textarea',
          '[contenteditable="true"]',
          '[contenteditable]',
          '[role="textbox"]',
          '[class*="composer" i]',
          '[class*="input" i]',
          '[class*="copy" i]',
          '[class*="regenerate" i]',
          '[class*="like" i]',
          '[class*="dislike" i]',
          '[class*="share" i]',
          '[class*="feedback" i]',
          '[class*="menu" i]'
        ].join(','))
        .forEach((child) => child.remove());

      return String(clone.textContent || '')
        .replace(/\\r/g, '\\n')
        .replace(/[ \\t]+/g, ' ')
        .trim();
    }

    function normalize(text) {
      return text.replace(/\\s+/g, ' ').trim().toLowerCase();
    }

    function chromeOrSuggestionText(text) {
      const normalized = normalize(text);
      return /^(share|copy|feedback|regenerate|retry|thinking|sources?|related|sign in|sign up|new chat|settings|show all|more)$/i.test(text.trim()) ||
        normalized.includes("explore xai's mission") ||
        normalized.includes('discover xai products') ||
        normalized.includes('how does grok differ from chatgpt') ||
        normalized.includes("what is xai's mission") ||
        normalized.includes('say exactly: grok is ok') ||
        normalized.includes('thought for 1s') ||
        normalized.includes('thought for') ||
        normalized.includes('search') && normalized.includes('history');
    }

    function explicitSidebarHistoryChrome(text) {
      const normalized = normalize(text);
      return normalized.includes('search conversations') ||
        normalized.includes('search history') ||
        normalized.includes('conversation history') ||
        normalized.includes('chat history') ||
        normalized.includes('new chat') ||
        normalized.includes('recent chats');
    }

    function promptOnly(text) {
      if (!promptNeedle) return false;
      const normalized = normalize(text);
      const onlyPrompt = normalized.includes(promptNeedle) &&
        normalized.length <= promptNeedle.length + 120;
      return onlyPrompt || normalized === promptNeedle;
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
        '[class*="drawer" i]',
        '[class*="sider" i]',
        '[data-testid*="sidebar" i]',
        '[data-testid*="history" i]',
        '[data-testid*="suggest" i]',
        '[class*="suggest" i]'
      ].join(',')));
    }

    function nearbyAssistantActions(el) {
      const rect = el.getBoundingClientRect();
      const buttons = Array.from(document.querySelectorAll('button, [role="button"], [aria-label], [title], [data-testid], [class]'))
        .filter(visible)
        .filter((button) => {
          const buttonRect = button.getBoundingClientRect();
          const nearby = buttonRect.top >= rect.top - 40 &&
            buttonRect.top <= rect.bottom + 140 &&
            buttonRect.left >= rect.left - 80 &&
            buttonRect.right <= rect.right + 160;

          if (!nearby) return false;

          const text = [
            button.textContent,
            button.getAttribute('aria-label'),
            button.getAttribute('title'),
            button.getAttribute('data-testid'),
            button.getAttribute('class')
          ].filter(Boolean).join(' ').toLowerCase();

          return text.includes('copy') ||
            text.includes('regenerate') ||
            text.includes('thumb') ||
            text.includes('like') ||
            text.includes('dislike') ||
            text.includes('share');
        });

      return buttons.length > 0;
    }

    function candidateBox(candidate) {
      return 'x=' + Math.round(candidate.left) +
        ' y=' + Math.round(candidate.top) +
        ' width=' + Math.round(candidate.width) +
        ' height=' + Math.round(candidate.height);
    }

    function wordCount(text) {
      const normalized = normalize(text);
      if (!normalized) return 0;
      return normalized.split(' ').filter(Boolean).length;
    }

    function centralAnswerGeometry(candidate) {
      return candidate.left >= 120 && candidate.width >= 100 && candidate.width <= 900;
    }

    function rejectionReason(candidate) {
      if (candidate.insideExcludedArea && !centralAnswerGeometry(candidate)) return 'sidebar-history-overlay-container';
      if (candidate.insideExcludedArea && explicitSidebarHistoryChrome(candidate.text)) return 'sidebar-history-overlay-container';
      if (candidate.left < 120) return 'outside-central-chat-left';
      if (candidate.width < 100 || candidate.width > 900) return 'outside-central-chat-width';
      if (candidate.text.length <= 5) return 'too-short';
      if (chromeOrSuggestionText(candidate.text)) return 'grok-chrome-suggestion-or-error';
      if (promptOnly(candidate.text)) return 'submitted-prompt-only';
      return '';
    }

    const candidatesBeforeFiltering = selectors
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .filter((element, index, all) => all.indexOf(element) === index)
      .filter((element) => visible(element) && !element.closest('button, [role="button"], textarea, [contenteditable], [role="textbox"]'))
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
          hasAssistantActions: nearbyAssistantActions(element),
          insideExcludedArea: insideExcludedArea(element),
          text,
        };
      })
      .filter((candidate) => candidate.text.length > 0);

    const rejectedTop = candidatesBeforeFiltering
      .map((candidate) => ({
        preview: candidateBox(candidate) + ' ' + candidate.text.slice(0, 120),
        reason: rejectionReason(candidate),
      }))
      .filter((candidate) => candidate.reason)
      .slice(0, 5);

    const candidateDump = candidatesBeforeFiltering
      .map((candidate) => ({
        preview: candidateBox(candidate) + ' ' + candidate.text.slice(0, 180),
        reason: rejectionReason(candidate),
        wordCount: wordCount(candidate.text),
        x: candidate.left,
        y: candidate.top,
        width: candidate.width,
        height: candidate.height,
      }))
      .slice(0, 40);

    const candidates = candidatesBeforeFiltering
      .filter((candidate) => !rejectionReason(candidate))
      .sort((left, right) => {
        if (left.hasAssistantActions !== right.hasAssistantActions) {
          return left.hasAssistantActions ? -1 : 1;
        }
        const centralDelta = Math.abs((left.left + left.right) / 2 - window.innerWidth / 2) -
          Math.abs((right.left + right.right) / 2 - window.innerWidth / 2);
        if (Math.abs(centralDelta) > 80) return centralDelta;
        const sizeDelta = left.textLength - right.textLength;
        if (Math.abs(sizeDelta) > 10) return sizeDelta;
        return right.bottom - left.bottom;
      });

    const selectedText = candidates[0]?.text || '';
    const rejectedCandidates = candidateDump.filter((candidate) => candidate.reason);

    return {
      candidateCount: candidates.length,
      rejectedTop,
      candidateDump,
      selectedText,
      selectedCandidate: candidates[0]
        ? {
          text: selectedText,
          x: candidates[0].left,
          y: candidates[0].top,
          width: candidates[0].width,
          height: candidates[0].height,
        }
        : undefined,
      selectedPreview: candidates[0]
        ? candidateBox(candidates[0]) + ' ' + selectedText.slice(0, 120)
        : '',
    };
  })()`);
}

function cleanGrokText(text: string) {
  const seen = new Set<string>();

  return text
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(share|copy|feedback|regenerate|retry|thinking|sources?|related|sign in|sign up|new chat|settings|show all|more)$/i.test(line))
    .filter((line) => !/thought for \d+s?/i.test(line))
    .filter((line) => !/explore xai's mission|discover xai products|how does grok differ from chatgpt|what is xai's mission|say exactly: grok is ok/i.test(line))
    .filter((line) => !/please try again soon|upgrade for higher priority access|rate limit|too many requests|something went wrong|network error|unable to generate|failed to generate/i.test(line))
    .filter((line) => {
      const normalized = line.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function findGrokSubmitTarget(page: Page): Promise<GrokSubmitTarget> {
  return page.evaluate<GrokSubmitTarget>(`(() => {
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
          svg.getAttribute('d'),
        ].filter(Boolean).join(' ')).join(' '),
      ].filter(Boolean).join(' ').toLowerCase();
    }

    function composerControlBox(composer) {
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

    function labelFor(el, score) {
      const label = [
        el.getAttribute('aria-label'),
        el.getAttribute('title'),
        el.getAttribute('data-testid'),
        (el.textContent || '').trim(),
      ].filter(Boolean).join(' | ').replace(/\\s+/g, ' ').slice(0, 120);
      const classes = String(el.getAttribute('class') || '').replace(/\\s+/g, ' ').slice(0, 180);
      return 'selector=' + el.tagName.toLowerCase() + ' label="' + label + '" class="' + classes + '" score=' + Math.round(score);
    }

    const composer = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [contenteditable], [role="textbox"]'))
      .filter((element, index, all) => all.indexOf(element) === index)
      .filter(visible)
      .find((element) => {
        const text = element.value || element.innerText || element.textContent || '';
        return text.trim().length > 0;
      }) || Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [contenteditable], [role="textbox"]'))
        .filter(visible)[0];

    if (!composer) {
      return { found: false, label: 'no visible Grok composer found' };
    }

    const composerBox = composerControlBox(composer);
    const overlapsComposerBox = (rect) => rect.left < composerBox.right + 4 &&
      rect.right > composerBox.left - 4 &&
      rect.top < composerBox.bottom + 4 &&
      rect.bottom > composerBox.top - 4;

    const candidates = Array.from(document.querySelectorAll('button, [role="button"]'))
      .filter((button, index, all) => all.indexOf(button) === index)
      .filter((button) => visible(button) && enabled(button))
      .map((button) => {
        const rect = button.getBoundingClientRect();
        const text = textFor(button);
        const sendStyle = /send|submit|arrow|up|plane/.test(text);
        const blackStyle = /black|primary|send|submit|foreground/.test(text);
        const excluded = /attach|attachment|paperclip|clip|file|model|settings|menu|sidebar|side panel|user|account|avatar|microphone|voice/.test(text);
        let score = rect.right;
        score += Math.min(rect.width * rect.height, 3600) / 20;
        if (sendStyle) score += 900;
        if (blackStyle) score += 500;
        if (button.querySelector('svg')) score += 120;
        if (excluded) score -= 2000;

        return { button, rect, score, excluded };
      })
      .filter((candidate) => !candidate.excluded)
      .filter((candidate) => overlapsComposerBox(candidate.rect))
      .sort((left, right) => right.score - left.score);

    const selected = candidates[0];

    if (!selected) {
      return {
        found: false,
        label: 'no visible button inside or overlapping Grok composer box',
        candidateCount: 0,
        composerBox: {
          x: composerBox.x,
          y: composerBox.y,
          width: composerBox.width,
          height: composerBox.height,
        },
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
        height: composerBox.height,
      },
    };
  })()`);
}

function composerCleared(beforeLength: number, afterText: string) {
  return afterText.trim().length < Math.max(3, beforeLength * 0.25);
}

const baseGrokDriver = createGenericAiDriver({
  participantId: 'grok',
  name: 'Grok',
  hostPattern: 'grok.com',
  answerSelectors: [
    '[class*="message"]',
    '[class*="assistant"]',
    '[class*="markdown"]',
    '[class*="prose"]',
    '[data-testid*="message"]',
    'article',
    'main',
  ],
  chromeLinePattern: /^(share|copy|feedback|regenerate|retry|thinking|sources?|related|sign in|sign up|new chat|settings|show all|more)$/i,
  async submitPrompt(page, helpers) {
    await dismissBlockingOverlayIfPresent(page);
    const composer = await helpers.findComposer();
    const initialText = await helpers.composerText();
    const initialLength = initialText.trim().length;
    const target = await findGrokSubmitTarget(page);

    console.log(`Grok composer box: ${JSON.stringify(target.composerBox ?? null)}`);
    console.log(`Grok candidate button count: ${target.candidateCount ?? 0}`);
    console.log(`Grok selected button index: ${target.selectedIndex ?? 'none'}`);

    if (target.found && target.x !== undefined && target.y !== undefined) {
      console.log(`Grok mouse click at: ${target.x},${target.y}`);
      await page.mouse.click(target.x, target.y);
      await page.waitForTimeout(1200);
      await dismissBlockingOverlayIfPresent(page);

      const afterClickText = await helpers.composerText();
      const clearedAfterClick = composerCleared(initialLength, afterClickText);
      const generationAfterClick = await grokGenerationStarted(page) || await helpers.hasStopControl();
      console.log(`Grok composer cleared after click: ${clearedAfterClick ? 'yes' : 'no'}`);
      console.log(`Grok generation started: ${generationAfterClick ? 'yes' : 'no'}`);

      if (clearedAfterClick || generationAfterClick) {
        console.log('Submit strategy: Grok coordinate mouse click');
        return;
      }
    }

    await dismissBlockingOverlayIfPresent(page);
    await composer.element.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1200);
    await dismissBlockingOverlayIfPresent(page);

    let currentText = await helpers.composerText();
    if (composerCleared(initialLength, currentText) || await grokGenerationStarted(page) || await helpers.hasStopControl()) {
      console.log('Submit strategy: Grok keyboard Enter');
      return;
    }

    await dismissBlockingOverlayIfPresent(page);
    await composer.element.focus();
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(1200);
    await dismissBlockingOverlayIfPresent(page);

    currentText = await helpers.composerText();
    if (composerCleared(initialLength, currentText) || await grokGenerationStarted(page) || await helpers.hasStopControl()) {
      console.log('Submit strategy: Grok keyboard Ctrl+Enter');
      return;
    }

    const artifacts = await saveGrokSubmitFailedDebug(page);
    throw new Error([
      'grok-submit-failed',
      `Debug HTML: ${artifacts.htmlPath}`,
      `Debug screenshot: ${artifacts.screenshotPath}`,
    ].join('\n'));
  },
});

export const grokDriver = {
  ...baseGrokDriver,

  async waitForReady(page: Page) {
    await dismissBlockingOverlayIfPresent(page);
    await baseGrokDriver.waitForReady(page);
    await dismissBlockingOverlayIfPresent(page);
  },

  async pastePrompt(page: Page, prompt: string) {
    await dismissBlockingOverlayIfPresent(page);
    await baseGrokDriver.pastePrompt?.call(this, page, prompt);
    pendingGrokPrompts.set(page, prompt);
    await dismissBlockingOverlayIfPresent(page);
  },

  async submitPrompt(page: Page) {
    await dismissBlockingOverlayIfPresent(page);
    await baseGrokDriver.submitPrompt?.call(this, page);
    await dismissBlockingOverlayIfPresent(page);
  },

  async waitForCompletion(page: Page) {
    await dismissBlockingOverlayIfPresent(page);
    const submittedPrompt = pendingGrokPrompts.get(page) || '';
    const startedAt = Date.now();
    const hardTimeoutMs = 180000;
    const stableMs = 5000;
    let lastText = '';
    let stableSince = Date.now();

    while (Date.now() - startedAt < hardTimeoutMs) {
      await dismissBlockingOverlayIfPresent(page);
      const terminalError = await grokTerminalError(page, submittedPrompt);

      if (terminalError.found) {
        console.log(`Grok terminal error detected: ${terminalError.reason} ${terminalError.message ?? ''}`);
        throw new Error(`${terminalError.reason}: ${terminalError.message ?? 'Grok returned a terminal error state.'}`);
      }

      const diagnostics = await grokResponseDiagnostics(page, submittedPrompt);
      const candidateEvaluation = diagnostics.selectedCandidate
        ? evaluateGrokCandidate(diagnostics.selectedCandidate, submittedPrompt)
        : { accepted: false, reason: 'no-selected-candidate' };
      const cleanedText = candidateEvaluation.accepted ? cleanGrokText(diagnostics.selectedText) : '';

      if (cleanedText !== lastText) {
        lastText = cleanedText;
        stableSince = Date.now();
      }

      const stopDiagnostics = await grokStopOrGeneratingDiagnostics(page);
      const stopVisible = stopDiagnostics.visible;
      const stableForMs = Date.now() - stableSince;
      const responseLength = cleanedText.length;

      console.log(
        `Grok wait: responseLength=${responseLength} ` +
        `stableMs=${stableForMs} ` +
        `stopVisible=${stopVisible} ` +
        `candidateCount=${diagnostics.candidateCount} ` +
        `preview=${diagnostics.selectedPreview || '(none)'}`,
      );
      console.log(`Grok stop candidate: ${stopDiagnostics.candidate || '(none)'}`);
      console.log(`Grok selected candidate preview: ${diagnostics.selectedPreview || '(none)'}`);
      if (!candidateEvaluation.accepted && diagnostics.selectedText) {
        console.log(`Grok rejected candidate reason: ${candidateEvaluation.reason ?? 'unknown'} ${diagnostics.selectedPreview}`);
      }
      diagnostics.rejectedTop.forEach((candidate) => {
        console.log(`Grok rejected candidate reason: ${candidate.reason} ${candidate.preview}`);
      });

      if (responseLength > 5 && stableForMs >= stableMs && !stopVisible) {
        return;
      }

      await page.waitForTimeout(500);
    }

    throw new Error('Timed out waiting for Grok completion.');
  },

  async extractResponse(page: Page) {
    await dismissBlockingOverlayIfPresent(page);
    const diagnostics = await grokResponseDiagnostics(page, pendingGrokPrompts.get(page) || '');
    const evaluation = diagnostics.selectedCandidate
      ? evaluateGrokCandidate(diagnostics.selectedCandidate, pendingGrokPrompts.get(page) || '')
      : { accepted: false };
    return evaluation.accepted ? cleanGrokText(diagnostics.selectedText) : '';
  },

  async extractParticipantResponse(page: Page, context: { question: string; elapsedSeconds: number }) {
    await dismissBlockingOverlayIfPresent(page);
    const diagnostics = await grokResponseDiagnostics(page, context.question || pendingGrokPrompts.get(page) || '');
    const evaluation = diagnostics.selectedCandidate
      ? evaluateGrokCandidate(diagnostics.selectedCandidate, context.question || pendingGrokPrompts.get(page) || '')
      : { accepted: false };
    const cleanedText = evaluation.accepted ? cleanGrokText(diagnostics.selectedText) : '';

    return {
      participant: 'grok',
      question: context.question,
      answer: cleanedText,
      citations: [],
      elapsedSeconds: context.elapsedSeconds,
      rawText: diagnostics.selectedText,
      cleanedText,
      rawHtml: await page.content().catch(() => undefined),
    } satisfies ParticipantResponse;
  },

  async extractNormalizedResponse(page: Page, context: { question: string; elapsedSeconds: number }) {
    await dismissBlockingOverlayIfPresent(page);
    return this.extractParticipantResponse(page, context);
  },
};
