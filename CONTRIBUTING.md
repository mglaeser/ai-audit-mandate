# Contributing

Thank you for helping make this mandate sharper. The most valuable contributions
are the uncomfortable ones: a check that can be gamed, a control that decays
quietly, a hazard the catalogue misses.

## Before you start

- Read the [Code of Conduct](CODE_OF_CONDUCT.md).
- Read [Concepts](docs/concepts.md) — it is the short version of the reasoning.
- Search existing issues and pull requests.
- For a new check or a change to the severity model, open a proposal issue first.

## The one rule specific to this repository

**A change to a check must strengthen it or make it more precisely falsifiable.**

Softening a check so an engagement passes more easily is the exact failure mode
this document exists to prevent. If a check is genuinely wrong — unfalsifiable,
redundant, or measuring the wrong thing — say so plainly and argue it. That is a
welcome contribution. Quietly lowering a bar is not.

Two corollaries:

- **No check may be discharged by "a human reviews it."** That control is not
  available in the operating model this mandate addresses.
- **No check is complete without a standing control.** If you propose a check,
  propose the permanent machinery that keeps it true — with a cadence, a ratchet,
  and an owning role.

## Development setup

The build scripts are dependency-free and need only Node.js 20 or newer. The
Markdown linter is a single pinned dev dependency, so install it first.

```bash
git clone https://github.com/mglaeser/ai-audit-mandate.git
cd ai-audit-mandate
npm ci
npm run verify
```

`verify` regenerates the catalogue, the check index and the manifest, then fails
if any of them drifted from the prose.

## Changing a volume

The prose in `mandate/` is the source of truth. Everything in `catalogue/` and
`docs/check-index.md` is generated from it.

After editing a volume:

```bash
npm run build     # regenerate catalogue, index and manifest
npm run verify    # confirm everything is consistent
npm run lint      # markdown lint
```

Commit the regenerated files with your prose change. A pull request whose
generated artifacts are stale will fail CI.

### Check heading format

The extractor parses check headings, so the format is load-bearing:

```markdown
**C-01 · Core application security** — Priority **10/10** — `STOP-SHIP` — *`S3`*
```

- The identifier is `TRACK-NN`, zero-padded.
- `·` separates the identifier from the title.
- Priority is `**N/10**`.
- An unconditional `STOP-SHIP` is marked with `— \`STOP-SHIP\`` outside the
  italic annotation; a conditional one reads `escalates to \`STOP-SHIP\`` inside
  it. The distinction is not cosmetic — only a direct mark holds production down
  from Phase 0.
- Substitution identifiers appear as `` `S1` `` in the italic annotation.

Adding a check means updating the expected count in
[`scripts/build-catalogue.mjs`](scripts/build-catalogue.mjs). That count is
deliberately hard-coded so a check cannot go missing unnoticed.

## Pull requests

A good pull request:

- explains the problem and why it belongs in the mandate's scope;
- states which checks it strengthens, and how it could be falsified;
- keeps generated artifacts in sync;
- avoids drive-by reformatting of the volumes, which makes review of a
  hash-attested document unnecessarily hard.

## Style

- British spelling, to match the existing prose.
- Prefer the concrete over the abstract: a probe someone can run beats a
  principle someone can nod at.
- Keep the second person. The mandate addresses an auditor directly, and that is
  deliberate.
