import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ElementHandle, Page } from 'playwright';
import type { ParticipantDriver } from './base.js';
import {
  cleanGeminiResponseText,
  evaluateGeminiCandidateText,
} from './geminiFiltering.js';
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
  '[class*="message-content"]',
  '[class*="markdown"]',
  '[class*="prose"]',
  'article',
  'main p',
  'main li',
  'main div',
];

const pendingGeminiPrompts = new WeakMap<Page, string>();
let geminiDetectorStartupLogged = false;

type ComposerKind = 'textarea' | 'contenteditable' | 'role=textbox';

type ComposerMatch = {
  element: ElementHandle<Element>;
  selector: string;
  kind: ComposerKind;
};

type GeminiResponseDiagnostics = {
  candidateCount: number;
  selectedText: string;
  selectedCleanedText: string;
  selectedPreview: string;
  selectedGeometry?: { x: number; y: number; width: number; height: number };
  topPreviews: string[];
  rejectedTop: Array<{ reason: string; preview: string }>;
  stop: GeminiStopDiagnostics;
};

type GeminiStopDiagnostics = {
  visible: boolean;
  candidate: string;
};

export function buildGeminiResponseDetectorScript(submittedPrompt = '') {
  const script = String.raw`(() => {
    const selectors = ${JSON.stringify(responseSelectors)};
    const promptNeedle = ${JSON.stringify(submittedPrompt.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 160))};

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

    function normalize(text) {
      return text.replace(/\s+/g, ' ').trim().toLowerCase();
    }

    function cleanText(text) {
      const seen = new Set();
      return String(text || '')
        .replace(/\r/g, '\n')
        .split(/\n|\s{2,}/)
        .map((line) => line.trim())
        .map((line) => line.replace(/^\s*gemini said\b\s*/i, '').trim())
        .filter(Boolean)
        .filter((line) => !chromeText(line))
        .filter((line) => !/^say exactly:/i.test(line))
        .filter((line) => !/^which response is more helpful/i.test(line))
        .filter((line) => !/^(choice|response)\s+[ab]\b/i.test(line))
        .filter((line) => !/^https?:\/\//i.test(line))
        .filter((line) => {
          const normalized = normalize(line);
          if (seen.has(normalized)) return false;
          seen.add(normalized);
          return true;
        })
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    function chromeText(text) {
      const normalized = normalize(text);
      return normalized.length === 0 ||
        [
          'share',
          'feedback',
          'copy',
          'export',
          'google apps',
          'sign in',
          'source',
          'sources',
          'related',
          'show all',
          'more',
          'listen',
          'thumbs up',
          'thumbs down',
          'which response is more helpful?',
          'choice a',
          'choice b',
          'response a',
          'response b',
          'gemini',
          'new chat',
          'recent',
          'activity',
          'settings',
          'help',
          'notebook',
          'notebooks',
          'saved info',
          'extensions',
          'apps',
          'menu',
          'upgrade'
        ].includes(normalized) ||
        normalized.includes('conversation with gemini') ||
        normalized.includes('gemini is ai and can make mistakes') ||
        normalized.includes('you said') ||
        normalized.includes('double-check response') ||
        normalized.includes('modify response') ||
        normalized.includes('view other drafts') ||
        normalized.includes('google apps') ||
        normalized.includes('gemini apps activity') ||
        normalized.includes('notebooklm') ||
        normalized.includes('saved info') ||
        normalized.includes('upgrade');
    }

    function promptOnly(text) {
      if (!promptNeedle) return false;
      const normalized = normalize(text);
      return normalized === promptNeedle ||
        (normalized.includes(promptNeedle) && normalized.length <= promptNeedle.length + 180);
    }

    function candidateBox(candidate) {
      return 'x=' + Math.round(candidate.left) +
        ' y=' + Math.round(candidate.top) +
        ' width=' + Math.round(candidate.width) +
        ' height=' + Math.round(candidate.height);
    }

    function centralResponseGeometry(candidate) {
      return candidate.left >= 150 &&
        candidate.width >= 100 &&
        candidate.width <= 900;
    }

    function rejectionReason(candidate) {
      if (candidate.cleanedText.length <= 0) return 'empty-after-clean';
      if (promptOnly(candidate.cleanedText)) return 'submitted-prompt-only';
      if (chromeText(candidate.text) || chromeText(candidate.cleanedText)) return 'known-gemini-chrome';
      if (candidate.width > 900) return 'page-or-conversation-parent-container';
      if (candidate.left < 80 && candidate.width <= 120) return 'left-navigation-container';
      if (candidate.insideExcludedArea && !centralResponseGeometry(candidate)) return 'navigation-or-sidebar-container';
      if (!centralResponseGeometry(candidate)) return 'outside-central-response-column';
      return '';
    }

    const candidatesBeforeFiltering = selectors
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .filter((element, index, all) => all.indexOf(element) === index)
      .filter((element) => {
        const text = String(element.textContent || '').trim();
        return visible(element) &&
          !element.closest('nav, footer, header, aside, button, [role="button"], textarea, [contenteditable], [role="textbox"]') &&
          text.length > 0;
      })
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
          text,
          cleanedText: cleanText(text),
          hasAssistantActions: Array.from(document.querySelectorAll('button, [role="button"], [aria-label], [title]'))
            .filter(visible)
            .some((button) => {
              const buttonRect = button.getBoundingClientRect();
              const nearby = buttonRect.top >= rect.top - 40 &&
                buttonRect.top <= rect.bottom + 140 &&
                buttonRect.left >= rect.left - 100 &&
                buttonRect.right <= rect.right + 180;
              if (!nearby) return false;
              const text = [
                button.textContent,
                button.getAttribute('aria-label'),
                button.getAttribute('title')
              ].filter(Boolean).join(' ').toLowerCase();
              return /copy|share|more|thumb|like|dislike|feedback|export|listen/.test(text);
            }),
          insideExcludedArea: Boolean(element.closest('[role="navigation"], [class*="sidebar" i], [class*="history" i], [class*="drawer" i]')),
        };
      })
      .filter((candidate) => candidate.text.length > 0);

    const rejectedTop = candidatesBeforeFiltering
      .map((candidate) => ({
        reason: rejectionReason(candidate),
        preview: candidateBox(candidate) + ' ' + candidate.text.slice(0, 140),
      }))
      .filter((candidate) => candidate.reason)
      .slice(0, 8);

    const candidates = candidatesBeforeFiltering
      .filter((candidate) => !rejectionReason(candidate))
      .sort((left, right) => {
        if (left.hasAssistantActions !== right.hasAssistantActions) {
          return left.hasAssistantActions ? -1 : 1;
        }
        const cleanedSizeDelta = left.cleanedText.length - right.cleanedText.length;
        if (Math.abs(cleanedSizeDelta) > 20) return cleanedSizeDelta;
        const areaDelta = (left.width * left.height) - (right.width * right.height);
        if (Math.abs(areaDelta) > 1000) return areaDelta;
        return right.bottom - left.bottom;
      });

    const selected = candidates[0];

    return {
      candidateCount: candidates.length,
      selectedText: selected?.text || '',
      selectedCleanedText: selected?.cleanedText || '',
      selectedPreview: selected ? candidateBox(selected) + ' ' + selected.cleanedText.slice(0, 140) : '',
      selectedGeometry: selected
        ? { x: selected.left, y: selected.top, width: selected.width, height: selected.height }
        : undefined,
      topPreviews: candidates.slice(0, 5).map((candidate) => candidateBox(candidate) + ' ' + candidate.cleanedText.slice(0, 140)),
      rejectedTop,
    };
  })()`;

  if (script.includes('__name')) {
    throw new Error('Gemini detector script unexpectedly contains __name');
  }

  return script;
}

