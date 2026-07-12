#!/usr/bin/env node
// Read-only Maestriss version verifier.
//
// Canonical version owner: root package.json (see Reference doc 12,
// Versioning and Release Policy). This script verifies that every other
// version surface mechanically reconciles with the canonical owner.
//
// Usage:
//   node scripts/verify-version.mjs [--json] [--root <path>]
//
// Exit codes: 0 = all checks pass (warnings allowed), 1 = at least one
// failure or the repository state could not be read. Performs no writes
// and no network access. Output is deterministic for a given repo state.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?$/;

const RELEASE_HEADING_PATTERN = /^## \[(\S+)\] - (\d{4}-\d{2}-\d{2})\s*$/;

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const rootFlagIndex = args.indexOf('--root');
const repoRoot = rootFlagIndex >= 0 && args[rootFlagIndex + 1]
  ? path.resolve(args[rootFlagIndex + 1])
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const checks = [];

function record(name, status, detail) {
  checks.push({ name, status, detail });
}

function parseSemVer(value) {
  const match = SEMVER_PATTERN.exec(value);
  if (!match) return undefined;
  return {
    raw: value,
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split('.') : [],
  };
}

function compareSemVer(a, b) {
  for (const key of ['major', 'minor', 'patch']) {
    if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1;
  }
  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0;
  if (a.prerelease.length === 0) return 1;
  if (b.prerelease.length === 0) return -1;
  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const left = a.prerelease[index];
    const right = b.prerelease[index];
    if (left === undefined) return -1;
    if (right === undefined) return 1;
    const leftNumeric = /^\d+$/.test(left);
    const rightNumeric = /^\d+$/.test(right);
    if (leftNumeric && rightNumeric) {
      if (Number(left) !== Number(right)) return Number(left) < Number(right) ? -1 : 1;
    } else if (leftNumeric !== rightNumeric) {
      return leftNumeric ? -1 : 1;
    } else if (left !== right) {
      return left < right ? -1 : 1;
    }
  }
  return 0;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

// Check 1-2: canonical owner exists and is strict SemVer.
let canonical;
const rootPackagePath = path.join(repoRoot, 'package.json');

if (!existsSync(rootPackagePath)) {
  record('canonical-owner-exists', 'FAIL', `Missing canonical version owner: ${rootPackagePath}`);
} else {
  let rootPackage;
  try {
    rootPackage = readJson(rootPackagePath);
  } catch (error) {
    record('canonical-owner-exists', 'FAIL', `Unreadable root package.json: ${String(error)}`);
  }

  if (rootPackage) {
    record('canonical-owner-exists', 'PASS', 'root package.json present');
    const value = rootPackage.version;

    if (typeof value !== 'string' || !SEMVER_PATTERN.test(value)) {
      record(
        'canonical-version-valid-semver',
        'FAIL',
        `root package.json version is not valid three-component SemVer: ${JSON.stringify(value)}`,
      );
    } else {
      canonical = parseSemVer(value);
      record('canonical-version-valid-semver', 'PASS', `canonical Maestriss version ${value}`);
    }
  }
}

// Check 3: runner package reconciles with the canonical version.
const runnerPackagePath = path.join(repoRoot, 'runner', 'package.json');

if (!existsSync(runnerPackagePath)) {
  record('runner-package-reconciles', 'SKIP', 'runner/package.json not present');
} else if (canonical) {
  try {
    const runnerVersion = readJson(runnerPackagePath).version;
    if (runnerVersion === canonical.raw) {
      record('runner-package-reconciles', 'PASS', `runner/package.json at ${runnerVersion}`);
    } else {
      record(
        'runner-package-reconciles',
        'FAIL',
        `runner/package.json version ${JSON.stringify(runnerVersion)} != canonical ${canonical.raw}`,
      );
    }
  } catch (error) {
    record('runner-package-reconciles', 'FAIL', `Unreadable runner/package.json: ${String(error)}`);
  }
}

