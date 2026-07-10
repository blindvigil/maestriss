import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import type { Page } from 'playwright';

const securityVerificationText = [
  'Just a moment',
  'Verify you are human',
  'Performing security verification',
  'Cloudflare',
];

async function hasSecurityVerification(page: Page) {
  const title = await page.title().catch(() => '');
  const bodyText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
  const combined = `${title}\n${bodyText}`.toLowerCase();

  return securityVerificationText.some((text) => combined.includes(text.toLowerCase()));
}

export type SecurityVerificationResult = 'clear' | 'blocked';

async function waitForEnter() {
  const rl = readline.createInterface({ input, output });

  try {
    await rl.question('');
  } finally {
    rl.close();
  }
}

export async function waitForManualSecurityVerification(
  page: Page,
  participantName: string,
  maxVerificationAttempts = Number.POSITIVE_INFINITY,
): Promise<SecurityVerificationResult> {
  if (!(await hasSecurityVerification(page))) {
    return 'clear';
  }

  let verificationAttempts = 0;

  while (await hasSecurityVerification(page)) {
    verificationAttempts += 1;

    if (verificationAttempts >= maxVerificationAttempts) {
      console.log('Claude is blocked by security verification in this browser profile.');
      console.log('Use manual mode, API mode, or remove Claude from this native run for now.');
      return 'blocked';
    }

    console.log(`Security verification detected for ${participantName}.`);
    console.log('Complete it manually in the browser, then press Enter in the terminal to continue.');
    await waitForEnter();
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  }

  return 'clear';
}
