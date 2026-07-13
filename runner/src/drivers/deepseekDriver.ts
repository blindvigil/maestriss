import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Page } from 'playwright';
import type { ParticipantResponse } from '../types.js';
import { createGenericAiDriver } from './genericAiDriver.js';
import {
  deepSeekHistoryMarkers,
  evaluateDeepSeekCandidateText,
} from './deepseekFiltering.js';

const pendingDeepSeekPrompts = new WeakMap<Page, string>();

type DeepSeekSubmitTarget = {
  found: boolean;
  label: string;
  candidateCount?: number;
  selectedIndex?: number;
  x?: number;
  y?: number;
  composerBox?: { x: number; y: number; width: number; height: number };
};

type DeepSeekResponseDiagnostics = {
  candidateCount: number;
  rejectedTop: Array<{
    preview: string;
    reason: string;
  }>;
  selectedText: string;
  selectedPreview: string;
};

async function saveDeepSeekSubmitFailedDebug(page: Page) {
  const debugDir = path.join(process.cwd(), 'debug');
  await mkdir(debugDir, { recursive: true });

  const htmlPath = path.join(debugDir, 'deepseek-submit-failed.html');
  const screenshotPath = path.join(debugDir, 'deepseek-submit-failed.png');

  await writeFile(htmlPath, await page.content().catch(() => ''), 'utf8');
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);

  return { htmlPath, screenshotPath };
}

async function saveDeepSeekResponseNotFoundDebug(page: Page) {
  const debugDir = path.join(process.cwd(), 'debug');
  await mkdir(debugDir, { recursive: true });

  const htmlPath = path.join(debugDir, 'deepseek-response-not-found.html');
  const screenshotPath = path.join(debugDir, 'deepseek-response-not-found.png');

  await writeFile(htmlPath, await page.content().catch(() => ''), 'utf8');
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);

  return { htmlPath, screenshotPath };
}

async function dismissBlockingOverlayIfPresent(page: Page) {
  const detected = await page.evaluate<boolean>(`(() => {
    function visible(el) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    }

    return Array.from(document.querySelectorAll('input, textarea, [placeholder], [aria-label], [role="dialog"], [class], [data-testid]'))
      .filter(visible)
      .some((element) => {
        const text = [
          element.textContent,
          element.getAttribute('placeholder'),
          element.getAttribute('aria-label'),
          element.getAttribute('title'),
          element.getAttribute('data-testid'),
        ].filter(Boolean).join(' ').toLowerCase();
        return text.includes('search chat content');
      });
  })()`);

  if (!detected) {
    return false;
  }

  console.log('DeepSeek blocking overlay detected');
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

    const closeButton = Array.from(document.querySelectorAll('button, [role="button"], [aria-label], [title]'))
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
          text.includes('close') ||
          text.includes('dismiss');
      });

    if (!closeButton) return false;
    closeButton.click();
    return true;
  })()`).catch(() => false);
  await page.waitForTimeout(500);
  console.log('DeepSeek blocking overlay dismissed');
  return true;
}

async function deepSeekGenerationStarted(page: Page) {
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
          text.includes('deepthink') ||
          text.includes('thinking');
      });
  })()`);
}

