#!/usr/bin/env node
// Scaffolds an audit workspace in the repository under audit.
//
// Copies the engagement templates, seeds the active scope at NO-EVIDENCE, and
// stamps the mandate hashes so the engagement is pinned to the exact text it
// runs under. Refuses to overwrite an engagement that has recorded anything.
//
// The findings file carries the ACTIVE scope only — Volume I's 79 checks at
// catalogue v1.0, per §5, whose fail-closed gate compares the findings id-set
// against the active id-set. Track C's 40 are not absent: they are registered in
// 00-check-catalogue.json and named in engagement-status.json's
// pending_check_ids, which is what §5 means by "registered, counted, and named".
//
// Usage:
//   node scripts/new-engagement.mjs --target ../path/to/repository [--dir audit] [--force]

import { cp, mkdir, readFile, writeFile, access, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join, resolve } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// A flag that consumes the next argument must reject a missing value and a
// value that is itself a flag — `--dir --force` would otherwise create a
// directory named "--force" and silently drop the --force.
function valueFor(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith('--')) {
    console.error(`new-engagement: ${flag} requires a value`);
    process.exit(2);
  }
  return value;
}

function parseArguments(argv) {
  const options = { dir: 'audit', force: false, discard: false, target: null };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--target') options.target = valueFor(argv, ++index, '--target');
    else if (flag === '--dir') {
      options.dir = valueFor(argv, ++index, '--dir');
      // The workspace must be a child of the target. `basename` alone is not
      // enough: it is identity on "." and "..", so `--dir . --force` would
      // scaffold over the audited repository's own root and `--dir ..` would
      // write outside the target entirely.
      if (options.dir !== basename(options.dir) || options.dir === '.' || options.dir === '..') {
        console.error('new-engagement: --dir must be a single directory name, not a path');
        process.exit(2);
      }
    } else if (flag === '--force') options.force = true;
    else if (flag === '--discard-verdicts') options.discard = true;
    else if (flag === '--help' || flag === '-h') options.help = true;
    else {
      console.error(`new-engagement: unknown argument "${flag}"`);
      process.exit(2);
    }
  }
  return options;
}

const options = parseArguments(process.argv.slice(2));

if (options.help || !options.target) {
  console.log(
    [
      'Usage: node scripts/new-engagement.mjs --target <repository> [--dir audit] [--force]',
      '',
      '  --target  Repository to scaffold the audit workspace into (required).',
      '  --dir     Workspace directory name inside the target. Default: audit',
      '  --force   Overwrite an existing workspace, DISCARDING every recorded',
      '            verdict. Needs --discard-verdicts once anything is recorded.',
      '  --discard-verdicts',
      '            Confirms that losing recorded verdicts is intended.',
    ].join('\n'),
  );
  process.exit(options.help ? 0 : 2);
}

const target = resolve(options.target);
const workspace = join(target, options.dir);

const targetStats = await stat(target).catch(() => null);
if (!targetStats) {
  console.error(`new-engagement: target does not exist: ${target}`);
  process.exit(1);
}
if (!targetStats.isDirectory()) {
  console.error(`new-engagement: target is not a directory: ${target}`);
  process.exit(1);
}

const workspaceExists = await access(workspace).then(
  () => true,
  () => false,
);
if (workspaceExists && !options.force) {
  console.error(
    `new-engagement: ${workspace} already exists. Refusing to overwrite an engagement in flight.\n` +
      '  Pass --force only if you are certain no evidence will be lost.',
  );
  process.exit(1);
}

// A --force that silently discards recorded verdicts is a data-loss path with a
// convenience-flag name. Nothing here backs the file up: a second, unattested
// copy of evidence-bearing records that no gate reads and no manifest pins would
// be exactly the decorative control this mandate exists to name. So it refuses,
// and says what would be lost.
let discarded = 0;
if (workspaceExists && options.force) {
  const existing = await readFile(join(workspace, '03-findings.json'), 'utf8')
    .then(JSON.parse)
    .catch(() => null);
  if (Array.isArray(existing)) {
    discarded = existing.filter((record) => record?.verdict && record.verdict !== 'NO-EVIDENCE').length;
  }
  if (discarded > 0 && !options.discard) {
    console.error(
      `new-engagement: ${workspace} holds ${discarded} recorded verdict(s).\n` +
        '  --force would discard every one of them, and the evidence/ files they cite\n' +
        '  would be left behind referencing nothing. Pass --discard-verdicts as well\n' +
        '  if that is genuinely what you want.',
    );
    process.exit(1);
  }
}

const [catalogue, manifest, status] = await Promise.all([
  readFile(join(root, 'catalogue/checks.json'), 'utf8').then(JSON.parse),
  readFile(join(root, 'mandate/manifest.json'), 'utf8').then(JSON.parse),
  readFile(join(root, 'templates/engagement-status.json'), 'utf8').then(JSON.parse),
]);

await mkdir(workspace, { recursive: true });
await cp(join(root, 'templates/audit-workspace'), workspace, { recursive: true });
await mkdir(join(workspace, 'evidence'), { recursive: true });

// Seed the catalogue: Track A and B active for Volume I, Track C registered as a
// planned extension so its scope holds production down from the first commit.
const activeCount = catalogue.checks.filter((check) => check.part === 1).length;
const pendingCount = catalogue.check_count - activeCount;

