#!/usr/bin/env node
// Scaffolds an audit workspace in the repository under audit.
//
// Copies the engagement templates, seeds the check catalogue with all 119 checks
// at NO-EVIDENCE, and stamps the mandate hashes so the engagement is pinned to
// the exact text it runs under. Refuses to overwrite an existing workspace.
//
// Usage:
//   node scripts/new-engagement.mjs --target ../path/to/repository [--dir audit] [--force]

import { cp, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join, resolve } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseArguments(argv) {
  const options = { dir: 'audit', force: false, target: null };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--target') options.target = argv[++index];
    else if (flag === '--dir') {
      options.dir = argv[++index];
      // An empty or missing value would make the workspace the target itself,
      // and --force would then overwrite the target repository's own README.
      if (!options.dir) {
        console.error('new-engagement: --dir requires a directory name');
        process.exit(2);
      }
      // A path here escapes the target: `--dir ../..` writes outside it.
      if (options.dir !== basename(options.dir)) {
        console.error('new-engagement: --dir must be a single directory name, not a path');
        process.exit(2);
      }
    } else if (flag === '--force') options.force = true;
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
      '  --force   Allow writing into an existing workspace directory.',
    ].join('\n'),
  );
  process.exit(options.help ? 0 : 2);
}

const target = resolve(options.target);
const workspace = join(target, options.dir);

const exists = await access(target).then(
  () => true,
  () => false,
);
if (!exists) {
  console.error(`new-engagement: target does not exist: ${target}`);
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
const seeded = {
  catalogue_version: '1.0',
  note:
    'Seeded from the mandate catalogue. Track C is registered as planned-extension: part2 — ' +
    'its 40 checks are counted against production eligibility from day one.',
  source_manifest: manifest.combined.sha256,
  registered_check_count: catalogue.check_count,
  active_check_count: catalogue.checks.filter((check) => check.part === 1).length,
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
    state: check.part === 1 ? 'active' : 'planned-extension: part2',
  })),
};

// One record per check, in the §5 key set, every field empty. The shape is
// asserted in CI against catalogue/finding-record.schema.json, so an engagement
// starts from a record it cannot later claim was a different schema.
const findings = catalogue.checks.map((check) => ({
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
        taken: false,
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

status.registered_check_count = catalogue.check_count;
status.active_check_count = seeded.active_check_count;
status.mandate_manifest_hash = manifest.combined.sha256;
status.verdict_tally['NO-EVIDENCE'] = catalogue.check_count;
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
    `new-engagement: scaffolded ${workspace}`,
    `  ${catalogue.check_count} checks seeded at NO-EVIDENCE (${seeded.active_check_count} active, ` +
      `${catalogue.check_count - seeded.active_check_count} registered for Volume II)`,
    `  mandate pinned at ${manifest.combined.sha256}`,
    '',
    'Next: Phase 0 — freeze the baseline, then map the audit surface. Change nothing until Phase 3 closes.',
  ].join('\n'),
);
