# Badges

A badge states which depth of the mandate a repository has actually reached. It
belongs in the badge row at the top of a README, beside CI and licence.

| Level | Badge | Claim it makes |
| --- | --- | --- |
| 1 | [![Level 1](../assets/badges/level-1-baseline.svg)](https://github.com/mglaeser/ai-audit-mandate) | All 119 checks carry an evidenced verdict. Nothing is enforced yet. |
| 2 | [![Level 2](../assets/badges/level-2-governed.svg)](https://github.com/mglaeser/ai-audit-mandate) | The findings block: controls run in CI, deploy admission fails closed. |
| 3 | [![Level 3](../assets/badges/level-3-standing-regime.svg)](https://github.com/mglaeser/ai-audit-mandate) | The controls are calibrated, self-testing, and independently verified. |

## Copy one

Replace `LEVEL` with `level-1-baseline`, `level-2-governed` or
`level-3-standing-regime`.

**Markdown**

```markdown
[![AI Audit Mandate](https://raw.githubusercontent.com/mglaeser/ai-audit-mandate/main/assets/badges/LEVEL.svg)](https://github.com/mglaeser/ai-audit-mandate)
```

**HTML**, for a centred badge row:

```html
<a href="https://github.com/mglaeser/ai-audit-mandate"><img src="https://raw.githubusercontent.com/mglaeser/ai-audit-mandate/main/assets/badges/LEVEL.svg" alt="AI Audit Mandate: Level 2, Governed"></a>
```

**Keep the link pointing here.** A reader who meets the badge on your repository
has no idea what "Level 2" means; the link is how they find out. Sending them to
your own `audit/` folder instead answers a question they have not formed yet —
link to your evidence from your README's own text, where it will land better.

## Earn one

A badge is a claim, and this repository's first principle is that a claim without
evidence is a finding. Display a level only when its definition of done is met.

| Level | Display it when |
| --- | --- |
| **1** | `audit/03-findings.json` holds all 119 records, none left `NO-EVIDENCE`, each citing an artifact someone else could re-examine. |
| **2** | Every Level 1 condition, plus: controls execute in CI and block, `governance/constitution.md` is at least `IN_FORCE_PROVISIONAL`, and `production_eligible` is computed rather than asserted. |
| **3** | Every Level 2 condition, plus: a calibration corpus with a live catch rate, a gate self-test, a ratchet register, independent second-vendor verification (`A-39`), and the gate separated from the gated (`B-35`). |

**A red or absent `production_eligible` does not disqualify you.** Most honest
engagements land on `false` and stay there — that is the gate working, not the
audit failing. The badge states the depth you audited to, not that everything
passed.

**Do not display a level you skipped the hard parts of.** Level 3 without
independent verification is Level 2 with extra documentation, and claiming
otherwise is the decorative control this whole mandate exists to catch.

## Why these are self-hosted

They are committed SVGs rather than calls to a badge service, for the same reason
the check catalogue is generated from the prose: a claim about a repository's
audit state should not depend on a third party staying online, and should not
change shape when someone else ships a redesign.

All text is converted to vector paths, so a badge renders identically everywhere
and needs no font installed.

## Regenerating them

```bash
npm install --no-save opentype.js
BADGE_FONT=/path/to/DejaVuSans-Bold.ttf npm run badges
```

This is deliberately outside `npm test`: it needs a TrueType font that is not
vendored, so a clean CI runner would fail on it. The generated SVGs are committed
instead, which is what the badge URLs serve.
