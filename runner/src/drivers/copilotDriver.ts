import type { Page } from 'playwright';
import type { RunnerParticipant } from '../participants.js';
import type { ParticipantResponse } from '../types.js';
import { evaluateCopilotCandidateText, isCopilotShellOrStatusText } from './copilotFiltering.js';
import { createGenericAiDriver } from './genericAiDriver.js';

const noResponseText = '[No response text detected]';
const pendingCopilotPrompts = new WeakMap<Page, string>();

type CopilotSendTarget = {
  found: boolean;
  label: string;
  x?: number;
  y?: number;
  candidateCount?: number;
  selectedIndex?: number;
};

type CopilotAnswerDiagnostics = {
  selectedText: string;
  selectedPreview: string;
  candidateCount: number;
};

function isCopilotParticipant(participant: RunnerParticipant) {
  if (participant.id === 'copilot') {
    return true;
  }

  try {
    const parsed = new URL(participant.url);
    return parsed.hostname.toLowerCase() === 'copilot.microsoft.com' ||
      (parsed.hostname.toLowerCase() === 'm365.cloud.microsoft' && parsed.pathname.startsWith('/chat'));
  } catch {
    return false;
  }
}

function cleanCopilotText(text: string) {
  const seen = new Set<string>();

  return text
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(new chat|search|library|share|copy|feedback|regenerate|retry|sources?|related|settings|show all|more|microsoft|copilot)$/i.test(line))
    .filter((line) => !isCopilotShellOrStatusText(line))
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
        return rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden';
      });

    if (!composer) return '';
    if ('value' in composer) return String(composer.value || '');
    return String(composer.innerText || composer.textContent || '');
  })()`);
}

async function generationStarted(page: Page) {
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
          element.getAttribute('class')
        ].filter(Boolean).join(' ').toLowerCase();

        const enabled = !element.hasAttribute('disabled') && element.getAttribute('aria-disabled') !== 'true';
        const hasActiveStopSemantics = text.includes('stop generating') ||
          text.includes('stop responding') ||
          text.includes('cancel response') ||
          text.includes('cancel generation');
        const staticStoppedStatus = text.includes('stopped generating');

        return enabled &&
          !staticStoppedStatus &&
          (hasActiveStopSemantics ||
            text.includes('generating response') ||
            text.includes('loading'));
      });
  })()`);
}

async function findCopilotSendTarget(page: Page): Promise<CopilotSendTarget> {
  return page.evaluate<CopilotSendTarget>(`(() => {
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
          svg.getAttribute('data-testid'),
          svg.getAttribute('class'),
          svg.getAttribute('d')
        ].filter(Boolean).join(' ')).join(' ')
      ].filter(Boolean).join(' ').toLowerCase();
    }

    function composerControlBox(composer) {
      let current = composer;
      let best = composer;

      for (let depth = 0; current && depth < 8; depth += 1) {
        const rect = current.getBoundingClientRect();

        if (rect.width >= best.getBoundingClientRect().width && rect.height <= 220) {
          best = current;
        }

        current = current.parentElement;
      }

      return best.getBoundingClientRect();
    }

    const composer = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [contenteditable], [role="textbox"]'))
      .filter(visible)
      .sort((left, right) => right.getBoundingClientRect().bottom - left.getBoundingClientRect().bottom)[0];

    if (!composer) {
      return { found: false, label: 'no visible Copilot composer' };
    }

    const composerBox = composerControlBox(composer);
    const overlapsComposer = (rect) => rect.left < composerBox.right + 80 &&
      rect.right > composerBox.left - 40 &&
      rect.top < composerBox.bottom + 60 &&
      rect.bottom > composerBox.top - 40;

    const candidates = Array.from(document.querySelectorAll('button, [role="button"]'))
      .filter((button, index, all) => all.indexOf(button) === index)
      .filter((button) => visible(button) && enabled(button))
      .map((button) => {
        const rect = button.getBoundingClientRect();
        const text = textFor(button);
        const explicit = text.includes('send') ||
          text.includes('submit') ||
          text.includes('arrow') ||
          text.includes('up') ||
          text.includes('paper') ||
          text.includes('message');
        const hasSvg = Boolean(button.querySelector('svg,path'));
        const rightScore = rect.left;
        const colorText = getComputedStyle(button).backgroundColor.toLowerCase();
        const purpleOrAccent = colorText.includes('rgb(92') ||
          colorText.includes('rgb(70') ||
          colorText.includes('rgb(91') ||
          colorText.includes('purple');

        return {
          button,
          rect,
          text,
          explicit,
          hasSvg,
          purpleOrAccent,
          rightScore,
        };
      })
      .filter((candidate) => overlapsComposer(candidate.rect))
      .sort((left, right) => {
        if (left.explicit !== right.explicit) return left.explicit ? -1 : 1;
        if (left.purpleOrAccent !== right.purpleOrAccent) return left.purpleOrAccent ? -1 : 1;
        if (left.hasSvg !== right.hasSvg) return left.hasSvg ? -1 : 1;
        return right.rightScore - left.rightScore;
      });

    const selected = candidates[0];

    if (!selected) {
      return {
        found: false,
        label: 'no visible send button near Copilot composer',
        candidateCount: candidates.length,
      };
    }

    return {
      found: true,
      label: selected.text.slice(0, 180) || '(icon button)',
      x: selected.rect.left + selected.rect.width / 2,
      y: selected.rect.top + selected.rect.height / 2,
      candidateCount: candidates.length,
      selectedIndex: 0,
    };
  })()`);
}