// Check 4: lockfiles reconcile (top-level and packages[""] entries).
for (const [label, lockRelative] of [
  ['root-lockfile-reconciles', 'package-lock.json'],
  ['runner-lockfile-reconciles', path.join('runner', 'package-lock.json')],
]) {
  const lockPath = path.join(repoRoot, lockRelative);
  if (!existsSync(lockPath)) {
    record(label, 'SKIP', `${lockRelative} not present`);
    continue;
  }
  if (!canonical) continue;
  try {
    const lock = readJson(lockPath);
    const rootEntryVersion = lock.packages?.['']?.version;
    if (lock.version === canonical.raw && rootEntryVersion === canonical.raw) {
      record(label, 'PASS', `${lockRelative} at ${canonical.raw}`);
    } else {
      record(
        label,
        'FAIL',
        `${lockRelative} versions (top ${JSON.stringify(lock.version)}, packages[""] ` +
        `${JSON.stringify(rootEntryVersion)}) != canonical ${canonical.raw}`,
      );
    }
  } catch (error) {
    record(label, 'FAIL', `Unreadable ${lockRelative}: ${String(error)}`);
  }
}

// Checks 5-7: changelog exists, has Unreleased, and its newest release
// heading matches the canonical version exactly.
const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
let releasedVersions = [];

if (!existsSync(changelogPath)) {
  record('changelog-exists', 'FAIL', 'CHANGELOG.md not present');
} else {
  record('changelog-exists', 'PASS', 'CHANGELOG.md present');
  const lines = readFileSync(changelogPath, 'utf8').split(/\r?\n/);

  if (lines.some((line) => line.trim() === '## [Unreleased]')) {
    record('changelog-has-unreleased', 'PASS', 'Unreleased section present');
  } else {
    record('changelog-has-unreleased', 'FAIL', 'CHANGELOG.md has no "## [Unreleased]" section');
  }

  const malformedHeadings = [];
  for (const line of lines) {
    if (!line.startsWith('## [') || line.trim() === '## [Unreleased]') continue;
    const match = RELEASE_HEADING_PATTERN.exec(line.trim());
    if (!match || !SEMVER_PATTERN.test(match[1])) {
      malformedHeadings.push(line.trim());
      continue;
    }
    releasedVersions.push(parseSemVer(match[1]));
  }

  if (malformedHeadings.length > 0) {
    record('changelog-headings-valid', 'FAIL', `Malformed release headings: ${malformedHeadings.join(' | ')}`);
  } else {
    record('changelog-headings-valid', 'PASS', `${releasedVersions.length} release heading(s) parsed`);
  }

  if (canonical) {
    if (releasedVersions.length === 0) {
      record('changelog-matches-canonical', 'FAIL', 'CHANGELOG.md has no released version headings');
    } else {
      const newest = releasedVersions.reduce((left, right) => (compareSemVer(left, right) >= 0 ? left : right));
      if (compareSemVer(newest, canonical) === 0) {
        record('changelog-matches-canonical', 'PASS', `newest released changelog entry ${newest.raw} == canonical`);
      } else {
        record(
          'changelog-matches-canonical',
          'FAIL',
          `newest released changelog entry ${newest.raw} != canonical ${canonical.raw}`,
        );
      }
    }
  }
}

// Check 8: no independent application-version constants in TypeScript
// sources. Runtime code must derive the version from the canonical owner.
if (canonical) {
  const offenders = [];
  const sourceRoots = [path.join(repoRoot, 'src'), path.join(repoRoot, 'runner', 'src')];

  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (/\.(ts|tsx)$/.test(entry.name) && readFileSync(entryPath, 'utf8').includes(`'${canonical.raw}'`)) {
        offenders.push(path.relative(repoRoot, entryPath));
      }
    }
  };

  for (const sourceRoot of sourceRoots) {
    if (existsSync(sourceRoot)) walk(sourceRoot);
  }

  if (offenders.length > 0) {
    record('no-hardcoded-version-constants', 'FAIL', `Version literal found in: ${offenders.join(', ')}`);
  } else {
    record('no-hardcoded-version-constants', 'PASS', 'no TypeScript source hardcodes the canonical version');
  }
}

