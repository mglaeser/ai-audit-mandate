#!/usr/bin/env node
// Verifies that every internal link in every tracked Markdown file resolves.
//
// This exists because the obvious version of this check is wrong in a way that
// hides real breakage: a link regex that stops at `#` silently skips every
// anchor in the repository and then reports success. Anchors are resolved here
// against the headings they claim to point at, using GitHub's slug rules.
//
// Checked: relative paths exist and are tracked by git (a file present locally
// but never committed is a 404 for everyone else), and fragments match a real
// heading. Absolute URLs are listed but not fetched — CI should not depend on
// the reachability of the public internet.
//
// Usage:
//   node scripts/check-links.mjs

import { execFile } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, relative } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const IGNORED = new Set(['.git', 'node_modules']);

async function walk(directory = '') {
  const entries = await readdir(join(root, directory), { withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    if (IGNORED.has(entry.name)) continue;
    const path = directory ? `${directory}/${entry.name}` : entry.name;
    found.push(...(entry.isDirectory() ? await walk(path) : [path]));
  }
  return found;
}

// Prefer git: a file present locally but never committed is a 404 for everyone
// else, and only git knows the difference. Fall back to the filesystem so the
// check still runs from a downloaded archive rather than dying on a stack trace.
async function inventory() {
  try {
    const { stdout } = await run('git', ['ls-files'], { cwd: root, maxBuffer: 1024 * 1024 * 16 });
    const files = stdout.split('\n').filter(Boolean);
    if (files.length > 0) return { files, source: 'git' };
  } catch {
    // Not a git checkout, or git is unavailable.
  }
  return { files: await walk(), source: 'filesystem' };
}

const { files, source } = await inventory();
const tracked = new Set(files);
const markdown = files.filter((path) => path.endsWith('.md'));

// GitHub's heading slugger: lowercase, drop anything that is not a word
// character, space or hyphen, then spaces to hyphens. Repeats get -1, -2, …
const slug = (heading) =>
  heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');

async function anchorsFor(path) {
  const text = await readFile(join(root, path), 'utf8');
  const seen = new Map();
  const anchors = new Set();

  // Skip fenced code blocks so a commented-out heading cannot mint an anchor.
  let fenced = false;
  for (const line of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) continue;

    const heading = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!heading) continue;

    // Strip inline markdown so `## \`code\` and **bold**` slugs like GitHub's.
    const base = slug(heading[2].replace(/[*_`]/g, ''));
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }

  // Explicit HTML anchors, e.g. <a id="foo"> or <h2 id="foo">.
  for (const [, id] of text.matchAll(/<[a-z][^>]*\sid=["']([^"']+)["']/gi)) anchors.add(id);

  return anchors;
}

const anchorCache = new Map();
const anchorsCached = async (path) => {
  if (!anchorCache.has(path)) anchorCache.set(path, await anchorsFor(path));
  return anchorCache.get(path);
};

// Inline links and images, plus HTML href/src.
const LINK = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const HTML_ATTR = /<[a-z][^>]*\s(?:href|src)=["']([^"']+)["']/gi;

const problems = [];
let checked = 0;
let external = 0;

for (const file of markdown) {
  const text = await readFile(join(root, file), 'utf8');
  const targets = [
    ...[...text.matchAll(LINK)].map((m) => m[1]),
    ...[...text.matchAll(HTML_ATTR)].map((m) => m[1]),
  ];

  for (const target of targets) {
    if (/^(https?:|mailto:|tel:|data:)/i.test(target)) {
      external += 1;
      continue;
    }

    checked += 1;
    const [pathPart, fragment] = target.split('#');
    const resolved = pathPart === '' ? file : normalize(join(dirname(file), pathPart));

    if (pathPart !== '') {
      const asFile = relative(root, join(root, resolved));
      const isDirectory = tracked.has(`${asFile}/README.md`) || [...tracked].some((p) => p.startsWith(`${asFile}/`));
      if (!tracked.has(asFile) && !isDirectory) {
        problems.push(`${file}: "${target}" → ${asFile} is not a tracked file or directory`);
        continue;
      }
      // A link into a directory cannot carry a heading fragment.
      if (!tracked.has(asFile)) continue;
    }

    if (!fragment) continue;

    const anchors = await anchorsCached(pathPart === '' ? file : relative(root, join(root, resolved)));
    if (!anchors.has(fragment.toLowerCase())) {
      problems.push(`${file}: "${target}" → no heading in that file produces the anchor "#${fragment}"`);
    }
  }
}

for (const problem of problems) console.error(`check-links: ${problem}`);

if (problems.length > 0) {
  console.error(`check-links: ${problems.length} broken link(s) across ${markdown.length} files.`);
  process.exit(1);
}

console.log(
  `check-links: ${checked} internal link(s) across ${markdown.length} files resolve ` +
    `(${external} external URL(s) listed, not fetched; inventory from ${source}).`,
);
