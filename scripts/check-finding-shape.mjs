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

import { readdir, readFile } from 'node:fs/promises';
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

    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(schema.properties ?? {}, key)) problems.push(`${at}: unknown property "${key}"`);
      }
    }
  }

  for (const branch of schema.allOf ?? []) {
    // A branch's `if`/`then` are evaluated, and so are its sibling keywords —
    // skipping them would silently drop constraints written alongside.
    problems.push(...validate(value, branch, path));
  }

  if (schema.if !== undefined) {
    // An `if` that does not match is not a failure — it simply does not apply.
    const matched = validate(value, schema.if, path).length === 0;
    if (matched && schema.then !== undefined) problems.push(...validate(value, schema.then, path));
    if (!matched && schema.else !== undefined) problems.push(...validate(value, schema.else, path));
  }

  return problems;
}

// Keywords this evaluator actually implements. Anything else in the schema is a
// constraint that would be silently ignored, which turns a future tightening of
// §5 into a no-op while CI still reports conformance. So it fails closed: the
// validator refuses to run against a schema it cannot fully honour.
const SUPPORTED = new Set([
  '$schema', '$id', '$comment', 'title', 'description',
  'type', 'const', 'enum', 'not', 'pattern', 'minimum', 'maximum',
  'items', 'required', 'properties', 'additionalProperties',
  'allOf', 'if', 'then', 'else',
]);

// Walks only schema positions. `properties` maps property NAMES to schemas, so
// its keys are data, not keywords, and must not be checked against SUPPORTED.
function assertSupported(node, at = '#') {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((entry, index) => assertSupported(entry, `${at}[${index}]`));
    return;
  }

  for (const key of Object.keys(node)) {
    if (!SUPPORTED.has(key)) {
      console.error(
        `check-finding-shape: schema uses "${key}" at ${at}, which this evaluator does not implement ` +
          '— it would be silently ignored. Implement it or remove it.',
      );
      process.exit(2);
    }
  }

  for (const key of ['not', 'items', 'if', 'then', 'else']) {
    if (node[key] !== undefined) assertSupported(node[key], `${at}/${key}`);
  }
  for (const branch of node.allOf ?? []) assertSupported(branch, `${at}/allOf`);
  for (const [name, sub] of Object.entries(node.properties ?? {})) {
    assertSupported(sub, `${at}/properties/${name}`);
  }
}

const argv = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = argv.indexOf(flag);
  return index === -1 ? null : argv[index + 1];
};

const file = valueAfter('--file');
const directory = valueAfter('--dir');
// Inverts the verdict: every file must FAIL validation. This is what makes the
// validator itself testable — without it, deleting the code that enforces every
// §5 clause would leave the whole suite green.
const expectInvalid = argv.includes('--expect-invalid');

if (!file && !directory) {
  console.error(
    'Usage: node scripts/check-finding-shape.mjs --file <record or array> [--expect-invalid]\n' +
      '       node scripts/check-finding-shape.mjs --dir <directory of records> [--expect-invalid]',
  );
  process.exit(2);
}

const readJson = async (path) => {
  const text = await readFile(path, 'utf8').catch((error) => {
    console.error(
      error.code === 'ENOENT'
        ? `check-finding-shape: no such file: ${path}`
        : `check-finding-shape: cannot read ${path}: ${error.message}`,
    );
    process.exit(2);
  });
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error(`check-finding-shape: ${path} is not valid JSON — ${error.message}`);
    process.exit(2);
  }
};

const schema = await readJson(join(root, 'catalogue/finding-record.schema.json'));
assertSupported(schema);

const targets = file
  ? [file]
  : (await readdir(directory)).filter((name) => name.endsWith('.json')).sort().map((name) => join(directory, name));

if (targets.length === 0) {
  console.error(`check-finding-shape: no .json files found in ${directory}`);
  process.exit(2);
}

let exitCode = 0;
let checked = 0;

for (const path of targets) {
  const parsed = await readJson(path);
  const records = Array.isArray(parsed) ? parsed : [parsed];
  const problems = records.flatMap((record, index) =>
    validate(record, schema).map((problem) => `${record?.id ?? `record ${index}`}: ${problem}`),
  );
  checked += records.length;

  if (expectInvalid) {
    if (problems.length === 0) {
      console.error(`check-finding-shape: ${path} was expected to FAIL validation, but it passed.`);
      exitCode = 1;
    } else {
      console.log(`check-finding-shape: ${path} correctly rejected — ${problems[0]}`);
    }
    continue;
  }

  for (const problem of problems) {
    console.error(`check-finding-shape: ${problem}`);
    exitCode = 1;
  }
}

if (exitCode !== 0) {
  console.error(`check-finding-shape: validation failed across ${targets.length} file(s).`);
  process.exit(exitCode);
}

console.log(
  expectInvalid
    ? `check-finding-shape: all ${targets.length} negative fixture(s) were rejected, as required.`
    : `check-finding-shape: ${checked} record(s) across ${targets.length} file(s) conform to the §5 schema.`,
);