// Check 9: journal release-history rows exist for the canonical version.
// Reference document metadata "Version:" fields are per-document revision
// identifiers and are deliberately NOT reconciled here (see doc 12 policy).
if (canonical) {
  const journalPaths = [
    path.join(repoRoot, 'Documentation', 'Reference', 'Human', '11 - Project Status and Development Journal.md'),
    path.join(repoRoot, 'Documentation', 'Reference', 'AI', '11 - Project Status and Development Journal.md'),
  ];
  const journalNeedle = `| v${canonical.major}.${canonical.minor}.${canonical.patch}`;
  for (const journalPath of journalPaths) {
    const label = journalPath.includes(`${path.sep}Human${path.sep}`)
      ? 'journal-release-history-human'
      : 'journal-release-history-ai';
    if (!existsSync(journalPath)) {
      record(label, 'SKIP', 'journal document not present');
      continue;
    }
    if (canonical.prerelease.length > 0) {
      record(label, 'SKIP', 'prerelease versions are not required to appear in journal release history');
      continue;
    }
    if (readFileSync(journalPath, 'utf8').includes(journalNeedle)) {
      record(label, 'PASS', `release-history row found for ${journalNeedle.slice(2)}`);
    } else {
      record(label, 'FAIL', `no release-history row for ${journalNeedle.slice(2)} in ${path.basename(journalPath)}`);
    }
  }
}

// Check 10: Git tag reconciliation (reported when Git is available).
if (canonical) {
  let tagOutput;
  try {
    tagOutput = execFileSync('git', ['tag', '-l', 'v*'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    record('git-tags-reconcile', 'SKIP', 'git unavailable or not a repository');
  }

  if (tagOutput !== undefined) {
    const tags = tagOutput
      .split(/\r?\n/)
      .map((tag) => tag.trim())
      .filter((tag) => /^v\d/.test(tag))
      .map((tag) => ({ tag, version: parseSemVer(tag.slice(1)) }));
    const invalidTags = tags.filter((entry) => !entry.version).map((entry) => entry.tag);
    const validTags = tags.filter((entry) => entry.version);

    if (invalidTags.length > 0) {
      record('git-tags-reconcile', 'FAIL', `Non-SemVer v-prefixed tags: ${invalidTags.join(', ')}`);
    } else if (validTags.length === 0) {
      record('git-tags-reconcile', 'SKIP', 'no release tags found');
    } else {
      const releasedSet = new Set(releasedVersions.map((version) => version.raw));
      const untracked = validTags.filter((entry) => !releasedSet.has(entry.version.raw)).map((entry) => entry.tag);
      const newestTag = validTags.reduce((left, right) =>
        compareSemVer(left.version, right.version) >= 0 ? left : right);
      const comparison = compareSemVer(newestTag.version, canonical);

      if (untracked.length > 0) {
        record('git-tags-reconcile', 'FAIL', `Tags without changelog release entries: ${untracked.join(', ')}`);
      } else if (comparison > 0) {
        record('git-tags-reconcile', 'FAIL', `newest tag ${newestTag.tag} is ahead of canonical ${canonical.raw}`);
      } else if (comparison < 0) {
        record('git-tags-reconcile', 'WARN', `canonical ${canonical.raw} not yet tagged (newest tag ${newestTag.tag}); tag only with human approval`);
      } else {
        record('git-tags-reconcile', 'PASS', `newest tag ${newestTag.tag} == canonical`);
      }
    }
  }
}

const failed = checks.filter((check) => check.status === 'FAIL');
const ok = failed.length === 0 && canonical !== undefined;

if (jsonOutput) {
  console.log(JSON.stringify({ ok, version: canonical?.raw ?? null, checks }, null, 2));
} else {
  for (const check of checks) {
    const line = `${check.status} ${check.name}: ${check.detail}`;
    if (check.status === 'FAIL') console.error(line);
    else console.log(line);
  }
  console.log(ok
    ? `Version state OK: Maestriss ${canonical.raw}`
    : `Version state INVALID: ${failed.length} failed check(s)`);
}

process.exitCode = ok ? 0 : 1;