async function domClickAtPoint(page: Page, x: number, y: number) {
  return page.evaluate<boolean>(`(() => {
    const x = ${JSON.stringify(x)};
    const y = ${JSON.stringify(y)};
    const element = document.elementFromPoint(x, y);
    const target = element?.closest?.('button, [role="button"]') || element;

    if (!target) return false;
    target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, composed: true }));
    target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, composed: true }));
    target.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, composed: true }));
    target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, composed: true }));
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));

    if (typeof target.click === 'function') {
      target.click();
    }

    return true;
  })()`);
}

async function submitAccepted(page: Page, initialComposerLength: number, beforeAnswer: string) {
  const currentComposerText = await composerText(page);
  const composerCleared = currentComposerText.trim().length < Math.max(3, initialComposerLength * 0.25);
  const generationVisible = await generationStarted(page);
  const currentAnswer = await latestCopilotAnswerDiagnostics(page, pendingCopilotPrompts.get(page) || '');
  const responseChanged = currentAnswer.selectedText.length > 0 && currentAnswer.selectedText !== beforeAnswer;

  console.log(`Copilot composer cleared: ${composerCleared ? 'yes' : 'no'}`);
  console.log(`Copilot generation started: ${generationVisible ? 'yes' : 'no'}`);

  return composerCleared || generationVisible || responseChanged;
}

async function latestCopilotAnswerDiagnostics(page: Page, submittedPrompt = ''): Promise<CopilotAnswerDiagnostics> {
  return page.evaluate<CopilotAnswerDiagnostics>(`(() => {
    const promptNeedle = ${JSON.stringify(submittedPrompt.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 160))};
    const selectors = [
      '[data-testid*="message" i]',
      '[data-testid*="chat" i]',
      '[class*="message" i]',
      '[class*="assistant" i]',
      '[class*="response" i]',
      '[class*="markdown" i]',
      '[class*="prose" i]',
      'article',
      'main p',
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
          '[class*="search" i]',
          '[class*="library" i]',
          '[class*="nav" i]',
          '[class*="sidebar" i]',
          '[class*="menu" i]',
          '[class*="file" i]',
          '[class*="drop" i]'
        ].join(','))
        .forEach((child) => child.remove());

      return String(clone.textContent || '')
        .replace(/\\r/g, '\\n')
        .replace(/[ \\t]+/g, ' ')
        .trim();
    }

    function rejectedCandidateText(text) {
      const normalized = normalize(text);
      const shellOrStatus = normalized.length === 0 ||
        normalized === 'new chat' ||
        normalized === 'search' ||
        normalized === 'library' ||
        normalized === 'stopped generating' ||
        normalized === 'copilot said:' ||
        normalized.includes('new chatsearchlibrary') ||
        normalized.includes('what can i help with?') ||
        normalized.includes('drop your files here') ||
        normalized.includes('message copilot') ||
        normalized.includes('copilot is an ai and may make mistakes') ||
        normalized.includes('copilot can make mistakes') ||
        normalized.includes('terms') && normalized.includes('privacy') ||
        normalized.includes('microsoft 365 copilot');

      if (shellOrStatus) return true;
      if (!promptNeedle) return false;
      return normalized === promptNeedle ||
        (normalized.includes(promptNeedle) && normalized.length <= promptNeedle.length + 160);
    }

    function candidateBox(candidate) {
      return 'x=' + Math.round(candidate.left) +
        ' y=' + Math.round(candidate.top) +
        ' width=' + Math.round(candidate.width) +
        ' height=' + Math.round(candidate.height);
    }

    const candidates = selectors
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .filter((element, index, all) => all.indexOf(element) === index)
      .filter((element) => visible(element) && !element.closest('nav, footer, header, aside, button, [role="button"], textarea, [contenteditable], [role="textbox"]'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const text = readableText(element);
        return {
          bottom: rect.bottom,
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          textLength: text.length,
          text,
        };
      })
      .filter((candidate) => candidate.text.length > 0)
      .filter((candidate) => !rejectedCandidateText(candidate.text))
      .filter((candidate) => candidate.left >= 120 && candidate.width >= 80 && candidate.width <= 1100)
      .sort((left, right) => {
        const sizeDelta = left.textLength - right.textLength;
        if (Math.abs(sizeDelta) > 20) return sizeDelta;
        return right.bottom - left.bottom;
      });

    const selected = candidates[0];

    return {
      selectedText: selected?.text || '',
      selectedPreview: selected ? candidateBox(selected) + ' ' + selected.text.slice(0, 120) : '',
      candidateCount: candidates.length,
    };
  })()`);
}