async function saveGeminiDebug(page: Page, name: string) {
  const debugDir = path.join(process.cwd(), 'debug');
  await mkdir(debugDir, { recursive: true });

  const htmlPath = path.join(debugDir, `${name}.html`);
  const screenshotPath = path.join(debugDir, `${name}.png`);

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

async function geminiStopDiagnostics(page: Page): Promise<GeminiStopDiagnostics> {
  return page.evaluate<GeminiStopDiagnostics>(`(() => {
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
      .filter((el) => {
        const enabled = !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true';
        return visible(el) && enabled;
      })
      .find((el) => [
          el.textContent,
          el.getAttribute('aria-label'),
          el.getAttribute('title')
        ].filter(Boolean).some((value) => {
          const label = normalize(value);
          return label === 'stop' || label === 'stop generating';
        }));

    return {
      visible: Boolean(selected),
      candidate: selected ? debugLabel(selected) : ''
    };
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

async function geminiResponseDiagnostics(page: Page, submittedPrompt = '') {
  if (!geminiDetectorStartupLogged) {
    console.log('Gemini evaluate block: geminiResponseDiagnostics');
    geminiDetectorStartupLogged = true;
  }

  const [diagnostics, stop] = await Promise.all([
    page.evaluate<Omit<GeminiResponseDiagnostics, 'stop'>>(buildGeminiResponseDetectorScript(submittedPrompt)),
    geminiStopDiagnostics(page),
  ]);

  return {
    ...diagnostics,
    stop,
  };
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
      pendingGeminiPrompts.set(page, prompt);
      console.log('Prompt pasted');
      return;
    }

    await composer.element.click();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.insertText(prompt);

    try {
      await verifyComposerContainsPrompt(page, prompt);
      pendingGeminiPrompts.set(page, prompt);
      console.log('Prompt pasted');
      return;
    } catch {
      await page.evaluate(
        `navigator.clipboard.writeText(${JSON.stringify(prompt)})`,
      ).catch(() => undefined);
      await composer.element.click();
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');
      await verifyComposerContainsPrompt(page, prompt);
      pendingGeminiPrompts.set(page, prompt);
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
      const submittedPrompt = pendingGeminiPrompts.get(page) || '';
      let lastText = '';
      let stableSince = Date.now();
      let lastProgressLogAt = 0;
      let liveDebugSaved = false;

      while (Date.now() - startedAt < hardTimeoutMs) {
        const diagnostics = await geminiResponseDiagnostics(page, submittedPrompt);
        const evaluation = evaluateGeminiCandidateText(diagnostics.selectedText, submittedPrompt);
        const text = evaluation.accepted
          ? diagnostics.selectedCleanedText
          : '';

        if (text !== lastText) {
          lastText = text;
          stableSince = Date.now();
        }

        const stopVisible = diagnostics.stop.visible;
        const responseLength = text.length;
        const currentStableMs = Date.now() - stableSince;
        const textStable = responseLength > 5 && currentStableMs >= stableMs;

        if (Date.now() - lastProgressLogAt >= 5000) {
          console.log(
            `Gemini wait: responseLength=${responseLength} ` +
            `stableMs=${currentStableMs} ` +
            `stopVisible=${stopVisible} ` +
            `candidateCount=${diagnostics.candidateCount} ` +
            `preview=${diagnostics.selectedPreview || '(none)'}`,
          );
          console.log(`Gemini selected candidate preview: ${diagnostics.selectedPreview || '(none)'}`);
          console.log(`Gemini stop candidate: ${diagnostics.stop.candidate || 'none'}`);
          if (!evaluation.accepted && diagnostics.selectedText) {
            console.log(`Gemini rejected candidate reason: ${evaluation.reason ?? 'unknown'} ${diagnostics.selectedPreview}`);
          }
          diagnostics.topPreviews.forEach((preview, index) => {
            console.log(`Gemini top candidate ${index + 1}: ${preview || '(empty)'}`);
          });
          diagnostics.rejectedTop.forEach((candidate) => {
            console.log(`Gemini rejected candidate reason: ${candidate.reason} ${candidate.preview}`);
          });
          lastProgressLogAt = Date.now();
        }

        if (!stopVisible && responseLength === 0 && Date.now() - startedAt > 10000 && !liveDebugSaved) {
          const artifacts = await saveGeminiDebug(page, 'gemini-live-debug');
          console.log(`Gemini live debug HTML: ${artifacts.htmlPath}`);
          console.log(`Gemini live debug screenshot: ${artifacts.screenshotPath}`);
          liveDebugSaved = true;
        }

        if (!stopVisible && textStable) {
          return;
        }

        await page.waitForTimeout(500);
      }

      const artifacts = await saveGeminiDebug(page, 'gemini-response-not-found');
      throw new Error([
        'Timed out waiting for Gemini completion.',
        `Debug HTML: ${artifacts.htmlPath}`,
        `Debug screenshot: ${artifacts.screenshotPath}`,
      ].join('\n'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Gemini waitForCompletion failed: ${message}`);
      throw error;
    }
  },

  async extractResponse(page: Page) {
    const response = await this.extractParticipantResponse?.(page, {
      question: '',
      elapsedSeconds: 0,
    });

    return response?.answer ?? '';
  },

  async extractParticipantResponse(page: Page, context) {
    const question = context.question || pendingGeminiPrompts.get(page) || '';
    const diagnostics = await geminiResponseDiagnostics(page, question);
    const evaluation = evaluateGeminiCandidateText(diagnostics.selectedText, question);
    const cleanedText = evaluation.accepted
      ? diagnostics.selectedCleanedText || cleanGeminiResponseText(diagnostics.selectedText)
      : '';

    return {
      participant: this.name.toLowerCase(),
      question: context.question,
      answer: cleanedText,
      citations: [],
      elapsedSeconds: context.elapsedSeconds,
      rawText: diagnostics.selectedText,
      cleanedText,
      rawHtml: await page.content().catch(() => undefined),
    };
  },
};
