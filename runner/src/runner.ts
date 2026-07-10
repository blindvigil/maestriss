import type { BrowserContext, Page } from 'playwright';
import type { RunnerParticipant } from './participants.js';

export type OpenParticipantResult = {
  participant: RunnerParticipant;
  page: Page;
  status: 'reused' | 'opened';
  title: string;
  url: string;
};

function participantUrl(participant: RunnerParticipant) {
  return new URL(participant.url);
}

function isGoogleHost(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === 'google.com' || normalized === 'www.google.com';
}

function isGooglePageUrl(pageUrl: string) {
  try {
    const actual = new URL(pageUrl);
    return isGoogleHost(actual.hostname);
  } catch {
    return false;
  }
}

function isGoogleAiModeUrl(pageUrl: string) {
  try {
    const actual = new URL(pageUrl);
    return isGoogleHost(actual.hostname) &&
      (actual.pathname === '/ai' || actual.searchParams.get('udm') === '50');
  } catch {
    return false;
  }
}

function pageMatchesParticipant(page: Page, participant: RunnerParticipant) {
  const pageUrl = page.url();

  if (!pageUrl || pageUrl === 'about:blank') {
    return false;
  }

  try {
    const expected = participantUrl(participant);
    const actual = new URL(pageUrl);

    if (participant.id === 'copilot') {
      return actual.hostname.toLowerCase() === 'copilot.microsoft.com' ||
        (actual.hostname.toLowerCase() === 'm365.cloud.microsoft' && actual.pathname.startsWith('/chat'));
    }

    if (participant.id === 'google') {
      return isGooglePageUrl(pageUrl);
    }

    return actual.hostname.toLowerCase() === expected.hostname.toLowerCase();
  } catch {
    return false;
  }
}

function participantPagePreference(page: Page, participant: RunnerParticipant) {
  if (participant.id === 'google') {
    return isGoogleAiModeUrl(page.url()) ? 0 : 1;
  }

  if (participant.id !== 'copilot') {
    return 0;
  }

  try {
    const actual = new URL(page.url());

    if (actual.hostname.toLowerCase() === 'm365.cloud.microsoft' && actual.pathname.startsWith('/chat')) {
      return 0;
    }

    if (actual.hostname.toLowerCase() === 'copilot.microsoft.com') {
      return 1;
    }
  } catch {
    return 2;
  }

  return 2;
}

export function findParticipantPage(
  context: BrowserContext,
  participant: RunnerParticipant,
): Page | undefined {
  return context.pages()
    .filter((page) => pageMatchesParticipant(page, participant))
    .sort((left, right) => (
      participantPagePreference(left, participant) - participantPagePreference(right, participant)
    ))[0];
}

export async function ensureParticipantPage(
  context: BrowserContext,
  participant: RunnerParticipant,
): Promise<OpenParticipantResult> {
  const existingPage = findParticipantPage(context, participant);

  if (existingPage) {
    if (participant.id === 'google' && !isGoogleAiModeUrl(existingPage.url())) {
      await existingPage.goto(participant.url, { waitUntil: 'domcontentloaded' });
    }

    return {
      participant,
      page: existingPage,
      status: 'reused',
      title: await existingPage.title(),
      url: existingPage.url(),
    };
  }

  const page = await context.newPage();
  await page.goto(participant.url, { waitUntil: 'domcontentloaded' });

  return {
    participant,
    page,
    status: 'opened',
    title: await page.title(),
    url: page.url(),
  };
}

export async function listParticipantPages(
  context: BrowserContext,
  participants: RunnerParticipant[],
): Promise<OpenParticipantResult[]> {
  const matchedPages: OpenParticipantResult[] = [];

  for (const participant of participants) {
    const page = findParticipantPage(context, participant);

    if (page) {
      matchedPages.push({
        participant,
        page,
        status: 'reused',
        title: await page.title(),
        url: page.url(),
      });
    }
  }

  return matchedPages;
}

export async function openParticipants(
  context: BrowserContext,
  participants: RunnerParticipant[],
): Promise<OpenParticipantResult[]> {
  const openedPages: OpenParticipantResult[] = [];

  for (const participant of participants) {
    openedPages.push(await ensureParticipantPage(context, participant));
  }

  return openedPages;
}

export async function pastePrompt(page: Page, prompt: string): Promise<void> {
  void page;
  void prompt;
  throw new Error('pastePrompt is not implemented yet.');
}

export async function submitPrompt(page: Page): Promise<void> {
  void page;
  throw new Error('submitPrompt is not implemented yet.');
}

export async function waitForCompletion(page: Page, participant: RunnerParticipant): Promise<void> {
  void page;
  void participant;
  throw new Error('waitForCompletion is not implemented yet.');
}

export async function extractResponse(page: Page, participant: RunnerParticipant): Promise<string> {
  void page;
  void participant;
  throw new Error('extractResponse is not implemented yet.');
}