const baseCopilotDriver = createGenericAiDriver({
  participantId: 'copilot',
  name: 'Copilot',
  hostPattern: 'm365.cloud.microsoft',
  minimumAnswerLength: 6,
});

export const copilotDriver = {
  ...baseCopilotDriver,

  matchParticipant(participant: RunnerParticipant) {
    return isCopilotParticipant(participant);
  },

  async pastePrompt(page: Page, prompt: string) {
    await baseCopilotDriver.pastePrompt?.call(this, page, prompt);
    pendingCopilotPrompts.set(page, prompt);
  },

  async submitPrompt(page: Page) {
    const initialComposerText = await composerText(page);
    const initialComposerLength = initialComposerText.trim().length;
    const beforeAnswer = (await latestCopilotAnswerDiagnostics(page, pendingCopilotPrompts.get(page) || '')).selectedText;
    const target = await findCopilotSendTarget(page);

    console.log(`Copilot submit candidate count: ${target.candidateCount ?? 0}`);

    if (target.found && typeof target.x === 'number' && typeof target.y === 'number') {
      console.log(`Copilot submit candidate: ${target.label}`);
      await domClickAtPoint(page, target.x, target.y).catch(() => false);
      await page.waitForTimeout(1500);

      if (await submitAccepted(page, initialComposerLength, beforeAnswer)) {
        console.log('Submit strategy: Copilot DOM click near composer');
        return;
      }

      console.log(`Copilot coordinate click at: ${Math.round(target.x)},${Math.round(target.y)}`);
      await page.mouse.click(target.x, target.y);
      await page.waitForTimeout(1500);

      if (await submitAccepted(page, initialComposerLength, beforeAnswer)) {
        console.log('Submit strategy: Copilot coordinate send button');
        return;
      }
    }

    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    if (await submitAccepted(page, initialComposerLength, beforeAnswer)) {
      console.log('Submit strategy: Copilot keyboard Enter');
      return;
    }

    throw new Error('copilot-submit-failed');
  },

  async waitForCompletion(page: Page) {
    const startedAt = Date.now();
    const hardTimeoutMs = 180000;
    const stableMs = 5000;
    const prompt = pendingCopilotPrompts.get(page) || '';
    let lastText = '';
    let stableSince = Date.now();

    while (Date.now() - startedAt < hardTimeoutMs) {
      const diagnostics = await latestCopilotAnswerDiagnostics(page, prompt);
      const cleanedText = cleanCopilotText(diagnostics.selectedText);

      if (cleanedText !== lastText) {
        lastText = cleanedText;
        stableSince = Date.now();
      }

      const stopVisible = await generationStarted(page);
      const stableForMs = Date.now() - stableSince;

      console.log(
        `Copilot wait: responseLength=${cleanedText.length} ` +
        `stableMs=${stableForMs} ` +
        `stopVisible=${stopVisible} ` +
        `candidateCount=${diagnostics.candidateCount} ` +
        `preview=${diagnostics.selectedPreview || '(none)'}`,
      );

      if (cleanedText.length > 5 && stableForMs >= stableMs && !stopVisible) {
        return;
      }

      await page.waitForTimeout(500);
    }

    throw new Error('Timed out waiting for Copilot completion.');
  },

  async extractResponse(page: Page) {
    const response = await this.extractParticipantResponse?.(page, {
      question: pendingCopilotPrompts.get(page) || '',
      elapsedSeconds: 0,
    });

    return response?.answer || noResponseText;
  },

  async extractParticipantResponse(page: Page, context: { question: string; elapsedSeconds: number }) {
    const diagnostics = await latestCopilotAnswerDiagnostics(page, context.question || pendingCopilotPrompts.get(page) || '');
    const evaluation = evaluateCopilotCandidateText(
      diagnostics.selectedText,
      context.question || pendingCopilotPrompts.get(page) || '',
    );
    const cleanedText = evaluation.accepted ? cleanCopilotText(diagnostics.selectedText) : '';
    const answer = cleanedText || noResponseText;

    return {
      participant: 'copilot',
      question: context.question,
      answer,
      citations: [],
      elapsedSeconds: context.elapsedSeconds,
      rawText: diagnostics.selectedText,
      cleanedText: answer,
      rawHtml: await page.content().catch(() => undefined),
    } satisfies ParticipantResponse;
  },

  async extractNormalizedResponse(page: Page, context: { question: string; elapsedSeconds: number }) {
    return this.extractParticipantResponse(page, context);
  },
};
