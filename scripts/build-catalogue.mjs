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

// Severity bands, transcribed from the normative table in Volume I §3. This
// constant is not trusted: `assertBandTable` below re-parses that table out of
// the prose and fails the build if the two ever disagree. A comment claiming to
// follow the mandate is exactly the kind of unverified claim the mandate exists
// to catch, so the claim is machine-checked instead.
const BANDS = [
  { band: 'STOP-SHIP', min: 10, max: 10 },
  { band: 'BLOCKER-1', min: 9, max: 9 },
  { band: 'BLOCKER-2', min: 8, max: 8 },
  { band: 'MUST-FIX', min: 7, max: 7 },
  { band: 'SHOULD-FIX', min: 6, max: 6 },
  { band: 'PLAN', min: 5, max: 5 },
  { band: 'ASSESS', min: 1, max: 4 },
];

const BAND_NAMES = BANDS.map(({ band }) => band);

// Conditional escalations, transcribed from the bullet list in Volume I §3. A
// check's `band` is always its base band; an escalation is a documented
// condition that moves it, and is recorded rather than applied. The ids are
// asserted to exist, and the escalations §7 states in its italic "plus …" tails
// are asserted to be a subset of this table.
const ESCALATIONS = {
  'A-01': {
    to: 'STOP-SHIP',
    condition:
      'A-01 fails and A-39 fails — neither a deterministic verification gate nor an independent adversarial verifier exists.',
  },
  'A-02': {
    to: 'STOP-SHIP',
    condition: 'Mutation testing shows the suite cannot detect injected faults.',
  },
  'A-36': {
    to: 'BLOCKER-1',
    condition: "The pipeline's seeded-defect catch rate (§9.3) is not measured on a continuing basis.",
  },
  'A-39': {
    to: 'STOP-SHIP',
    condition:
      'A-01 fails and A-39 fails — neither a deterministic verification gate nor an independent adversarial verifier exists.',
  },
  'B-35': {
    to: 'STOP-SHIP',
    condition: 'Any code-writing agent identity can write to the policy bundle that gates it.',
  },
  'C-06': {
    to: 'STOP-SHIP',
    condition: 'Any model here can call a tool that writes, sends, spends, deletes or executes.',
  },
  'C-09': {
    to: 'STOP-SHIP',
    condition:
      'Any AI system here is high-risk on the EU market — §3 makes C-09 a hard gate at 10. Note §7 tables list C-09 at its base band; §3 governs.',
  },
  'C-37': {
    to: 'BLOCKER-1',
    condition: 'Any production component has no attested provenance chain.',
  },
};

const CHECK_HEADING = /^\*\*([ABC]-\d{2}) · (.+?)\*\* — Priority \*\*(\d{1,2})\/10\*\*(.*)$/gm;

// The §3 band table: `| **10** | `STOP-SHIP` | … |`, with `≤4` on the last row.
const BAND_TABLE_ROW = /^\|\s*\*\*(≤?)(\d{1,2})\*\*\s*\|\s*`([A-Z0-9-]+)`\s*\|/gm;

// The §7 execution-order rows, in either the three-column form
// (`| **BAND** | 9 | ids |`) or Volume I's two-column planning form.
const ORDER_TABLE_ROW = new RegExp(
  String.raw`^\|\s*\*\*(${BAND_NAMES.join('|')})\*\*\s*\|(.+)\|\s*$`,
  'gm',
);

const CHECK_ID = /`([ABC]-\d{2})`/g;

