#!/usr/bin/env node
// Deterministic assertions for scripts/verify-version.mjs.
//
// Builds synthetic repository fixtures in a temporary directory and runs the
// verifier against them; the real project version is never mutated. Also
// asserts read-only behavior, deterministic output, machine-readable output,
// and the absence of network access in the verifier source.
//
// Usage: node scripts/verifyVersionAssertions.mjs

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const verifierPath = path.join(scriptsDir, 'verify-version.mjs');

let failureCount = 0;

function report(name, ok, detail = '') {
  if (ok) {
    console.log(`PASS ${name}${detail ? `: ${detail}` : ''}`);
  } else {
    failureCount += 1;
    console.error(`FAIL ${name}${detail ? `: ${detail}` : ''}`);
  }
}

function runVerifier(fixtureRoot, extraArgs = []) {
  try {
    const stdout = execFileSync(
      process.execPath,
      [verifierPath, '--root', fixtureRoot, ...extraArgs],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return { exitCode: 0, stdout };
  } catch (error) {
    return {
      exitCode: error.status ?? 1,
      stdout: `${error.stdout ?? ''}${error.stderr ?? ''}`,
    };
  }
}

function writeFixture(root, { rootVersion, runnerVersion, changelog }) {
  mkdirSync(path.join(root, 'runner'), { recursive: true });
  writeFileSync(
    path.join(root, 'package.json'),
    `${JSON.stringify({ name: 'maestriss-studio', version: rootVersion }, null, 2)}\n`,
  );
  writeFileSync(
    path.join(root, 'runner', 'package.json'),
    `${JSON.stringify({ name: 'maestriss-runner-poc', version: runnerVersion }, null, 2)}\n`,
  );
  if (changelog !== undefined) {
    writeFileSync(path.join(root, 'CHANGELOG.md'), changelog);
  }
}

function changelogFor(version) {
  return `# Changelog\n\n## [Unreleased]\n\n## [${version}] - 2026-01-01\n\n### Added\n\n- Fixture entry.\n`;
}

const workRoot = mkdtempSync(path.join(tmpdir(), 'maestriss-version-fixtures-'));

try {
  // Case 1: fully valid repository state.
  const valid = path.join(workRoot, 'valid');
  writeFixture(valid, { rootVersion: '0.3.0', runnerVersion: '0.3.0', changelog: changelogFor('0.3.0') });
  const validRun = runVerifier(valid);
  report('valid fixture exits 0', validRun.exitCode === 0, `exit ${validRun.exitCode}`);
  report(
    'valid fixture reports canonical version',
    validRun.stdout.includes('Version state OK: Maestriss 0.3.0'),
  );

  // Case 2: malformed canonical version.
  const malformed = path.join(workRoot, 'malformed');
  writeFixture(malformed, { rootVersion: '0.3.x', runnerVersion: '0.3.x', changelog: changelogFor('0.3.0') });
  const malformedRun = runVerifier(malformed);
  report('malformed canonical version exits nonzero', malformedRun.exitCode !== 0, `exit ${malformedRun.exitCode}`);
  report(
    'malformed canonical version names the failing check',
    malformedRun.stdout.includes('canonical-version-valid-semver'),
  );

  // Case 3: two-component version rejected.
  const twoComponent = path.join(workRoot, 'two-component');
  writeFixture(twoComponent, { rootVersion: '0.3', runnerVersion: '0.3', changelog: changelogFor('0.3.0') });
  const twoComponentRun = runVerifier(twoComponent);
  report('two-component version exits nonzero', twoComponentRun.exitCode !== 0, `exit ${twoComponentRun.exitCode}`);

  // Case 4: prerelease accepted.
  const prerelease = path.join(workRoot, 'prerelease');
  writeFixture(prerelease, {
    rootVersion: '1.0.0-rc.1',
    runnerVersion: '1.0.0-rc.1',
    changelog: changelogFor('1.0.0-rc.1'),
  });
  const prereleaseRun = runVerifier(prerelease);
  report('prerelease version exits 0', prereleaseRun.exitCode === 0, `exit ${prereleaseRun.exitCode}`);

  // Case 5: runner package mismatch detected.
  const mismatch = path.join(workRoot, 'mismatch');
  writeFixture(mismatch, { rootVersion: '0.3.0', runnerVersion: '0.2.0', changelog: changelogFor('0.3.0') });
  const mismatchRun = runVerifier(mismatch);
  report('runner package mismatch exits nonzero', mismatchRun.exitCode !== 0, `exit ${mismatchRun.exitCode}`);
  report(
    'runner package mismatch names the failing check',
    mismatchRun.stdout.includes('runner-package-reconciles'),
  );

  // Case 6: changelog missing Unreleased detected.
  const noUnreleased = path.join(workRoot, 'no-unreleased');
  writeFixture(noUnreleased, {
    rootVersion: '0.3.0',
    runnerVersion: '0.3.0',
    changelog: `# Changelog\n\n## [0.3.0] - 2026-01-01\n\n- Fixture entry.\n`,
  });
  const noUnreleasedRun = runVerifier(noUnreleased);
  report('missing Unreleased exits nonzero', noUnreleasedRun.exitCode !== 0, `exit ${noUnreleasedRun.exitCode}`);
  report(
    'missing Unreleased names the failing check',
    noUnreleasedRun.stdout.includes('changelog-has-unreleased'),
  );

  // Case 7: changelog/canonical mismatch detected.
  const changelogMismatch = path.join(workRoot, 'changelog-mismatch');
  writeFixture(changelogMismatch, { rootVersion: '0.3.1', runnerVersion: '0.3.1', changelog: changelogFor('0.3.0') });
  const changelogMismatchRun = runVerifier(changelogMismatch);
  report(
    'changelog mismatch exits nonzero',
    changelogMismatchRun.exitCode !== 0,
    `exit ${changelogMismatchRun.exitCode}`,
  );
  report(
    'changelog mismatch names the failing check',
    changelogMismatchRun.stdout.includes('changelog-matches-canonical'),
  );

  // Case 8: deterministic output on repeated runs.
  const repeatRun = runVerifier(valid);
  report('output is deterministic across runs', repeatRun.stdout === validRun.stdout);

  // Case 9: machine-readable output.
  const jsonRun = runVerifier(valid, ['--json']);
  let jsonOk = false;
  let jsonDetail = '';
  try {
    const parsed = JSON.parse(jsonRun.stdout);
    jsonOk = parsed.ok === true && parsed.version === '0.3.0' && Array.isArray(parsed.checks);
    jsonDetail = `ok=${parsed.ok} version=${parsed.version}`;
  } catch (error) {
    jsonDetail = String(error);
  }
  report('--json output parses with ok/version/checks', jsonOk, jsonDetail);

  // Case 10: read-only behavior — fixture contents unchanged after runs.
  const fixtureFiles = ['package.json', path.join('runner', 'package.json'), 'CHANGELOG.md'];
  const before = fixtureFiles.map((file) => readFileSync(path.join(valid, file), 'utf8'));
  runVerifier(valid);
  const unchanged = fixtureFiles.every(
    (file, index) => readFileSync(path.join(valid, file), 'utf8') === before[index],
  );
  report('verifier performs no writes to inspected files', unchanged);

  // Case 11: no network access in the verifier source.
  const verifierSource = readFileSync(verifierPath, 'utf8');
  const networkTokens = ['fetch(', "'node:http'", "'node:https'", "'node:net'", "'node:dgram'", "'node:tls'"];
  const offending = networkTokens.filter((token) => verifierSource.includes(token));
  report(
    'verifier source contains no network access',
    offending.length === 0,
    offending.join(', ') || 'clean',
  );
} finally {
  rmSync(workRoot, { recursive: true, force: true });
}

if (failureCount > 0) {
  process.exitCode = 1;
}
console.log(failureCount === 0 ? 'VERSION VERIFIER ASSERTIONS OK' : `FAILURES: ${failureCount}`);
