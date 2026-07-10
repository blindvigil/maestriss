import type { Locator, Page } from 'playwright';
import type { ParticipantDriver } from './base.js';

const googleChromeLines = new Set([
  'Skip to main content',
  'Accessibility help',
  'AI Mode',
  'All',
  'Images',
  'Videos',
  'Forums',
  'More',
  'New thread',
  'Show all',
  'Share',
  'Feedback',
  'Sign in',
  'About',
  'Store',
  'Gmail',
  'Advertising',
  'Business',
  'How Search works',
  'Privacy',
  'Terms',
  'Settings',
  'History',
  'Search history',
  'AI Mode history',
  'My Ad Center',
  'Transcribing',
  'Listening',
  'Speak now',
  'Voice Search',
  'Try again',
  'Google apps',
]);

const noGoogleResponseMessage = [
  'Google is open but no AI/search response is loaded.',
  'Ask a question in Google AI Mode first, wait for the answer, then rerun the chain.',
].join('\n');

const pendingGooglePrompts = new WeakMap<Page, string>();
const maxGoogleAnswerLength = 12000;
const truncationNotice = '\n\n[Google response truncated by Maestriss]';

function cleanGoogleText(text: string) {
  const seenLines = new Set<string>();

  return text
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !googleChromeLines.has(line))
    .filter((line) => !/^(sources?|related|people also ask|show all|more|feedback|share|copy|sign in|learn more|view all|videos?|images?|news|ai mode|ai mode history|history|search history|my ad center|transcribing|listening|speak now|voice search|google apps|new thread|try again)$/i.test(line))
    .filter((line) => !/^(was this helpful\??|send feedback|share this|about this result|cached|similar|people also search for)$/i.test(line))
    .filter((line) => !/(my ad center|privacy|terms|settings|advertising|business|how search works)/i.test(line))
    .filter((line) => !/^https?:\/\//i.test(line))
    .filter((line) => !/^(youtube|reddit|wikipedia|facebook|instagram|tiktok|x\.com|twitter)$/i.test(line))
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

function capGoogleAnswer(text: string) {
  if (text.length <= maxGoogleAnswerLength) {
    return text;
  }

  const availableTextLength = Math.max(0, maxGoogleAnswerLength - truncationNotice.length);
  return `${text.slice(0, availableTextLength).trimEnd()}${truncationNotice}`;
}

function isGoogleHomepage(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' &&
      parsed.hostname.toLowerCase() === 'www.google.com' &&
      (parsed.pathname === '/' || parsed.pathname === '') &&
      parsed.search === '';
  } catch {
    return false;
  }
}

function isGoogleSearchUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.toLowerCase() === 'www.google.com';
  } catch {
    return false;
  }
}

function isGoogleResponseUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.pathname === '/search' || parsed.searchParams.get('udm') === '50';
  } catch {
    return false;
  }
}

function looksLikeGoogleChrome(text: string) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return true;
  }

  const chromeLineCount = lines.filter((line) => (
    googleChromeLines.has(line) ||
    ['About', 'Store', 'Gmail', 'Images', 'Sign in', 'Advertising', 'Business', 'How Search works'].includes(line)
  )).length;

  return chromeLineCount / lines.length > 0.6 || text.length < 80;
}

function isExecutionContextDestroyed(error: unknown) {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return message.includes('execution context was destroyed') ||
    message.includes('cannot find context with specified id') ||
    message.includes('most likely because of a navigation');
}

async function settleGooglePage(page: Page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => undefined);
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(500);
}

async function evaluateGooglePage<T>(page: Page, script: string): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await settleGooglePage(page);
      return await page.evaluate<T>(script);
    } catch (error) {
      lastError = error;

      if (!isExecutionContextDestroyed(error)) {
        throw error;
      }

      await page.waitForTimeout(500);
    }
  }

  throw lastError;
}

async function findSearchBox(page: Page): Promise<Locator> {
  const candidates = [
    page.locator('textarea[name="q"]').first(),
    page.locator('input[name="q"]').first(),
    page.locator('textarea[aria-label*="Search" i]').first(),
    page.locator('input[aria-label*="Search" i]').first(),
    page.getByRole('combobox').first(),
    page.getByRole('searchbox').first(),
  ];

  for (const candidate of candidates) {
    if (await candidate.isVisible({ timeout: 1000 }).catch(() => false)) {
      return candidate;
    }
  }

  throw new Error('Could not find Google search box.');
}

