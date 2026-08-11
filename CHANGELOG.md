# Changelog

Notable changes to the mandate and its tooling. Versions follow the catalogue:
the major version is the catalogue version, so `2.x` is catalogue v2.0 — all 119
checks across three tracks.

Because engagements pin the mandate by hash, every release records the combined
digest of the two volumes.

## 2.2.0

Answers the question a visitor asks before starting: what is this going to cost?

### Added

- **Measured effort per level** in the README, adoption guide and each prompt —
  documentation lines, control-code lines, test lines and pull requests. Figures
  come from four real implementations of this mandate, with the mandate's own
  text excluded since it is copied rather than written.
- **One-liner prompts.** Each level can now be started by pasting a single line
  that points the agent at its full prompt, instead of pasting the whole block.

### Notes

Two findings from the measurement worth stating plainly. Audit documentation is
remarkably stable across engagements — three to seven thousand lines regardless
of depth, because the catalogue is fixed at 119 checks. Control code is not: it
varies by an order of magnitude, and the engagement that built a fully
write-separated verifier lane wrote roughly 36,000 lines of it. The ranges
published are typical, not maximal, and say so.

## 2.1.1

Correction to the adoption guidance. The 2.1.0 levels treated depth as a single
ladder. Re-examination of the source engagements showed that breadth and depth
are separate axes: a repository can evidence all 119 checks and ratify a
constitution while remaining shallow on the two hardest controls, and another can
skip the constitution entirely while going far deeper on exactly those.

### Changed

- `docs/adoption-levels.md` now states that Level 3 requires both independent
  cross-vendor verification (`A-39`, Article IV) and separation of the gate from
  the gated (`B-35`, Article II) — broad coverage without them is Level 2 with
  good documentation.
- The Level 3 prompt gains concrete construction guidance for a verifier panel
  that cannot be faked green — required approver, distinct corroborators,
  anti-canned-green reason attestation, and a per-run challenge — plus explicit
  merge-authority rules for exact-head pinning.

### Added

- **The credential-boundary trap**, now called out in the Level 3 prompt. A
  verifier that executes candidate code while holding the reviewer's credential
  is a credential-disclosure path with a review-shaped name: editing the panel
  script in a pull request is then sufficient to run arbitrary code with provider
  keys and to control what the reviewer reports. The prompt requires the
  credential-bearing job to run from a protected ref, the candidate to be treated
  as inert data, and `pull_request_target` and ref-selectable dispatch to be
  refused.

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