const seeded = {
  // An ENGAGEMENT opens at catalogue v1.0 — Volume I's active scope — and moves
  // to v2.0 when Part 2 activates Track C. catalogue/checks.json declares "2.0"
  // because it defines the full 119. The two fields answer different questions
  // and must not be unified; CI asserts they stay different.
  catalogue_version: '1.0',
  note:
    'Seeded from the mandate catalogue. Track C is registered as planned-extension: part2 — ' +
    `its ${pendingCount} checks are counted against production eligibility from day one.`,
  source_manifest: manifest.combined.sha256,
  registered_check_count: catalogue.check_count,
  active_check_count: activeCount,
  required_check_ids: catalogue.required_check_ids,
  checks: catalogue.checks.map((check) => ({
    id: check.id,
    track: check.track,
    title: check.title,
    priority: check.priority,
    band: check.band,
    stop_ship: check.stop_ship,
    stop_ship_class: check.stop_ship_class,
    // §5 requires the manifest to carry each check's conditional-escalation
    // metadata, so a re-band cannot be argued after the fact.
    escalation: check.escalation,
    has_structural_fix: check.has_structural_fix,
    // §5 names door membership (§6.5) and within-band order among the fields the
    // master index carries, alongside the volume that defines the check.
    doors: check.doors,
    within_band_order: check.within_band_order,
    volume: check.volume,
    state: check.part === 1 ? 'active' : 'planned-extension: part2',
  })),
};

// One record per ACTIVE check, in the §5 key set, every field empty. §5 gates on
// the findings id-set equalling the active id-set, so a planned-extension record
// in here would break that comparison rather than strengthen it. The shape is
// asserted in CI against catalogue/finding-record.schema.json, so an engagement
// starts from a record it cannot later claim was a different schema.
const findings = catalogue.checks
  .filter((check) => check.part === 1)
  .map((check) => ({
    id: check.id,
    title: check.title,
    priority: check.priority,
    // Belt and braces: `band` is already STOP-SHIP for a direct mark. Keeping the
    // explicit branch means a future banding change cannot quietly demote one.
    band: check.stop_ship_class === 'direct' ? 'STOP-SHIP' : check.band,
    verdict: 'NO-EVIDENCE',
    probe: null,
    evidence: [],
    claim_conflict: null,
    impact: null,
    clone_sweep: null,
    human_dependency: null,
    substitutions_applied: [],
    structural_fix: check.has_structural_fix
      ? {
          available: true,
          move: null,
          collapses: [],
          // Undecided, not declined. `false` would assert a choice nobody has
          // made, and §5 requires a rationale the moment one is declined.
          taken: null,
          standing_control_avoided: null,
          rationale: null,
        }
      : null,
    fix: null,
    fix_change: null,
    verification: null,
    mutation_score: null,
    standing_control: null,
    independent_verifier: null,
    gate_decision: null,
    attestation: null,
    na_justification: null,
    residual_risk: null,
    compensating_control: null,
    tripwire: null,
  }));

// §3 bands, highest first. NO-EVIDENCE blocks exactly as an open finding of its
// own band does (§5), so a freshly scaffolded engagement is not quiet: it is
// loudly blocked, and the counters have to say so or the file is a soft lie.
const OPEN_BANDS = ['STOP-SHIP', 'BLOCKER-1', 'BLOCKER-2', 'MUST-FIX', 'SHOULD-FIX', 'PLAN', 'ASSESS'];
const open = findings.filter((record) => record.verdict === 'NO-EVIDENCE' || record.verdict === 'FAIL');

status.registered_check_count = catalogue.check_count;
status.active_check_count = seeded.active_check_count;
status.present_check_count = findings.length;
status.mandate_manifest_hash = manifest.combined.sha256;
status.verdict_tally['NO-EVIDENCE'] = findings.length;

// "Registered, counted, and named" (§5). The naming is this field, and shipping
// it empty while 40 checks are pending is the one way to get the count right and
// the meaning wrong. Derived from seeded.checks so it cannot drift from the
// state assignment above.
status.pending_check_ids = seeded.checks
  .filter((check) => check.state !== 'active')
  .map((check) => check.id);

status.open_stop_ship_count = open.filter((record) => record.band === 'STOP-SHIP').length;
status.open_blocker_1_count = open.filter((record) => record.band === 'BLOCKER-1').length;
status.open_blocker_2_count = open.filter((record) => record.band === 'BLOCKER-2').length;
status.open_fail_count = findings.filter((record) => record.verdict === 'FAIL').length;
status.highest_open_band = OPEN_BANDS.find((band) => open.some((record) => record.band === band)) ?? null;

delete status._comment;

const write = (name, value) =>
  writeFile(join(workspace, name), `${JSON.stringify(value, null, 2)}\n`);

await Promise.all([
  write('00-check-catalogue.json', seeded),
  write('03-findings.json', findings),
  write('engagement-status.json', status),
  writeFile(
    join(workspace, 'evidence/.gitkeep'),
    '# Evidence is append-only. Never rewrite a file in this directory.\n',
  ),
]);

console.log(
  [
    discarded > 0
      ? `new-engagement: OVERWROTE ${workspace} (discarded ${discarded} recorded verdict(s); ` +
        'evidence/ was left untouched and now references nothing)'
      : `new-engagement: scaffolded ${workspace}`,
    `  ${findings.length} active checks seeded at NO-EVIDENCE ` +
      `(${pendingCount} Track C checks registered for Volume II)`,
    `  mandate pinned at ${manifest.combined.sha256}`,
    '',
    'Next: Phase 0 — freeze the baseline, then map the audit surface. Change nothing until Phase 3 closes.',
  ].join('\n'),
);