async function ensureAiMode(page: Page, prompt: string) {
  const currentUrl = page.url();

  if (!isGoogleSearchUrl(currentUrl)) {
    throw new Error(`Google ask refused non-Google page: ${currentUrl}`);
  }

  const parsed = new URL(currentUrl);

  if (parsed.searchParams.get('udm') === '50') {
    return;
  }

  const aiModeControl = page
    .locator('a, button')
    .filter({ hasText: /^AI Mode$/i })
    .first();

  if (await aiModeControl.isVisible({ timeout: 5000 }).catch(() => false)) {
    await aiModeControl.click();
    await settleGooglePage(page);
    return;
  }

  const query = parsed.searchParams.get('q') || prompt;
  await page.goto(`https://www.google.com/search?udm=50&q=${encodeURIComponent(query)}`, {
    waitUntil: 'domcontentloaded',
  });
  await settleGooglePage(page);
}

async function latestAiResponseText(page: Page) {
  return evaluateGooglePage<string>(page, `(() => {
    const answerSelectors = [
      '[data-attrid*="AI"]',
      '[aria-label*="AI Mode" i]',
      '[data-md]',
      '[class*="ai-overview"]',
      '[class*="ai_mode"]',
      '[class*="answer"]',
      '[class*="response"]'
    ];

    const fallbackSelectors = [
      '[data-attrid*="AI"]',
      '[aria-label*="AI Mode" i]',
      '[data-md]',
      '[class*="ai"]',
      '[class*="answer"]',
      '[class*="response"]',
      'main',
    ];

    function visible(element) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    }

    function cloneReadableText(element) {
      const clone = element.cloneNode(true);
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
          '[class*="sources" i]',
          '[class*="citation" i]',
          '[class*="carousel" i]',
          '[class*="related" i]',
          '[class*="share" i]',
          '[class*="feedback" i]',
          '[aria-label*="Share" i]',
          '[aria-label*="Feedback" i]',
          '[class*="menu" i]',
          '[class*="footer" i]',
          '[class*="nav" i]',
          '[class*="history" i]',
          '[class*="feedback" i]',
          '[class*="share" i]',
          '[aria-label*="My Ad Center" i]',
          '[aria-label*="History" i]',
          'g-scrolling-carousel',
          'g-inner-card',
          'a[href*="youtube.com"]',
          'a[href*="/search?"]'
        ].join(','))
        .forEach((child) => child.remove());

      return String(clone.textContent || '').trim();
    }

    function candidateTexts(selectors) {
      return selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)))
        .filter((element) => {
          if (!visible(element)) return false;
          if (element.closest('nav, footer, header, aside, button, [role="button"]')) return false;
          return true;
        })
        .map((element) => ({
          text: cloneReadableText(element),
          top: element.getBoundingClientRect().top,
          area: element.getBoundingClientRect().width * element.getBoundingClientRect().height
        }))
        .filter((candidate) => candidate.text.length > 80)
        .sort((a, b) => {
          const lengthDelta = b.text.length - a.text.length;
          if (Math.abs(lengthDelta) > 2000) return lengthDelta;
          return a.top - b.top || b.area - a.area;
        })
        .map((candidate) => candidate.text);
    }

    const answerCandidates = candidateTexts(answerSelectors)
      .filter((text) => text.length < 25000);

    if (answerCandidates[0]) {
      return answerCandidates[0];
    }

    const fallbackCandidates = candidateTexts(fallbackSelectors)
        .filter((text) => text.length > 80)
        .filter((text) => text.length < 25000);

    if (fallbackCandidates[0]) {
      return fallbackCandidates[0];
    }

    return '';
  })()`);
}

async function hasAiModeReadyText(page: Page) {
  return evaluateGooglePage<boolean>(page, `(() => {
    return String(document.body?.innerText || '')
      .toLowerCase()
      .includes('ai mode response is ready');
  })()`);
}

