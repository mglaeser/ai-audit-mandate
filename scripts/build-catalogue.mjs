#!/usr/bin/env node
// Derives the machine-readable check catalogue from the mandate prose.
//
// The prose is the single source of truth. This script never edits it; it parses
// the check blocks and regenerates `catalogue/checks.json`, so the catalogue can
// not drift from the volumes that define it.
//
// Usage:
//   node scripts/build-catalogue.mjs           # write catalogue/checks.json
//   node scripts/build-catalogue.mjs --check    # verify it is current (CI mode)

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const VOLUMES = [
  {
    id: 'volume-i',
    part: 1,
    path: 'mandate/01-foundation-and-core-tracks.md',
    title: 'Foundation and Core Tracks',
    tracks: ['A', 'B'],
    expectedChecks: 79,
  },
  {
    id: 'volume-ii',
    part: 2,
    path: 'mandate/02-security-privacy-assurance.md',
    title: 'Security, Privacy and Assurance',
    tracks: ['C'],
    expectedChecks: 40,
  },
];

const TRACK_NAMES = {
  A: 'Product, Design and Code Integrity',
  B: 'Platform, Delivery and Runtime',
  C: 'Security, Privacy and Assurance',
};

// Severity bands follow the mandate's own definition (Volume I, §3).
const BANDS = [
  { band: 'BLOCKER-1', min: 9, max: 10 },
  { band: 'BLOCKER-2', min: 7, max: 8 },
  { band: 'MUST-FIX', min: 5, max: 6 },
  { band: 'SHOULD-FIX', min: 3, max: 4 },
  { band: 'ADVISORY', min: 1, max: 2 },
];

const CHECK_HEADING = /^\*\*([ABC]-\d{2}) · (.+?)\*\* — Priority \*\*(\d{1,2})\/10\*\*(.*)$/gm;

const bandFor = (priority) =>
  BANDS.find(({ min, max }) => priority >= min && priority <= max)?.band ?? 'UNBANDED';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function parseVolume(source, volume) {
  const checks = [];

  for (const match of source.matchAll(CHECK_HEADING)) {
    const [, id, title, priorityText, trailer] = match;
    const priority = Number(priorityText);
    const blockStart = match.index + match[0].length;
    const nextHeading = source.indexOf('\n**', blockStart);
    const block = source.slice(blockStart, nextHeading === -1 ? source.length : nextHeading);

    // A check is STOP-SHIP either by direct mark in its heading (outside the italic
    // annotation) or by a conditional escalation the annotation describes. The two
    // are not interchangeable: only a direct mark holds production down from Phase 0.
    const directMark = /—\s*`STOP-SHIP`/.test(trailer);
    const escalation = /escalates to `STOP-SHIP`/.test(trailer);

    checks.push({
      id,
      track: id[0],
      title,
      priority,
      band: bandFor(priority),
      stop_ship: directMark || escalation,
      stop_ship_class: directMark ? 'direct' : escalation ? 'conditional' : null,
      escalates: /escalat/i.test(trailer),
      substitutions: [...new Set([...trailer.matchAll(/`(S\d{1,2})`/g)].map((m) => m[1]))],
      has_structural_fix: block.includes('**Structural fix (S13):**'),
      has_standing_control: block.includes('**Standing control:**'),
      volume: volume.id,
      part: volume.part,
    });
  }

  return checks;
}

function assert(condition, message) {
  if (!condition) {
    console.error(`build-catalogue: ${message}`);
    process.exitCode = 1;
    return false;
  }
  return true;
}

async function build() {
  const volumes = [];
  const checks = [];
  let healthy = true;

  for (const volume of VOLUMES) {
    const source = await readFile(join(root, volume.path), 'utf8');
    const parsed = parseVolume(source, volume);

    healthy =
      assert(
        parsed.length === volume.expectedChecks,
        `${volume.path}: expected ${volume.expectedChecks} checks, parsed ${parsed.length}`,
      ) && healthy;

    volumes.push({
      id: volume.id,
      part: volume.part,
      path: volume.path,
      title: volume.title,
      tracks: volume.tracks,
      check_count: parsed.length,
      sha256: sha256(source),
    });

    checks.push(...parsed);
  }

  const ids = checks.map((check) => check.id);
  healthy = assert(new Set(ids).size === ids.length, 'duplicate check identifiers') && healthy;
  healthy = assert(checks.length === 119, `expected 119 checks, parsed ${checks.length}`) && healthy;

  // Every check must carry a standing control: the mandate forbids a PASS without one.
  const uncontrolled = checks.filter((check) => !check.has_standing_control).map((c) => c.id);
  healthy = assert(
    uncontrolled.length === 0,
    `checks without a standing control: ${uncontrolled.join(', ')}`,
  ) && healthy;

  const tally = (key) =>
    Object.fromEntries(
      Object.entries(
        checks.reduce((acc, check) => {
          acc[check[key]] = (acc[check[key]] ?? 0) + 1;
          return acc;
        }, {}),
      ).sort(([a], [b]) => a.localeCompare(b)),
    );

  return {
    healthy,
    catalogue: {
      $schema: './checks.schema.json',
      catalogue_version: '2.0',
      generated_by: 'scripts/build-catalogue.mjs',
      note: 'Generated from the mandate prose. Edit the volumes, then regenerate; never edit this file by hand.',
      check_count: checks.length,
      tracks: Object.entries(TRACK_NAMES).map(([id, name]) => ({
        id,
        name,
        check_count: checks.filter((check) => check.track === id).length,
      })),
      volumes,
      totals: {
        by_track: tally('track'),
        by_band: tally('band'),
        stop_ship_direct: checks
          .filter((check) => check.stop_ship_class === 'direct')
          .map((check) => check.id),
        stop_ship_conditional: checks
          .filter((check) => check.stop_ship_class === 'conditional')
          .map((check) => check.id),
        with_structural_fix: checks.filter((check) => check.has_structural_fix).length,
        with_standing_control: checks.filter((check) => check.has_standing_control).length,
      },
      required_check_ids: ids,
      checks,
    },
  };
}

const { healthy, catalogue } = await build();
const serialised = `${JSON.stringify(catalogue, null, 2)}\n`;
const target = join(root, 'catalogue/checks.json');
const checkMode = process.argv.includes('--check');

if (checkMode) {
  const current = await readFile(target, 'utf8').catch(() => null);
  if (current !== serialised) {
    console.error('build-catalogue: catalogue/checks.json is stale — run `npm run catalogue`.');
    process.exit(1);
  }
  if (!healthy) process.exit(1);
  console.log(`build-catalogue: catalogue is current (${catalogue.check_count} checks).`);
} else {
  await writeFile(target, serialised);
  if (!healthy) process.exit(1);
  console.log(
    `build-catalogue: wrote ${catalogue.check_count} checks ` +
      `(${catalogue.totals.stop_ship_direct.length} STOP-SHIP, ` +
      `${catalogue.totals.with_structural_fix} with a structural fix).`,
  );
}
