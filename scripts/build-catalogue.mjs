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

// §6.5's structural-remediation tables. Each row is one move: the bold lead cell
// names it, the last cell lists the checks it collapses. §5 requires the Phase-0
// master index to record door membership, so it is parsed rather than restated.
const DOOR_TABLE_ROW = /^\|\s*\*\*(.+?)\*\*[^|]*\|[^|]*\|([^|]*)\|\s*$/gm;

// Written-out numerals, so the summary sentence in §6.5.1 can be used as an
// oracle for the parse. Unknown words fail the assert rather than being skipped.
const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, 'twenty-eight': 28, 'twenty-nine': 29,
  thirty: 30, 'thirty-one': 31, 'thirty-two': 32,
};

const bandFor = (priority) =>
  BANDS.find(({ min, max }) => priority >= min && priority <= max)?.band ?? 'UNBANDED';

// Prefixed, matching mandate/manifest.json. The same digest published under the
// same field name in two encodings is a trap for anyone comparing them.
const sha256 = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`;

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
    // Mask fenced code before looking for the section break: a `# comment` line
    // inside a shell example would otherwise truncate the body and drop the
    // check's structural-fix and standing-control markers. Masking rather than
    // deleting keeps offsets aligned with `span` for the slice below.
    const masked = span.replace(/^```[\s\S]*?^```/gm, (fence) => fence.replace(/[^\n]/g, ' '));
    const sectionBreak = masked.search(/^#{1,6} /m);
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

  // Build the priority→band map, rejecting overlap rather than letting a later
  // row win. Without this, a `≤10` row anywhere above the last would silently
  // absorb every priority beneath it and the build would stay green.
  const expected = new Map();
  for (const { priority, band, atMost } of rows) {
    for (const value of atMost ? [...Array(priority).keys()].map((n) => n + 1) : [priority]) {
      if (expected.has(value) && expected.get(value) !== band) {
        return assert(
          false,
          `§3 band table assigns priority ${value} to both ${expected.get(value)} and ${band}`,
        );
      }
      expected.set(value, band);
    }
  }

  if (!assert(expected.size === 10, `§3 band table covers ${expected.size} priorities, expected 10`)) {
    return false;
  }

  const disagreements = [...expected.entries()]
    .filter(([priority, band]) => bandFor(priority) !== band)
    .map(([priority, band]) => `priority ${priority}: §3 says ${band}, generator says ${bandFor(priority)}`);

  return assert(disagreements.length === 0, `band table disagrees with §3 — ${disagreements.join('; ')}`);
}

// Re-parse §3's conditional-escalation bullets and assert the ESCALATIONS table
// against them in BOTH directions. Without this the table has no oracle in the
// text that defines it: §7's italic tails omit C-09 entirely, so deleting that
// entry produced a green build publishing C-09 as a check that never escalates.
function assertEscalationSet(source, directlyMarked, assert) {
  const heading = '**Conditional escalations — apply these before you begin:**';
  const start = source.indexOf(heading);
  if (!assert(start !== -1, '§3 conditional-escalation list not found')) return false;

  const end = source.indexOf('\n---', start);
  const bullets = source
    .slice(start + heading.length, end === -1 ? source.length : end)
    .split('\n')
    .filter((line) => line.startsWith('- '));

  if (!assert(bullets.length > 0, '§3 conditional-escalation list parsed no bullets')) return false;

  const stated = new Map();
  for (const bullet of bullets) {
    // A bullet without a re-banding arrow is commentary, not an escalation —
    // the C-27 applicability note is the case in point.
    if (!bullet.includes('→')) continue;

    const to = /`STOP-SHIP`|priority 10|hard gate at 10/.test(bullet)
      ? 'STOP-SHIP'
      : /`BLOCKER-1`/.test(bullet)
        ? 'BLOCKER-1'
        : null;
    if (to === null) continue;

    for (const [, id] of bullet.matchAll(/\b([ABC]-\d{2})\b/g)) {
      // A check already carrying a direct mark cannot escalate into one. This is
      // what excludes the C-04 bullet, which restates its standing priority.
      if (directlyMarked.has(id)) continue;
      stated.set(id, to);
    }
  }

  const missing = [...stated.keys()].filter((id) => !ESCALATIONS[id]);
  const extra = Object.keys(ESCALATIONS).filter((id) => !stated.has(id));
  const wrongTarget = [...stated.entries()]
    .filter(([id, to]) => ESCALATIONS[id] && ESCALATIONS[id].to !== to)
    .map(([id, to]) => `${id}: §3 says ${to}, table says ${ESCALATIONS[id].to}`);

  let healthy = assert(missing.length === 0, `§3 states escalations the table omits: ${missing.join(', ')}`);
  healthy = assert(extra.length === 0, `the table records escalations §3 does not state: ${extra.join(', ')}`) && healthy;
  healthy = assert(wrongTarget.length === 0, `escalation targets disagree with §3 — ${wrongTarget.join('; ')}`) && healthy;
  return healthy;
}

