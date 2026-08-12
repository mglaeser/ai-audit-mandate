# Assets

| File | Use |
| --- | --- |
| [`icon.svg`](icon.svg) | The mark. Vector, 1.6 KB, sharp at any size. |
| `icon-512.png` / `icon-128.png` | Raster fallbacks for contexts that reject SVG. |
| [`social-preview.svg`](social-preview.svg) | 1280×640 card for link previews. |
| `social-preview.png` | The same card, rendered — upload this one to GitHub. |

## The mark

A portcullis lowered across a shield.

Three vertical bars are the three tracks — product integrity, platform and
runtime, security and assurance. Two horizontal rails are the two volumes that
bind them into something that holds. Together they read as a closed gate, which
is the whole argument of this repository: the gate is the control, and a gate
that is not closed is not a gate.

It is deliberately not a checkmark. A tick says *passed*, and this mandate's
first principle is that unknown blocks — you do not get a green mark for a check
nobody ran.

## Colours

| | Hex | Where |
| --- | --- | --- |
| Bars | `#34D399` → `#10B981` | The gate. The only saturated colour. |
| Plate | `#233246` → `#0F172A` | Shield body. |
| Rim | `#3E5068` | Shield outline. |

## Regenerating the PNGs

The SVGs are the source; the PNGs are exports. All text in the social card is
already converted to vector paths, so nothing depends on a font being installed.

```bash
npm install --no-save @resvg/resvg-js
node -e '
const {Resvg}=require("@resvg/resvg-js"),fs=require("fs");
const icon=fs.readFileSync("assets/icon.svg","utf8");
for (const w of [512,128]) fs.writeFileSync(`assets/icon-${w}.png`,
  new Resvg(icon,{fitTo:{mode:"width",value:w},background:"transparent"}).render().asPng());
const card=fs.readFileSync("assets/social-preview.svg","utf8");
fs.writeFileSync("assets/social-preview.png",
  new Resvg(card,{fitTo:{mode:"width",value:1280}}).render().asPng());
'
```

## Setting the social preview

GitHub does not accept a social image over the API. Upload `social-preview.png`
by hand under **Settings → General → Social preview**.
