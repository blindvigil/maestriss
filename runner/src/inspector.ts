import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Page } from 'playwright';
import type { RunnerParticipant } from './participants.js';

export type InspectionResult = {
  currentUrl: string;
  title: string;
  readyState: string;
  counts: {
    textarea: number;
    contenteditable: number;
    roleTextbox: number;
    button: number;
    form: number;
  };
  visibleButtonLabels: string[];
  visibleTextareaPlaceholders: string[];
  visibleTextboxPlaceholders: string[];
  candidateComposerSelectors: string[];
  candidateSendButtons: string[];
  candidateResponseContainers: string[];
  visibleGeneratingIndicators: string[];
  candidateOuterHtml: string[];
  htmlPath: string;
  screenshotPath: string;
};

function debugFileName(participant: RunnerParticipant, extension: 'html' | 'png') {
  return `${participant.id}.${extension}`;
}

export async function inspectParticipantPage(
  page: Page,
  participant: RunnerParticipant,
  runnerRoot: string,
): Promise<InspectionResult> {
  await page.waitForFunction("document.readyState === 'complete'", undefined, {
    timeout: 30000,
  });

  const diagnostics = await page.evaluate<{
    readyState: string;
    counts: InspectionResult['counts'];
    visibleButtonLabels: string[];
    visibleTextareaPlaceholders: string[];
    visibleTextboxPlaceholders: string[];
    candidateComposerSelectors: string[];
    candidateSendButtons: string[];
    candidateResponseContainers: string[];
    visibleGeneratingIndicators: string[];
    candidateOuterHtml: string[];
  }>(`(() => {
    const isVisible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };

    const textFor = (el) => [
      el.textContent,
      el.getAttribute('aria-label'),
      el.getAttribute('title'),
      el.getAttribute('data-testid')
    ].filter(Boolean).join(' ').replace(/\\s+/g, ' ').trim();

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
      '[data-testid*="composer" i]',
      '[data-testid*="input" i]',
      '[class*="composer" i]',
      '[class*="input" i]'
    ];

    const responseSelectors = [
      '[data-testid*="answer" i]',
      '[data-testid*="message" i]',
      '[class*="answer" i]',
      '[class*="assistant" i]',
      '[class*="message" i]',
      '[class*="response" i]',
      '[class*="markdown" i]',
      '[class*="prose" i]',
      'article',
      'main'
    ];

    const uniqueElementsForSelectors = (selectors) => {
      const matches = [];

      selectors.forEach((selector) => {
        let elements = [];

        try {
          elements = Array.from(document.querySelectorAll(selector));
        } catch {
          elements = [];
        }

        elements.forEach((element) => {
          if (!isVisible(element)) return;
          if (matches.some((match) => match.element === element)) return;
          matches.push({ selector, element });
        });
      });

      return matches;
    };

    const candidateComposers = uniqueElementsForSelectors(composerSelectors);

    candidateComposers.forEach(({ element: el }) => {
      el.dataset.maestrissInspectorOutline = el.style.outline;
      el.style.outline = '3px solid red';
      el.style.outlineOffset = '2px';
    });

    const candidateSendButtons = Array.from(document.querySelectorAll('button, [role="button"]'))
      .filter((el) => isVisible(el))
      .filter((el) => {
        const text = textFor(el).toLowerCase();
        const enabled = !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true';
        return enabled && (text.includes('send') || text.includes('submit') || text.includes('arrow') || el.querySelector('svg'));
      })
      .map((el) => textFor(el) || el.outerHTML.slice(0, 160));

    const candidateResponseContainers = uniqueElementsForSelectors(responseSelectors)
      .map(({ selector, element }) => {
        const text = String(element.textContent || '').replace(/\\s+/g, ' ').trim();
        return selector + ': ' + text.slice(0, 180);
      })
      .filter((entry) => entry.length > 0)
      .slice(0, 20);

    const visibleGeneratingIndicators = Array.from(document.querySelectorAll('button, [role="button"], [aria-label], [title], [data-testid], [class]'))
      .filter((el) => isVisible(el))
      .map((el) => textFor(el))
      .filter((text) => /stop|generating|thinking|responding|loading|deepthink/i.test(text))
      .slice(0, 30);

    return {
      readyState: document.readyState,
      counts: {
        textarea: document.querySelectorAll('textarea').length,
        contenteditable: document.querySelectorAll('[contenteditable]').length,
        roleTextbox: document.querySelectorAll('[role="textbox"]').length,
        button: document.querySelectorAll('button').length,
        form: document.querySelectorAll('form').length
      },
      visibleButtonLabels: Array.from(document.querySelectorAll('button'))
        .filter((el) => isVisible(el))
        .map((el) => textFor(el))
        .filter(Boolean),
      visibleTextareaPlaceholders: Array.from(document.querySelectorAll('textarea'))
        .filter((el) => isVisible(el))
        .map((el) => el.getAttribute('placeholder') || '')
        .filter(Boolean),
      visibleTextboxPlaceholders: Array.from(document.querySelectorAll('[role="textbox"]'))
        .filter((el) => isVisible(el))
        .map((el) => el.getAttribute('placeholder') || el.getAttribute('aria-placeholder') || '')
        .filter(Boolean),
      candidateComposerSelectors: candidateComposers.map(({ selector, element }) => {
        const label = [
          element.getAttribute('placeholder'),
          element.getAttribute('aria-label'),
          element.getAttribute('data-testid'),
          element.getAttribute('class')
        ].filter(Boolean).join(' | ');
        return selector + (label ? ': ' + label : '');
      }),
      candidateSendButtons,
      candidateResponseContainers,
      visibleGeneratingIndicators,
      candidateOuterHtml: candidateComposers.slice(0, 3).map(({ element }) => element.outerHTML)
    };
  })()`);

  const debugDir = path.join(runnerRoot, 'debug');
  await mkdir(debugDir, { recursive: true });

  const htmlPath = path.join(debugDir, debugFileName(participant, 'html'));
  const screenshotPath = path.join(debugDir, debugFileName(participant, 'png'));

  await writeFile(htmlPath, await page.content(), 'utf8');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  return {
    currentUrl: page.url(),
    title: await page.title(),
    readyState: diagnostics.readyState,
    counts: diagnostics.counts,
    visibleButtonLabels: diagnostics.visibleButtonLabels,
    visibleTextareaPlaceholders: diagnostics.visibleTextareaPlaceholders,
    visibleTextboxPlaceholders: diagnostics.visibleTextboxPlaceholders,
    candidateComposerSelectors: diagnostics.candidateComposerSelectors,
    candidateSendButtons: diagnostics.candidateSendButtons,
    candidateResponseContainers: diagnostics.candidateResponseContainers,
    visibleGeneratingIndicators: diagnostics.visibleGeneratingIndicators,
    candidateOuterHtml: diagnostics.candidateOuterHtml,
    htmlPath,
    screenshotPath,
  };
}