// Parse the door tables in §6.5.1 (chokepoints) and §6.5.2 (boundaries), and
// check the result against the count §6.5.1 states about itself.
function parseDoors(source, assert) {
  const start = source.indexOf('### 6.5.1');
  const end = source.indexOf('### 6.5.3');
  if (start === -1 || end === -1 || end < start) {
    assert(false, '§6.5 door tables not found');
    return { doors: new Map(), healthy: false };
  }

  const region = source.slice(start, end);
  const chokepointEnd = region.indexOf('### 6.5.2');
  const doors = new Map();
  let chokepointDoors = 0;
  const chokepointChecks = new Set();

  for (const match of region.matchAll(DOOR_TABLE_ROW)) {
    const [, rawName, checkCell] = match;
    // Trim the em-dash gloss that follows several door names.
    const name = rawName.split(' — ')[0].trim();
    // Parenthesised ids are annotations, not members: the tenancy door lists
    // `C-01` and then names "the clone class behind it (`A-07`)". Counting the
    // annotation is what makes the parse disagree with §6.5.1's own total.
    const ids = [...checkCell.replace(/\([^)]*\)/g, '').matchAll(CHECK_ID)].map(([, id]) => id);
    if (ids.length === 0) continue;

    const inChokepoints = match.index < chokepointEnd;
    if (inChokepoints) {
      chokepointDoors += 1;
      for (const id of ids) chokepointChecks.add(id);
    }

    for (const id of ids) {
      if (!doors.has(id)) doors.set(id, []);
      if (!doors.get(id).includes(name)) doors.get(id).push(name);
    }
  }

  // "**Seven doors. Twenty-eight checks.**" — the section's own summary.
  const stated = region.match(/\*\*([A-Za-z-]+) doors\. ([A-Za-z-]+) checks\.\*\*/);
  let healthy = assert(stated !== null, '§6.5.1 no longer states its door and check counts');
  if (stated) {
    const expectedDoors = NUMBER_WORDS[stated[1].toLowerCase()];
    const expectedChecks = NUMBER_WORDS[stated[2].toLowerCase()];
    healthy =
      assert(
        expectedDoors !== undefined && expectedChecks !== undefined,
        `§6.5.1 states "${stated[1]} doors, ${stated[2]} checks" and this parser cannot read those numerals`,
      ) && healthy;
    healthy =
      assert(
        expectedDoors === undefined || chokepointDoors === expectedDoors,
        `§6.5.1 states ${stated[1]} doors, parsed ${chokepointDoors}`,
      ) && healthy;
    healthy =
      assert(
        expectedChecks === undefined || chokepointChecks.size === expectedChecks,
        `§6.5.1 states ${stated[2]} checks across its doors, parsed ${chokepointChecks.size}`,
      ) && healthy;
  }

  return { doors, healthy };
}

