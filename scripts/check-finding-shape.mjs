#!/usr/bin/env node
// Validates finding records against catalogue/finding-record.schema.json.
//
// A schema nothing runs is documentation. This is the runner: a small, focused
// evaluator for the JSON Schema subset that file actually uses, so the §5
// fail-closed rules — a residual risk needs a compensating control and a
// tripwire, a PASS needs a demonstrated standing control — execute in CI rather
// than sitting in prose. Deliberately dependency-free: the repository ships one
// pinned dev dependency and CI installs with --ignore-scripts, and a validator
// is a poor reason to widen that surface.
//
// Usage:
//   node scripts/check-finding-shape.mjs --file audit/03-findings.json
//   node scripts/check-finding-shape.mjs --file templates/finding-record.json
//
// Accepts a single record or an array of them.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const typeOf = (value) => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
};

const matchesType = (value, expected) => {
  const actual = typeOf(value);
  const allowed = Array.isArray(expected) ? expected : [expected];
  return allowed.some((name) => (name === 'number' ? actual === 'integer' || actual === 'number' : name === actual));
};

// Returns an array of human-readable problems. Empty means valid.
function validate(value, schema, path = '') {
  const problems = [];
  const at = path || '(root)';

  if (schema.type !== undefined && !matchesType(value, schema.type)) {
    const want = Array.isArray(schema.type) ? schema.type.join(' | ') : schema.type;
    return [`${at}: expected ${want}, got ${typeOf(value)}`];
  }

  if (schema.const !== undefined && value !== schema.const) {
    problems.push(`${at}: expected the constant ${JSON.stringify(schema.const)}, got ${JSON.stringify(value)}`);
  }

  if (schema.enum !== undefined && !schema.enum.includes(value)) {
    problems.push(`${at}: ${JSON.stringify(value)} is not one of ${schema.enum.join(', ')}`);
  }

  if (schema.not !== undefined && validate(value, schema.not, path).length === 0) {
    problems.push(`${at}: value is disallowed here (${JSON.stringify(value)})`);
  }

  if (typeof value === 'string' && schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
    problems.push(`${at}: "${value}" does not match ${schema.pattern}`);
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) problems.push(`${at}: ${value} < minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) problems.push(`${at}: ${value} > maximum ${schema.maximum}`);
  }

  if (Array.isArray(value) && schema.items !== undefined) {
    value.forEach((item, index) => problems.push(...validate(item, schema.items, `${at}[${index}]`)));
  }

  if (typeOf(value) === 'object') {
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key)) problems.push(`${at}: missing required property "${key}"`);
    }

    if (schema.properties !== undefined) {
      for (const [key, subSchema] of Object.entries(schema.properties)) {
        if (Object.hasOwn(value, key)) {
          problems.push(...validate(value[key], subSchema, path ? `${path}.${key}` : key));
        }
      }
    }

    if (schema.additionalProperties === false && schema.properties !== undefined) {
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(schema.properties, key)) problems.push(`${at}: unknown property "${key}"`);
      }
    }
  }

  for (const branch of schema.allOf ?? []) {
    if (branch.if !== undefined) {
      // An `if` that does not match is not a failure — it simply does not apply.
      if (validate(value, branch.if, path).length === 0 && branch.then !== undefined) {
        problems.push(...validate(value, branch.then, path));
      }
      continue;
    }
    problems.push(...validate(value, branch, path));
  }

  return problems;
}

const argv = process.argv.slice(2);
const fileIndex = argv.indexOf('--file');
const file = fileIndex === -1 ? null : argv[fileIndex + 1];

if (!file) {
  console.error('Usage: node scripts/check-finding-shape.mjs --file <path to a finding record or an array of them>');
  process.exit(2);
}

const schema = JSON.parse(await readFile(join(root, 'catalogue/finding-record.schema.json'), 'utf8'));
const parsed = JSON.parse(await readFile(file, 'utf8'));
const records = Array.isArray(parsed) ? parsed : [parsed];

let failures = 0;
records.forEach((record, index) => {
  const label = record?.id ?? `record ${index}`;
  for (const problem of validate(record, schema)) {
    console.error(`check-finding-shape: ${label}: ${problem}`);
    failures += 1;
  }
});

if (failures > 0) {
  console.error(`check-finding-shape: ${failures} problem(s) across ${records.length} record(s) in ${file}`);
  process.exit(1);
}

console.log(`check-finding-shape: ${records.length} record(s) in ${file} conform to the §5 schema.`);