const bandFor = (priority) =>
  BANDS.find(({ min, max }) => priority >= min && priority <= max)?.band ?? 'UNBANDED';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function parseVolume(source, volume) {
  const checks = [];
  const matches = [...source.matchAll(CHECK_HEADING)];

  for (const [index, match] of matches.entries()) {
    const [, id, title, priorityText, trailer] = match;
    const priority = Number(priorityText);

    // A check's body runs to the next check heading, then stops at the first
    // section heading inside that span. Ending it at the next bold line instead
    // would let prose from a following section — the structural-remediation
    // sections in particular — be attributed to the last check before it.
    const blockStart = match.index + match[0].length;
    const blockEnd = index + 1 < matches.length ? matches[index + 1].index : source.length;
    const span = source.slice(blockStart, blockEnd);
    const sectionBreak = span.search(/^#{1,6} /m);
    const block = sectionBreak === -1 ? span : span.slice(0, sectionBreak);

    // A check is STOP-SHIP either by direct mark in its heading (outside the italic
    // annotation) or by a conditional escalation §3 describes. The two are not
    // interchangeable: only a direct mark holds production down from Phase 0.
    const directMark = /—\s*`STOP-SHIP`/.test(trailer);
    const escalation = ESCALATIONS[id] ?? null;
    const escalatesToStopShip = escalation?.to === 'STOP-SHIP';

    checks.push({
      id,
      track: id[0],
      title,
      priority,
      band: bandFor(priority),
      stop_ship: directMark || escalatesToStopShip,
      stop_ship_class: directMark ? 'direct' : escalatesToStopShip ? 'conditional' : null,
      escalation,
      substitutions: [...new Set([...trailer.matchAll(/`(S\d{1,2})`/g)].map((m) => m[1]))],
      has_structural_fix: block.includes('**Structural fix (S13):**'),
      has_standing_control: block.includes('**Standing control:**'),
      volume: volume.id,
      part: volume.part,
    });
  }

  return checks;
}

// Re-parse the §3 band table out of the prose and assert the BANDS constant
// against it, so the generator cannot quietly disagree with the text it cites.
function assertBandTable(source, assert) {
  const rows = [...source.matchAll(BAND_TABLE_ROW)].map(([, atMost, priority, band]) => ({
    priority: Number(priority),
    band,
    atMost: atMost === '≤',
  }));

  if (!assert(rows.length === BANDS.length, `§3 band table: expected ${BANDS.length} rows, parsed ${rows.length}`)) {
    return false;
  }

  const expected = new Map();
  for (const { priority, band, atMost } of rows) {
    for (const value of atMost ? [...Array(priority).keys()].map((n) => n + 1) : [priority]) {
      expected.set(value, band);
    }
  }

  const disagreements = [...expected.entries()]
    .filter(([priority, band]) => bandFor(priority) !== band)
    .map(([priority, band]) => `priority ${priority}: §3 says ${band}, generator says ${bandFor(priority)}`);

  return assert(disagreements.length === 0, `band table disagrees with §3 — ${disagreements.join('; ')}`);
}

// The §7 execution-order tables list every check under its band, with
// conditional escalations in an italic "— *plus `X` if …*" tail. They are an
// independent statement of the same facts the check headings carry, so they
// serve as an oracle: if the catalogue and §7 disagree, the build fails.
function parseOrderTables(source) {
  const base = new Map();
  const conditional = new Map();

  for (const [, band, cells] of source.matchAll(ORDER_TABLE_ROW)) {
    const [baseCell, ...tail] = cells.split(/—\s*\*/);
    for (const [, id] of baseCell.matchAll(CHECK_ID)) base.set(id, band);
    for (const [, id] of tail.join(' ').matchAll(CHECK_ID)) conditional.set(id, band);
  }

  return { base, conditional };
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

  const orderBase = new Map();
  const orderConditional = new Map();

  for (const volume of VOLUMES) {
    const source = await readFile(join(root, volume.path), 'utf8');
    const parsed = parseVolume(source, volume);

    healthy =
      assert(
        parsed.length === volume.expectedChecks,
        `${volume.path}: expected ${volume.expectedChecks} checks, parsed ${parsed.length}`,
      ) && healthy;

    if (volume.part === 1) healthy = assertBandTable(source, assert) && healthy;

    // Volume I restates Track C's order for planning awareness, so the same id
    // is listed in both volumes. Disagreement between them is itself a defect.
    const { base, conditional } = parseOrderTables(source);
    for (const [id, band] of base) {
      healthy =
        assert(
          !orderBase.has(id) || orderBase.get(id) === band,
          `§7 tables disagree across volumes on ${id}: ${orderBase.get(id)} vs ${band}`,
        ) && healthy;
      orderBase.set(id, band);
    }
    for (const [id, band] of conditional) orderConditional.set(id, band);

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

  // The structural-fix count is quoted verbatim in the prose (§6.5) and in the
  // documentation. Nothing else compares them, so a parser change that silently
  // gained or lost one would go unnoticed.
  const structural = checks.filter((check) => check.has_structural_fix).length;
  healthy = assert(structural === 44, `expected 44 checks with a structural fix, parsed ${structural}`) && healthy;

  // Every escalation id must exist, so the table cannot rot across a renumber.
  const unknownEscalations = Object.keys(ESCALATIONS).filter((id) => !ids.includes(id));
  healthy = assert(
    unknownEscalations.length === 0,
    `escalation table names checks that do not exist: ${unknownEscalations.join(', ')}`,
  ) && healthy;

  // §7 is an independent statement of every check's band. If it disagrees with
  // the band derived from the check heading, one of the two is wrong.
  healthy = assert(
    orderBase.size === checks.length,
    `§7 tables list ${orderBase.size} checks, catalogue has ${checks.length}`,
  ) && healthy;

  const bandConflicts = checks
    .filter((check) => orderBase.has(check.id) && orderBase.get(check.id) !== check.band)
    .map((check) => `${check.id}: §7 says ${orderBase.get(check.id)}, priority ${check.priority} gives ${check.band}`);
  healthy = assert(bandConflicts.length === 0, `§7 disagrees with the derived band — ${bandConflicts.join('; ')}`) && healthy;

  // Every escalation §7 states must be one this catalogue records. The reverse
  // does not hold: §3 carries escalations (C-09) that §7's tails omit.
  const unrecorded = [...orderConditional.entries()]
    .filter(([id, band]) => ESCALATIONS[id]?.to !== band)
    .map(([id, band]) => `${id} → ${band}`);
  healthy = assert(
    unrecorded.length === 0,
    `§7 states escalations the catalogue does not record: ${unrecorded.join(', ')}`,
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
  // Never write a catalogue that failed its own asserts. Writing first would
  // leave a miscounted file on disk under a `linguist-generated` diff GitHub
  // collapses by default — a silently wrong index is worse than no index.
  if (!healthy) {
    console.error('build-catalogue: refusing to write a catalogue that failed its own asserts.');
    process.exit(1);
  }
  await writeFile(target, serialised);
  console.log(
    `build-catalogue: wrote ${catalogue.check_count} checks ` +
      `(${catalogue.totals.stop_ship_direct.length} STOP-SHIP, ` +
      `${catalogue.totals.with_structural_fix} with a structural fix).`,
  );
}
