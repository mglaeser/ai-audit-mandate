# Changelog

Notable changes to the mandate and its tooling. Versions follow the catalogue:
the major version is the catalogue version, so `2.x` is catalogue v2.0 — all 119
checks across three tracks.

Because engagements pin the mandate by hash, every release records the combined
digest of the two volumes.

## 2.1.0

Adoption guidance. The mandate is written for the hardest case — a production
system nobody reviews — and applying it wholesale to a prototype produces
documentation of controls nobody runs, which is the failure mode it exists to
catch. This release makes depth an explicit, honest choice.

The volumes are unchanged; their hashes are identical to 2.0.0.

### Added

- **Three adoption levels** at `docs/adoption-levels.md`, mapped onto the
  repository classes the Constitution already defines in Article XV: Baseline
  (Experimental), Governed (Incubating), Standing regime (Production). All three
  run all 119 checks; they differ in whether the controls execute.
- **Three prompts** at `docs/prompts/`, one per level, each naming the parts of
  the mandate to adopt *and* the parts to skip, so an agent does not build
  apparatus the project cannot sustain.
- Level guidance in the README and getting-started guide.

### Notes

The levels are derived from observed practice rather than invented: several real
engagements were compared, and the variable that actually separated them was not
how many checks they ran — all serious ones ran 119 — but whether their controls
executed, blocked, and were tested against their own decay.

## 2.0.0

First release as a standalone repository. The mandate previously lived inside the
repositories it audited, which made it awkward to reuse and impossible to version
independently.

### Added

- **Two volumes**, renamed from their previous part numbering to describe their
  own scope: `mandate/01-foundation-and-core-tracks.md` (Tracks A and B, 79
  checks, the execution protocol, the standing regime, the Constitution) and
  `mandate/02-security-privacy-assurance.md` (Track C, 40 checks).
- **A generated catalogue** at `catalogue/checks.json`, extracted from the prose
  so the machine-readable index cannot drift from the text that defines it.
- **An integrity manifest** at `mandate/manifest.json` with a SHA-256 per volume
  and a combined digest over their deterministic concatenation.
- **A browsable check index** at `docs/check-index.md`, generated.
- **Engagement scaffolding** — `scripts/new-engagement.mjs` creates an audit
  workspace with all 119 checks seeded at `NO-EVIDENCE`, Track C registered as a
  planned extension, and the mandate hash stamped in.
- **Templates** for the engagement status file, the finding record, and the full
  audit workspace.
- **Concepts and getting-started guides** for readers who need the reasoning
  before the 390 KB.
- **CI** that verifies the generated artifacts are current and asserts that a
  freshly scaffolded workspace fails closed.

### Changed

- Volume headers now name their own scope and link to the companion volume, so
  either file read alone tells you where it sits in the sequence.
- Internal cross-references updated to the new filenames.

### Notes

The volume text itself is otherwise unchanged from the two-part mandate it came
from. Only the headers, the paths it references, and its packaging are new.
