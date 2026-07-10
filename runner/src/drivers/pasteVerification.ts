import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Page } from 'playwright';

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

async function writePasteFailureArtifacts(page: Page, participant: string) {
  const debugDir = path.join(process.cwd(), 'debug');
  await mkdir(debugDir, { recursive: true });

  const prefix = participant.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  await writeFile(
    path.join(debugDir, `${prefix}-paste-failure.html`),
    await page.content(),
    'utf8',
  );
  await page.screenshot({
    path: path.join(debugDir, `${prefix}-paste-failure.png`),
    fullPage: true,
  });
}

export async function verifyPastedPrompt(
  page: Page,
  participant: string,
  prompt: string,
  composerText: string,
) {
  const normalizedText = normalizeWhitespace(composerText);
  const normalizedPrompt = normalizeWhitespace(prompt);
  const promptStart = normalizedPrompt.slice(0, Math.min(normalizedPrompt.length, 80));
  const verified = normalizedText.length > 0 && normalizedText.includes(promptStart);

  console.log(`Text present after paste: ${normalizedText.length > 0 ? 'yes' : 'no'}`);

  if (!verified) {
    await writePasteFailureArtifacts(page, participant);
    throw new Error(`${participant} paste failed: composer did not contain prompt text`);
  }

  console.log('Paste verified');
}
