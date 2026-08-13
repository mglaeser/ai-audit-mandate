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
const read = async (path) =>
  readFile(join(root, path), 'utf8').catch((error) => {
    console.error(
      error.code === 'ENOENT'
        ? `check-release: ${path} is missing`
        : `check-release: cannot read ${path}: ${error.message}`,
    );
    process.exit(2);
  });

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

// 2. Every digest quoted in the README must be a prefix of the combined digest
//    the manifest actually records. The pattern must not require the ellipsis:
//    matching only `…`-terminated quotes means a full-length wrong digest is
//    skipped rather than caught, which is the opposite of the point.
const combined = manifest.combined.sha256.replace(/^sha256:/, '');
const DIGEST = /sha256:([0-9a-fA-F]{6,})(?:…|\.\.\.)?/g;
const quotedIn = (text) => [...text.matchAll(DIGEST)].map((match) => match[1].toLowerCase());

const EXPECTED_README_DIGESTS = 2;
const quoted = quotedIn(readme);

// An exact count, not "at least one": losing a quotation site is itself the
// drift this check exists to catch.
check(
  quoted.length === EXPECTED_README_DIGESTS,
  `README.md quotes ${quoted.length} mandate digest(s), expected ${EXPECTED_README_DIGESTS}`,
);
for (const prefix of quoted) {
  check(
    combined.startsWith(prefix),
    `README.md quotes sha256:${prefix}… but the manifest records sha256:${combined.slice(0, prefix.length)}… — ` +
      'regenerate the manifest, then update the README',
  );
}

// The changelog records the combined digest of the release it describes. Only
// the newest entry is checked; older entries correctly name older digests.
const changelog = await read('CHANGELOG.md');
const firstEntry = changelog.indexOf('\n## ');
const secondEntry = changelog.indexOf('\n## ', firstEntry + 1);
const newestEntry = changelog.slice(firstEntry, secondEntry === -1 ? changelog.length : secondEntry);
const newestDigests = quotedIn(newestEntry);

// CHANGELOG.md's own preamble promises that "every release records the combined
// digest of the two volumes". Checking only the digests that ARE quoted lets a
// release quoting none pass silently — which is exactly how a volume edit could
// ship with no re-pin notice for the engagements that pinned the old text.
check(
  newestDigests.length > 0,
  "CHANGELOG.md's newest entry records no combined digest, which the file's own preamble requires of every release",
);
for (const prefix of newestDigests) {
  check(
    combined.startsWith(prefix),
    `CHANGELOG.md's newest entry quotes sha256:${prefix}…, which is not the digest the manifest records`,
  );
}

// 3. The manifest must agree with the catalogue it was built beside. Comparing
//    two fields the same generator wrote from one expression cannot fail; these
//    compare across artifacts, which can.
const catalogue = JSON.parse(await read('catalogue/checks.json'));

check(Number.isInteger(manifest.catalogue_file?.check_count), 'manifest catalogue_file.check_count is missing or not an integer');
check(manifest.catalogue_file?.check_count === catalogue.check_count, 'manifest check_count does not match the catalogue');
check(
  manifest.required_check_ids_count === catalogue.required_check_ids.length,
  'manifest required_check_ids_count does not match the catalogue',
);

for (const part of manifest.parts) {
  const volume = catalogue.volumes.find((entry) => entry.path === part.path);
  check(volume !== undefined, `manifest names a volume the catalogue does not: ${part.path}`);
  check(part.sha256 === volume?.sha256, `manifest and catalogue disagree on the digest of ${part.path}`);
  check(
    new RegExp(`\\(${volume?.check_count} checks\\)`).test(part.scope),
    `manifest scope for ${part.path} does not state ${volume?.check_count} checks`,
  );
}

// 4. The README's hand-written severity table mirrors generated data and is
//    compared by nothing else. These are the numbers that were wrong before.
const bandRow = (band) => new RegExp(`\\|\\s*\`${band}\`\\s*\\|[^|]*\\|\\s*([0-9]+)\\s*\\|`);
for (const [band, count] of Object.entries(catalogue.totals.by_band)) {
  if (band === 'STOP-SHIP') continue;
  const match = readme.match(bandRow(band));
  check(match !== null, `README.md's severity table has no row for \`${band}\``);
  check(
    match === null || Number(match[1]) === count,
    `README.md states ${match?.[1]} checks in \`${band}\`; the catalogue has ${count}`,
  );
}

const stopShip = readme.match(/\|\s*`STOP-SHIP`\s*\|[^|]*\|\s*([0-9]+) direct, ([0-9]+) conditional\s*\|/);
check(stopShip !== null, "README.md's severity table has no STOP-SHIP row in the expected form");
if (stopShip) {
  check(
    Number(stopShip[1]) === catalogue.totals.stop_ship_direct.length,
    `README.md states ${stopShip[1]} direct STOP-SHIP checks; the catalogue has ${catalogue.totals.stop_ship_direct.length}`,
  );
  check(
    Number(stopShip[2]) === catalogue.totals.stop_ship_conditional.length,
    `README.md states ${stopShip[2]} conditional STOP-SHIP checks; the catalogue has ${catalogue.totals.stop_ship_conditional.length}`,
  );
}

const structural = readme.match(/\*\*Structure beats policing\.\*\* (\d+) checks carry/);
check(structural !== null, 'README.md no longer states how many checks carry a structural fix');
check(
  structural === null || Number(structural[1]) === catalogue.totals.with_structural_fix,
  `README.md states ${structural?.[1]} structural fixes; the catalogue has ${catalogue.totals.with_structural_fix}`,
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
