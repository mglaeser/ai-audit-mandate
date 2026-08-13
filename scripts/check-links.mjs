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

// GitHub's heading slugger: lowercase, strip anything that is not a letter,
// number, space, hyphen or UNDERSCORE, then spaces to hyphens. Underscores
// survive — `x86_64 notes` is `x86_64-notes`, not `x8664-notes`.
const slug = (heading) =>
  heading
    .replace(/[\t\p{Cc}]/gu, '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');

// CommonMark fence tracking. A parity toggle is not enough: fences nest by
// length, so a ```` ```` ```` block containing ``` would flip the flag back and
// every heading after it would be treated as real. That mints anchors GitHub
// never renders, and this checker would then approve links to them.
function* unfencedLines(text) {
  let marker = null;
  let length = 0;

  for (const line of text.split('\n')) {
    const fence = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);

    if (marker === null) {
      // An opening backtick fence may not carry a backtick in its info string.
      if (fence && !(fence[1][0] === '`' && fence[2].includes('`'))) {
        marker = fence[1][0];
        length = fence[1].length;
        continue;
      }
      yield line;
      continue;
    }

    // Close only on the same character, at least as long, with no info string.
    if (fence && fence[1][0] === marker && fence[1].length >= length && fence[2].trim() === '') {
      marker = null;
    }
  }
}

async function anchorsFor(path) {
  const text = await readFile(join(root, path), 'utf8');
  const anchors = new Set();

  for (const line of unfencedLines(text)) {
    const heading = line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*$/);
    if (!heading) continue;

    const base = slug(
      heading[2]
        // An IMAGE contributes nothing to the slug — GitHub does not fold alt
        // text in. A heading that is only an image renders with id="", so its
        // anchor does not exist at all. Strip images before links, or the `!`
        // is left behind and the alt text is wrongly counted.
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        // A text link contributes only its label.
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[*`]/g, '')
        // ATX closing sequence: `## Title ##`.
        .replace(/\s+#+\s*$/, ''),
    );

    // An image-only heading mints no anchor. Recording one would approve links
    // GitHub answers with a dead fragment.
    if (base === '') continue;

    // github-slugger's collision rule: probe upward until the slug is free.
    let candidate = base;
    let n = 0;
    while (anchors.has(candidate)) {
      n += 1;
      candidate = `${base}-${n}`;
    }
    anchors.add(candidate);
  }

  // Explicit HTML anchors, e.g. <a id="foo"> or <h2 id="foo">. GitHub matches
  // these case-sensitively, so keep the raw id and add a lowercase alias for
  // heading-style lookups.
  for (const [, id] of text.matchAll(/<[a-z][^>]*\sid=["']?([^"'>\s]+)["']?/gi)) {
    anchors.add(id);
    anchors.add(id.toLowerCase());
  }

  return anchors;
}

const anchorCache = new Map();
const anchorsCached = async (path) => {
  if (!anchorCache.has(path)) anchorCache.set(path, await anchorsFor(path));
  return anchorCache.get(path);
};

// Inline links and images, with optional <…> destination and an optional title
// in any of markdown's three quotings.
const LINK = /!?\[[^\]]*\]\(\s*(<[^>]*>|[^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
// Link reference definitions. Every full, collapsed and shortcut reference link
// resolves through one of these, so checking definitions covers all three.
const LINK_DEFINITION = /^ {0,3}\[[^\]]+\]:\s*(<[^>]*>|\S+)/gm;
// No autolink pattern: CommonMark autolinks require a URI scheme, so a relative
// one does not exist, and matching `<…>` loosely just collects closing tags.
const HTML_ATTR = /<[a-z][^>]*\s(?:href|src)=["']?([^"'>\s]+)["']?/gi;

const problems = [];
let checked = 0;
let external = 0;

for (const file of markdown) {
  const text = await readFile(join(root, file), 'utf8').catch((error) => {
    if (error.code === 'ENOENT') {
      problems.push(`${file}: tracked by git but missing from the working tree`);
      return null;
    }
    throw error;
  });
  if (text === null) continue;

  // Links inside fenced code are samples, not links.
  const prose = [...unfencedLines(text)].join('\n');
  const targets = [
    ...[...prose.matchAll(LINK)].map((m) => m[1]),
    ...[...prose.matchAll(LINK_DEFINITION)].map((m) => m[1]),
    ...[...prose.matchAll(HTML_ATTR)].map((m) => m[1]),
  ].map((target) => target.replace(/^<|>$/g, ''));

  for (const target of targets) {
    if (/^(https?:|mailto:|tel:|data:)/i.test(target)) {
      external += 1;
      continue;
    }

    checked += 1;
    const [rawPath, rawFragment] = target.split('#');
    // A percent-encoded path or fragment must be decoded before it is compared
    // with a filename or a slug: `my%20file.md` is `my file.md` on disk.
    const decode = (value) => {
      if (value === undefined) return undefined;
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    };
    const pathPart = decode(rawPath);
    const fragment = decode(rawFragment);
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
    // Case-sensitive: GitHub does not fold `#HELLO` onto `## hello`. Lowercase
    // aliases for HTML ids are added at definition time instead.
    if (!anchors.has(fragment)) {
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