export const googleDriver: ParticipantDriver = {
  name: 'Google',

  matchParticipant(participant) {
    return isGoogleSearchUrl(participant.url);
  },

  async waitForReady(page: Page) {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);
  },

  async pastePrompt(page: Page, prompt: string) {
    await this.waitForReady(page);

    if (!isGoogleSearchUrl(page.url())) {
      await page.goto('https://www.google.com/', { waitUntil: 'domcontentloaded' });
    }

    const searchBox = await findSearchBox(page);
    await searchBox.click();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.keyboard.press('Backspace');
    await searchBox.fill(prompt);
    pendingGooglePrompts.set(page, prompt);
    console.log('Google prompt entered');
  },

  async submitPrompt(page: Page) {
    const prompt = pendingGooglePrompts.get(page);

    if (!prompt) {
      throw new Error('Google submitPrompt called before pastePrompt.');
    }

    const searchBox = await findSearchBox(page);
    await searchBox.press('Enter');
    await settleGooglePage(page);
    await ensureAiMode(page, prompt);
    await settleGooglePage(page);
    console.log('Google prompt submitted');
  },

  async waitForCompletion(page: Page) {
    const startedAt = Date.now();
    const hardTimeoutMs = 180000;
    const stableMs = 5000;
    let lastText = cleanGoogleText(await latestAiResponseText(page));
    let stableSince = Date.now();

    while (Date.now() - startedAt < hardTimeoutMs) {
      const readyTextVisible = await hasAiModeReadyText(page);
      const currentText = cleanGoogleText(await latestAiResponseText(page));

      if (currentText !== lastText) {
        lastText = currentText;
        stableSince = Date.now();
      }

      const stable = currentText.length > 80 &&
        !looksLikeGoogleChrome(currentText) &&
        Date.now() - stableSince >= stableMs;

      if (readyTextVisible || stable) {
        return;
      }

      await page.waitForTimeout(500);
    }

    throw new Error('Timed out waiting for Google AI Mode completion.');
  },

  async extractParticipantResponse(page: Page, context) {
    await this.waitForReady(page);

    const currentUrl = page.url();

    if (!isGoogleSearchUrl(currentUrl)) {
      throw new Error(`Google extraction refused non-Google page: ${currentUrl}`);
    }

    if (isGoogleHomepage(currentUrl)) {
      throw new Error(noGoogleResponseMessage);
    }

    const hasGeminiBranding = await evaluateGooglePage<boolean>(page, `(() => {
      const url = location.href.toLowerCase();
      const title = document.title.toLowerCase();
      const bodyText = String(document.body?.innerText || '').toLowerCase();

      return url.includes('gemini.google.com') ||
        title.includes('gemini') ||
        bodyText.includes('conversation with gemini');
    })()`);

    if (hasGeminiBranding) {
      throw new Error(`Google extraction refused Gemini-branded page: ${currentUrl}`);
    }

    console.log(`Google extraction URL: ${currentUrl}`);

    const aiModeReady = await hasAiModeReadyText(page);

    if (!isGoogleResponseUrl(currentUrl) && !aiModeReady) {
      throw new Error(noGoogleResponseMessage);
    }

    const rawText = await latestAiResponseText(page);
    console.log(`Google raw extracted length: ${rawText.length}`);
    const cleanedText = cleanGoogleText(rawText);
    console.log(`Google cleaned extracted length: ${cleanedText.length}`);
    const finalText = capGoogleAnswer(cleanedText);
    console.log(`Google final capped length: ${finalText.length}`);

    if (looksLikeGoogleChrome(cleanedText)) {
      throw new Error(noGoogleResponseMessage);
    }

    return {
      participant: this.name.toLowerCase(),
      question: context.question,
      answer: finalText,
      citations: [],
      elapsedSeconds: context.elapsedSeconds,
      rawText,
      cleanedText: finalText,
      rawHtml: await page.content().catch(() => undefined),
    };
  },

  async extractResponse(page: Page) {
    const response = await this.extractParticipantResponse?.(page, {
      question: pendingGooglePrompts.get(page) ?? '',
      elapsedSeconds: 0,
    });

    return response?.answer ?? '';
  },
};