async function deepSeekStopOrGeneratingVisible(page: Page) {
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

async function deepSeekResponseDiagnostics(page: Page, submittedPrompt = '') {
  return page.evaluate<DeepSeekResponseDiagnostics>(`(() => {
    const selectors = [
      'article',
      '[data-testid*="message" i]',
      '[class*="message" i]',
      '[class*="markdown" i]',
      '[class*="prose" i]',
      '[class*="response" i]',
      'p',
      'li'
    ];
    const promptNeedle = ${JSON.stringify(submittedPrompt.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 120))};
    const historyMarkers = ${JSON.stringify(deepSeekHistoryMarkers)};

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

    function chromeText(text) {
      return /^(share|copy|feedback|regenerate|retry|deepthink|search|sources?|related|sign in|sign up|new chat|settings|show all|more)$/i.test(text.trim());
    }

    function candidateBox(candidate) {
      return 'x=' + Math.round(candidate.left) +
        ' y=' + Math.round(candidate.top) +
        ' width=' + Math.round(candidate.width) +
        ' height=' + Math.round(candidate.height);
    }

    function insideSidebarOrHistory(el) {
      return Boolean(el.closest([
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
        '[data-testid*="history" i]'
      ].join(',')));
    }

    function historyText(text) {
      const normalized = normalize(text);
      return historyMarkers.some((marker) => normalized.includes(marker));
    }

    function promptOnly(text) {
      if (!promptNeedle) return false;
      const normalized = normalize(text);
      const onlyPrompt = normalized.includes(promptNeedle) &&
        normalized.length <= promptNeedle.length + 120;
      return onlyPrompt || normalized === promptNeedle;
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

    const composerElement = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [contenteditable], [role="textbox"]'))
      .filter(visible)
      .sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0];
    const composerRect = composerElement ? composerElement.getBoundingClientRect() : null;
    const composerLeft = composerRect ? composerRect.left : null;
    const composerWidth = composerRect ? composerRect.width : null;

    // Keep in sync with deepSeekGeometryRejectionReason in deepseekFiltering.ts:
    // geometry is composer-relative supporting evidence, never absolute x cutoffs.
    function geometryRejectionReason(candidate) {
      if (candidate.insideSidebar) return 'sidebar-history-container';
      if (composerLeft !== null && candidate.right < composerLeft - 24) return 'left-of-conversation-column';
      const widthCap = composerWidth !== null ? composerWidth + 64 : Math.min(window.innerWidth * 0.72, 920);
      if (candidate.width > widthCap) return 'page-or-transcript-parent-container';
      return '';
    }

    function rejectionReason(candidate) {
      if (candidate.text.length <= 5) return 'too-short';
      const geometryReason = geometryRejectionReason(candidate);
      if (geometryReason) return geometryReason;
      if (historyText(candidate.text)) return 'history-sidebar-marker';
      if (chromeText(candidate.text)) return 'known-deepseek-chrome';
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
          insideSidebar: insideSidebarOrHistory(element),
          text,
        };
      });

    const rejectedTop = candidatesBeforeFiltering
      .map((candidate) => ({
        preview: candidateBox(candidate) + ' ' + candidate.text.slice(0, 120),
        reason: rejectionReason(candidate)
      }))
      .filter((candidate) => candidate.reason)
      .slice(0, 5);

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

    return {
      candidateCount: candidates.length,
      rejectedTop,
      selectedText,
      selectedPreview: candidates[0]
        ? candidateBox(candidates[0]) + ' ' + selectedText.slice(0, 120)
        : '',
    };
  })()`);
}

function cleanDeepSeekText(text: string) {
  const seen = new Set<string>();

  return text
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(share|copy|feedback|regenerate|retry|deepthink|search|sources?|related|sign in|sign up|new chat|settings|show all|more)$/i.test(line))
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

async function findDeepSeekSubmitTarget(page: Page): Promise<DeepSeekSubmitTarget> {
  return page.evaluate<DeepSeekSubmitTarget>(`(() => {
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
      return { found: false, label: 'no visible DeepSeek composer found' };
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
        const sendStyle = /send|submit|arrow|up|upload|plane/.test(text);
        const blueStyle = /blue|primary|send|submit/.test(text);
        const excluded = /attach|attachment|paperclip|clip|file|model|settings|menu|sidebar|side panel|user|account|avatar/.test(text);
        let score = rect.right;
        score += Math.min(rect.width * rect.height, 3600) / 20;
        if (sendStyle) score += 900;
        if (blueStyle) score += 500;
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
        label: 'no visible button inside or overlapping DeepSeek composer box',
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

function composerStillContainsPrompt(composerText: string, promptText: string) {
  const normalizedComposer = composerText.replace(/\s+/g, ' ').trim().toLowerCase();
  const normalizedPrompt = promptText.replace(/\s+/g, ' ').trim().toLowerCase();
  const promptStart = normalizedPrompt.slice(0, Math.min(80, normalizedPrompt.length));

  return promptStart.length > 0 && normalizedComposer.includes(promptStart);
}

const baseDeepseekDriver = createGenericAiDriver({
  participantId: 'deepseek',
  name: 'DeepSeek',
  hostPattern: 'chat.deepseek.com',
  answerSelectors: [
    '[class*="message"]',
    '[class*="assistant"]',
    '[class*="markdown"]',
    '[class*="prose"]',
    '[data-role*="assistant"]',
    'article',
    'main',
  ],
  chromeLinePattern: /^(share|copy|feedback|regenerate|retry|deepthink|search|sources?|related|sign in|sign up|new chat|settings|show all|more)$/i,
  async submitPrompt(page, helpers) {
    await dismissBlockingOverlayIfPresent(page);
    const composer = await helpers.findComposer();
    const initialText = await helpers.composerText();
    const initialLength = initialText.trim().length;

    async function clickDeepSeekCoordinateSubmit(label: string) {
      const target = await findDeepSeekSubmitTarget(page);

      console.log(`DeepSeek composer box: ${JSON.stringify(target.composerBox ?? null)}`);
      console.log(`DeepSeek candidate button count: ${target.candidateCount ?? 0}`);
      console.log(`DeepSeek selected button index: ${target.selectedIndex ?? 'none'}`);

      if (!target.found || target.x === undefined || target.y === undefined) {
        return false;
      }

      console.log(`DeepSeek mouse click at: ${target.x},${target.y}`);
      await page.mouse.click(target.x, target.y);
      await page.waitForTimeout(1200);
      await dismissBlockingOverlayIfPresent(page);

      const afterClickText = await helpers.composerText();
      const clearedAfterClick = composerCleared(initialLength, afterClickText);
      const generationAfterClick = await deepSeekGenerationStarted(page) || await helpers.hasStopControl();
      console.log(`DeepSeek composer cleared after click: ${clearedAfterClick ? 'yes' : 'no'}`);
      console.log(`DeepSeek generation started: ${generationAfterClick ? 'yes' : 'no'}`);

      if (clearedAfterClick || generationAfterClick) {
        console.log(`Submit strategy: DeepSeek ${label}`);
        return true;
      }

      return false;
    }

    if (await clickDeepSeekCoordinateSubmit('coordinate mouse click')) {
      return;
    }

    const afterOverlayText = await helpers.composerText();
    if (composerStillContainsPrompt(afterOverlayText, initialText)) {
      console.log('DeepSeek prompt still present after overlay dismissal; retrying coordinate submit');

      if (await clickDeepSeekCoordinateSubmit('coordinate mouse click retry')) {
        return;
      }
    }

    await dismissBlockingOverlayIfPresent(page);
    await composer.element.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1200);
    await dismissBlockingOverlayIfPresent(page);

    let currentText = await helpers.composerText();
    if (composerCleared(initialLength, currentText) || await deepSeekGenerationStarted(page) || await helpers.hasStopControl()) {
      console.log('Submit strategy: DeepSeek keyboard Enter');
      return;
    }

    await dismissBlockingOverlayIfPresent(page);
    await composer.element.focus();
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(1200);
    await dismissBlockingOverlayIfPresent(page);

    currentText = await helpers.composerText();
    if (composerCleared(initialLength, currentText) || await deepSeekGenerationStarted(page) || await helpers.hasStopControl()) {
      console.log('Submit strategy: DeepSeek keyboard Ctrl+Enter');
      return;
    }

    const artifacts = await saveDeepSeekSubmitFailedDebug(page);
    throw new Error([
      'deepseek-submit-failed',
      `Debug HTML: ${artifacts.htmlPath}`,
      `Debug screenshot: ${artifacts.screenshotPath}`,
    ].join('\n'));
  },
});

export const deepseekDriver = {
  ...baseDeepseekDriver,

  async waitForReady(page: Page) {
    await dismissBlockingOverlayIfPresent(page);
    await baseDeepseekDriver.waitForReady(page);
    await dismissBlockingOverlayIfPresent(page);
  },

  async pastePrompt(page: Page, prompt: string) {
    await dismissBlockingOverlayIfPresent(page);
    await baseDeepseekDriver.pastePrompt?.call(this, page, prompt);
    pendingDeepSeekPrompts.set(page, prompt);
    await dismissBlockingOverlayIfPresent(page);
  },

  async submitPrompt(page: Page) {
    await dismissBlockingOverlayIfPresent(page);
    await baseDeepseekDriver.submitPrompt?.call(this, page);
    await dismissBlockingOverlayIfPresent(page);
  },

  async waitForCompletion(page: Page) {
    await dismissBlockingOverlayIfPresent(page);
    const submittedPrompt = pendingDeepSeekPrompts.get(page) || '';
    const startedAt = Date.now();
    const hardTimeoutMs = 180000;
    const stableMs = 5000;
    let lastText = '';
    let stableSince = Date.now();
    let lastProgressLogAt = 0;

    while (Date.now() - startedAt < hardTimeoutMs) {
      await dismissBlockingOverlayIfPresent(page);
      const diagnostics = await deepSeekResponseDiagnostics(page, submittedPrompt);
      const selectedEvaluation = evaluateDeepSeekCandidateText(diagnostics.selectedText, submittedPrompt);
      const cleanedText = selectedEvaluation.accepted ? cleanDeepSeekText(diagnostics.selectedText) : '';

      if (cleanedText !== lastText) {
        lastText = cleanedText;
        stableSince = Date.now();
      }

      const stopVisible = await deepSeekStopOrGeneratingVisible(page);
      const stableForMs = Date.now() - stableSince;
      const responseLength = cleanedText.length;

      if (Date.now() - lastProgressLogAt >= 5000) {
        console.log(
          `DeepSeek wait: responseLength=${responseLength} ` +
          `stableMs=${stableForMs} ` +
          `stopVisible=${stopVisible} ` +
          `candidateCount=${diagnostics.candidateCount} ` +
          `preview=${diagnostics.selectedPreview || '(none)'}`,
        );
        console.log(`DeepSeek selected candidate preview: ${diagnostics.selectedPreview || '(none)'}`);
        if (!selectedEvaluation.accepted && diagnostics.selectedText) {
          console.log(`DeepSeek rejected candidate reason: ${selectedEvaluation.reason ?? 'unknown'} ${diagnostics.selectedPreview}`);
        }
        diagnostics.rejectedTop.forEach((candidate) => {
          console.log(`DeepSeek rejected candidate reason: ${candidate.reason} ${candidate.preview}`);
        });
        lastProgressLogAt = Date.now();
      }

      if (responseLength > 5 && stableForMs >= stableMs && !stopVisible) {
        return;
      }

      await page.waitForTimeout(500);
    }

    const artifacts = await saveDeepSeekResponseNotFoundDebug(page);
    throw new Error([
      'Timed out waiting for DeepSeek completion.',
      `Debug HTML: ${artifacts.htmlPath}`,
      `Debug screenshot: ${artifacts.screenshotPath}`,
    ].join('\n'));
  },

  async extractResponse(page: Page) {
    await dismissBlockingOverlayIfPresent(page);
    const diagnostics = await deepSeekResponseDiagnostics(page, pendingDeepSeekPrompts.get(page) || '');
    const evaluation = evaluateDeepSeekCandidateText(diagnostics.selectedText, pendingDeepSeekPrompts.get(page) || '');
    return evaluation.accepted ? cleanDeepSeekText(diagnostics.selectedText) : '';
  },

  async extractParticipantResponse(page: Page, context: { question: string; elapsedSeconds: number }) {
    await dismissBlockingOverlayIfPresent(page);
    const diagnostics = await deepSeekResponseDiagnostics(page, context.question || pendingDeepSeekPrompts.get(page) || '');
    const evaluation = evaluateDeepSeekCandidateText(diagnostics.selectedText, context.question || pendingDeepSeekPrompts.get(page) || '');
    const cleanedText = evaluation.accepted ? cleanDeepSeekText(diagnostics.selectedText) : '';

    return {
      participant: 'deepseek',
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
