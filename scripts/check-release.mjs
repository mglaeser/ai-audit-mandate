#!/usr/bin/env node
// Asserts the release invariants that no generator regenerates.
//
// Some facts about this repository are written by hand in several places at
// once: the version, and the truncated mandate digest quoted in the README.
// `npm run verify` cannot catch these — it only compares generated files to
// their generators — so a volume edit can ship with the README still quoting the
// previous digest, and a version bump can leave the lockfile behind. Both
// happened. This runs the comparison instead of trusting anyone to remember it.
//
// Usage:
//   node scripts/check-release.mjs

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(join(root, path), 'utf8');

const [pkgText, lockText, citationText, manifestText, readme] = await Promise.all([
  read('package.json'),
  read('package-lock.json'),
  read('CITATION.cff'),
  read('mandate/manifest.json'),
  read('README.md'),
]);

const pkg = JSON.parse(pkgText);
const lock = JSON.parse(lockText);
const manifest = JSON.parse(manifestText);

const problems = [];
const check = (condition, message) => {
  if (!condition) problems.push(message);
};

// 1. One version, stated in four places.
const citationVersion = citationText.match(/^version:\s*["']?([^"'\s]+)/m)?.[1];
check(citationVersion !== undefined, 'CITATION.cff has no version field');
check(
  citationVersion === pkg.version,
  `CITATION.cff version ${citationVersion} does not match package.json ${pkg.version}`,
);
check(
  lock.version === pkg.version,
  `package-lock.json version ${lock.version} does not match package.json ${pkg.version}`,
);
check(
  lock.packages?.['']?.version === pkg.version,
  `package-lock.json packages[""].version ${lock.packages?.['']?.version} does not match package.json ${pkg.version}`,
);

// 2. Every truncated digest quoted in the README must be a prefix of the
//    combined digest the manifest actually records.
const combined = manifest.combined.sha256.replace(/^sha256:/, '');
const quoted = [...readme.matchAll(/sha256:([0-9a-f]{6,})…/g)].map((match) => match[1]);

check(quoted.length > 0, 'README.md quotes no mandate digest — the integrity example has gone missing');
for (const prefix of quoted) {
  check(
    combined.startsWith(prefix),
    `README.md quotes sha256:${prefix}… but the manifest records sha256:${combined.slice(0, prefix.length)}… — ` +
      'regenerate the manifest, then update the README',
  );
}

// 3. The manifest must describe the volumes it actually hashed.
check(
  manifest.catalogue_file.check_count === manifest.required_check_ids_count,
  'manifest check_count and required_check_ids_count disagree',
);

for (const problem of problems) console.error(`check-release: ${problem}`);

if (problems.length > 0) {
  console.error(`check-release: ${problems.length} release invariant(s) violated.`);
  process.exit(1);
}

console.log(
  `check-release: version ${pkg.version} is consistent across package.json, package-lock.json and CITATION.cff; ` +
    `${quoted.length} quoted digest(s) match sha256:${combined.slice(0, 8)}….`,
);
