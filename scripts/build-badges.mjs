#!/usr/bin/env node
// Generates the adoption-level badges in assets/badges/.
//
// The badges are self-hosted rather than fetched from a badge service, for the
// same reason the catalogue is generated from the prose: a claim this repository
// makes about a repository's audit state should not depend on a third party
// staying up, and should not silently change shape when someone else ships a
// redesign.
//
// Text is emitted as vector paths, so a badge renders identically everywhere and
// needs no font installed — including on a machine with no fonts at all, which is
// exactly where the first version of this failed.
//
// Usage:
//   node scripts/build-badges.mjs           # write assets/badges/*.svg
//   node scripts/build-badges.mjs --check    # verify they are current (CI mode)

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = join(root, 'assets/badges');

// Badge geometry, matching the conventional 20px shield so these sit level with
// CI and licence badges in the same paragraph.
const HEIGHT = 20;
const RADIUS = 3;
const FONT_SIZE = 10.2; // matches the optical size of an 11px Verdana badge
const PAD = 5.5; // horizontal padding either side of each label
const LOGO_BOX = 14; // width reserved for the shield glyph
const TRACK = -0.15; // slight negative tracking; DejaVu sets wider than Verdana

const INK = '#3E5068'; // left plate: the repository's own rim colour

const LEVELS = [
  {
    file: 'level-1-baseline.svg',
    label: 'AI Audit',
    value: 'L1 · Baseline',
    fill: '#64748B',
    alt: 'AI Audit Mandate: Level 1, Baseline',
  },
  {
    file: 'level-2-governed.svg',
    label: 'AI Audit',
    value: 'L2 · Governed',
    fill: '#0EA5E9',
    alt: 'AI Audit Mandate: Level 2, Governed',
  },
  {
    file: 'level-3-standing-regime.svg',
    label: 'AI Audit',
    value: 'L3 · Standing regime',
    fill: '#10B981',
    alt: 'AI Audit Mandate: Level 3, Standing regime',
  },
];

// The mark, reduced to a 15x15 glyph: three bars, two rails, one rim.
const shieldGlyph = (x) => `
    <g transform="translate(${x} 3)">
      <path d="M7.5 0.6 L13.6 2.9 V7.6 C13.6 11 11 13.4 7.5 14.4 C4 13.4 1.4 11 1.4 7.6 V2.9 Z" fill="#0F172A" fill-opacity=".55"/>
      <g fill="#fff">
        <rect x="4.6" y="3.4" width="1.5" height="8.2" rx=".75"/>
        <rect x="6.8" y="3.4" width="1.5" height="9" rx=".75"/>
        <rect x="9" y="3.4" width="1.5" height="8.2" rx=".75"/>
      </g>
      <g fill="#0F172A" fill-opacity=".85">
        <rect x="3.9" y="5.9" width="7.2" height="1.1"/>
        <rect x="3.9" y="8.5" width="7.2" height="1.1"/>
      </g>
      <path d="M7.5 0.6 L13.6 2.9 V7.6 C13.6 11 11 13.4 7.5 14.4 C4 13.4 1.4 11 1.4 7.6 V2.9 Z" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".9"/>
    </g>`;

async function loadFont() {
  // opentype.js is a build-time-only dependency; install it with --no-save.
  const opentype = await import('opentype.js').catch(() => null);
  if (!opentype) {
    throw new Error(
      'build-badges: opentype.js is required.\n' +
        '  npm install --no-save opentype.js\n' +
        'and provide a TrueType font via BADGE_FONT (default: /tmp/DejaVuSans-Bold.ttf).',
    );
  }
  const path = process.env.BADGE_FONT ?? '/tmp/DejaVuSans-Bold.ttf';
  const buffer = await readFile(path);
  return opentype.default.parse(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  );
}

// Lay out a string glyph by glyph. This bypasses the shaping layer, which some
// fonts drive through substitution tables opentype.js cannot read.
function layout(font, text, x, y, size) {
  const scale = size / font.unitsPerEm;
  let cursor = x;
  const parts = [];
  for (const character of text) {
    const glyph = font.charToGlyph(character);
    const data = glyph.getPath(cursor, y, size).toPathData(2);
    if (data) parts.push(data);
    cursor += glyph.advanceWidth * scale + TRACK;
  }
  return { path: parts.join(' '), width: cursor - x };
}

const measure = (font, text, size) => layout(font, text, 0, 0, size).width;

function render(font, { label, value, fill, alt }) {
  const labelWidth = measure(font, label, FONT_SIZE);
  const valueWidth = measure(font, value, FONT_SIZE);

  const leftWidth = Math.round(PAD + LOGO_BOX + 3 + labelWidth + PAD);
  const rightWidth = Math.round(PAD + valueWidth + PAD);
  const total = leftWidth + rightWidth;

  // Baseline that centres 11px caps in a 20px plate.
  const baseline = 14.2;
  const labelText = layout(font, label, PAD + LOGO_BOX + 3, baseline, FONT_SIZE);
  const valueText = layout(font, value, leftWidth + PAD, baseline, FONT_SIZE);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${HEIGHT}" viewBox="0 0 ${total} ${HEIGHT}" role="img" aria-label="${alt}">
  <title>${alt}</title>
  <linearGradient id="g" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".12"/>
    <stop offset="1" stop-opacity=".12"/>
  </linearGradient>
  <clipPath id="r"><rect width="${total}" height="${HEIGHT}" rx="${RADIUS}"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftWidth}" height="${HEIGHT}" fill="${INK}"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="${HEIGHT}" fill="${fill}"/>
    <rect width="${total}" height="${HEIGHT}" fill="url(#g)"/>
  </g>
${shieldGlyph(PAD)}
  <g fill="#fff">
    <path d="${labelText.path}"/>
    <path d="${valueText.path}"/>
  </g>
</svg>
`;
}

const font = await loadFont();
await mkdir(outputDir, { recursive: true });

const checkMode = process.argv.includes('--check');
let stale = 0;

for (const level of LEVELS) {
  const svg = render(font, level);
  const target = join(outputDir, level.file);

  if (checkMode) {
    const current = await readFile(target, 'utf8').catch(() => null);
    if (current !== svg) {
      console.error(`build-badges: ${level.file} is stale — run \`npm run badges\`.`);
      stale += 1;
    }
  } else {
    await writeFile(target, svg);
  }
}

if (checkMode) {
  if (stale > 0) process.exit(1);
  console.log(`build-badges: ${LEVELS.length} badges are current.`);
} else {
  console.log(`build-badges: wrote ${LEVELS.length} badges to assets/badges/.`);
}