// The §7 execution-order tables list every check under its band, with
// conditional escalations in an italic "— *plus `X` if …*" tail. They are an
// independent statement of the same facts the check headings carry, so they
// serve as an oracle: if the catalogue and §7 disagree, the build fails.
function parseOrderTables(source) {
  const base = new Map();
  const conditional = new Map();

  for (const [, band, cells] of source.matchAll(ORDER_TABLE_ROW)) {
    // Accept either italic marker: rewriting `— *plus …*` as `— _plus …_` would
    // otherwise collapse the conditional map to nothing, and every escalation
    // oracle downstream would pass vacuously.
    const [baseCell, ...tail] = cells.split(/—\s*[*_]/);
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
  const doorsById = new Map();
  let volumeOneSource = null;

  for (const volume of VOLUMES) {
    const source = await readFile(join(root, volume.path), 'utf8');
    const parsed = parseVolume(source, volume);

    healthy =
      assert(
        parsed.length === volume.expectedChecks,
        `${volume.path}: expected ${volume.expectedChecks} checks, parsed ${parsed.length}`,
      ) && healthy;

    // §3 lives in Volume I, but its escalation bullets name Track C checks, so
    // the assert needs the full catalogue and runs once the loop has finished.
    if (volume.part === 1) {
      healthy = assertBandTable(source, assert) && healthy;
      const parsedDoors = parseDoors(source, assert);
      healthy = parsedDoors.healthy && healthy;
      for (const [id, names] of parsedDoors.doors) doorsById.set(id, names);
      volumeOneSource = source;
    }

    // Volume I restates Track C's order for planning awareness, so the same id
    // is listed in both volumes. Disagreement between them is itself a defect.
    const { base, conditional } = parseOrderTables(source);

    // Each volume's own §7 must cover the checks that volume defines. Without
    // this, Volume II's entire table could vanish and Volume I's restatement of
    // Track C would keep the merged coverage assert green.
    const uncovered = parsed.map((check) => check.id).filter((id) => !base.has(id));
    healthy =
      assert(uncovered.length === 0, `${volume.path}: §7 tables omit ${uncovered.join(', ')}`) && healthy;

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

  // §5 requires the Phase-0 master index to carry, per check, its door
  // membership (§6.5) and its within-band order. Both are derived here so the
  // scaffolder can project them rather than inventing them.
  for (const check of checks) {
    check.doors = doorsById.get(check.id) ?? [];
  }

  // The §7 queue is worked band by band, highest first, and within a band in id
  // order. This records each check's position in that queue.
  const bandCursor = new Map();
  for (const check of [...checks].sort(
    (left, right) => right.priority - left.priority || left.id.localeCompare(right.id),
  )) {
    const position = bandCursor.get(check.band) ?? 0;
    check.within_band_order = position;
    bandCursor.set(check.band, position + 1);
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

  // The direct STOP-SHIP mark is read by one literal regex over the heading, and
  // was the last catalogue fact with no oracle behind it: reformatting a heading
  // would demote a priority-10 check out of the STOP-SHIP set with every gate
  // green. The §3 band table is the oracle — priority 10 IS STOP-SHIP.
  const unmarked = checks
    .filter((check) => check.band === 'STOP-SHIP' && check.stop_ship_class !== 'direct')
    .map((check) => check.id);
  healthy = assert(
    unmarked.length === 0,
    `priority-10 checks whose heading yielded no direct \`STOP-SHIP\` mark: ${unmarked.join(', ')}`,
  ) && healthy;

  healthy =
    assertEscalationSet(
      volumeOneSource ?? '',
      new Set(checks.filter((check) => check.stop_ship_class === 'direct').map((check) => check.id)),
      assert,
    ) && healthy;

  // Every escalation id must exist, so the table cannot rot across a renumber.
  const unknownEscalations = Object.keys(ESCALATIONS).filter((id) => !ids.includes(id));
  healthy = assert(
    unknownEscalations.length === 0,
    `escalation table names checks that do not exist: ${unknownEscalations.join(', ')}`,
  ) && healthy;

  // §7 is an independent statement of every check's band. If it disagrees with
  // the band derived from the check heading, one of the two is wrong.
  // Set equality, not cardinality: equal counts with a swapped pair would pass a
  // size comparison unnoticed.
  const idSet = new Set(ids);
  const notListed = ids.filter((id) => !orderBase.has(id));
  const phantom = [...orderBase.keys()].filter((id) => !idSet.has(id));
  healthy = assert(notListed.length === 0, `§7 tables omit: ${notListed.join(', ')}`) && healthy;
  healthy = assert(phantom.length === 0, `§7 tables list checks the catalogue does not define: ${phantom.join(', ')}`) && healthy;

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

  // And the reverse, so a table entry cannot exist that §7 never mentions.
  // C-09 is the documented exception: §3 escalates it, §7 lists it at its base
  // band. Naming it here keeps the exception visible instead of emergent.
  const SECTION_7_SILENT = new Set(['C-09']);
  const unstated = Object.entries(ESCALATIONS)
    .filter(([id]) => !SECTION_7_SILENT.has(id) && !orderConditional.has(id))
    .map(([id, { to }]) => `${id} → ${to}`);
  healthy = assert(
    unstated.length === 0,
    `escalations the catalogue records that §7's tails do not state: ${unstated.join(', ')}`,
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
// Mode selection is explicit and closed: an unrecognised argument must never
// fall through to write mode, where it would silently re-attest whatever the
// prose currently says. `--verify` — the name of this repo's own npm script —
// is exactly the near-miss that would do it.
const args = process.argv.slice(2);
const unknown = args.filter((arg) => arg !== '--check');
if (unknown.length > 0) {
  console.error(`build-catalogue: unknown argument(s): ${unknown.join(', ')}. Only --check is accepted.`);
  process.exit(2);
}
const checkMode = args.includes('--check');


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
