#!/usr/bin/env node
// Generates the integrity manifest for the mandate volumes.
//
// An engagement pins the exact text it ran under. The manifest records a SHA-256
// per volume plus a combined hash over their deterministic concatenation, so an
// auditor — or a deploy gate — can prove the mandate has not shifted mid-flight.
//
// Usage:
//   node scripts/build-manifest.mjs           # write mandate/manifest.json
//   node scripts/build-manifest.mjs --check    # verify hashes still match (CI mode)

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEPARATOR = '\n---\n';

const PARTS = [
  {
    id: 'volume-i',
    part: 1,
    path: 'mandate/01-foundation-and-core-tracks.md',
    title: 'Foundation and Core Tracks',
    scope: 'Track A + Track B (79 checks), execution protocol, standing regime, Constitution',
  },
  {
    id: 'volume-ii',
    part: 2,
    path: 'mandate/02-security-privacy-assurance.md',
    title: 'Security, Privacy and Assurance',
    scope: 'Track C (40 checks), closing definition of done',
  },
];

const sha256 = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`;

const sources = await Promise.all(
  PARTS.map(async (part) => ({ ...part, text: await readFile(join(root, part.path), 'utf8') })),
);

const catalogue = JSON.parse(await readFile(join(root, 'catalogue/checks.json'), 'utf8'));

const manifest = {
  catalogue_version: catalogue.catalogue_version,
  generated_by: 'scripts/build-manifest.mjs',
  note:
    'Integrity manifest for the two mandate volumes. The combined hash covers the ' +
    'deterministic concatenation of the parts, joined by the separator below.',
  concatenation_rule: `${PARTS.map((part) => part.path).join(" + '\\n---\\n' + ")}`,
  parts: sources.map(({ id, part, path, title, scope, text }) => ({
    id,
    part,
    path,
    title,
    scope,
    bytes: Buffer.byteLength(text, 'utf8'),
    sha256: sha256(text),
  })),
  combined: {
    sha256: sha256(sources.map((source) => source.text).join(SEPARATOR)),
  },
  catalogue_file: {
    path: 'catalogue/checks.json',
    check_count: catalogue.check_count,
  },
  required_check_ids_count: catalogue.check_count,
};

const serialised = `${JSON.stringify(manifest, null, 2)}\n`;
const target = join(root, 'mandate/manifest.json');

if (process.argv.includes('--check')) {
  const current = await readFile(target, 'utf8').catch(() => null);
  if (current !== serialised) {
    console.error('build-manifest: mandate/manifest.json is stale — run `npm run manifest`.');
    process.exit(1);
  }
  console.log(`build-manifest: manifest is current (combined ${manifest.combined.sha256}).`);
} else {
  await writeFile(target, serialised);
  console.log(`build-manifest: wrote manifest (combined ${manifest.combined.sha256}).`);
}
