# Changelog

Notable changes to the mandate and its tooling. Versions follow the catalogue:
the major version is the catalogue version, so `2.x` is catalogue v2.0 — all 119
checks across three tracks.

Because engagements pin the mandate by hash, every release records the combined
digest of the two volumes.

## 2.3.0

An adversarial audit of this repository against its own standards. The catalogue
is unchanged at v2.0 — the same 119 checks — but the severity band derived for 80
of them was wrong, and several statements the repository made about itself were
false.

**The combined mandate digest changes to
`sha256:60ad9a3f9f9fea23de672651e05c732f985ba003ec4639dd770593e11354a8b9`.** An
engagement pinned to the previous digest is pinned to text that misstated the
number of unconditional `STOP-SHIP` checks; re-pin before relying on it.

### Fixed

- **The severity-band table contradicted §3.** `build-catalogue.mjs` commented
  itself as following the mandate's own band definition and then defined a
  different one: `BLOCKER-1` spanning 9–10, an invented `ADVISORY` band, and no
  `STOP-SHIP`, `PLAN` or `ASSESS` at all. 80 of 119 checks carried a band §3 does
  not assign. Because `STOP-SHIP` could never be emitted, all three priority-10
  checks were published as `BLOCKER-1` — so a deploy gate computing
  `open_stop_ship_count` from `catalogue/checks.json` would have failed **open**
  on exactly the three checks that must halt production traffic.
- **The conditional-escalation set was incomplete.** It was derived from a phrase
  that only two check headings happen to use, yielding `A-02, A-39`. §3 states
  eight escalations; six of them reach `STOP-SHIP`. They are now transcribed
  explicitly, carry their triggering condition, and are asserted to exist.
- **Three surfaces said there are two unconditional `STOP-SHIP` checks, in Track
  C.** There are three, and one — `B-06`, secrets and machine identity — is in
  Track B, closed in Volume I. One of the false statements was introduced by this
  repository's own refactor, into the hash-attested volume itself.
- **Volume II described the execution order as "six bands".** §3 defines seven,
  and the table directly beneath the sentence has seven rows.
- **A check's body ran to the next bold line, not the next check.** Three blocks
  already extended past a section boundary, so prose from the structural
  remediation sections was attributed to the check preceding them.
- **A failed build still wrote its output.** `build-catalogue.mjs` wrote
  `checks.json` before evaluating its own asserts, leaving a miscounted catalogue
  on disk — under a `linguist-generated` diff GitHub collapses by default.
- **`--dir ""` with `--force` scaffolded into the repository root**, overwriting
  the target repository's own `README.md`; `--dir ../x` escaped the target
  entirely; `--dir` with no value died on a raw stack trace.
- **Both generated JSON artifacts declared a `$schema` that did not exist.**
- **`templates/finding-record.json` did not match the §5 schema it claimed to
  match** — different key names, different types, two invented fields, and none
  of the fields §5's fail-closed rules are written against.
- **`CONTRIBUTING.md` called the tooling dependency-free and then documented
  `npm run lint`**, which exits 127 without `npm ci`.
- **The Code of Conduct routed reports to a contact method that did not exist.**
- **The issue chooser's "Questions and discussion" link 404'd**, and with blank
  issues disabled there was no route for a question at all. Discussions is now
  enabled.
- **Both issue forms applied labels the repository did not have**, so proposals
  arrived untagged.
- **`package-lock.json` still recorded 2.0.0**, so any `npm install` dirtied the
  tree.
- The Level 2 prompt named `audit/04b-structural-ledger.md`, which no template
  creates, and asked for the audit set "through 08", omitting the executive
  summary.
- The check index promised a link per check; it has one per track.

### Added

- **The band table and the escalation set are now asserted against the prose.**
  §3's band table and §7's execution-order tables are re-parsed at build time and
  compared against what the generator derived. The build fails, and refuses to
  write, if they disagree — including if Volume I and Volume II disagree with
  each other about Track C. This is what makes the anti-drift claim true rather
  than merely stated.
- `catalogue/finding-record.schema.json`, encoding §5's fail-closed clauses — a
  residual risk requires a compensating control **and** a tripwire; a `PASS`
  requires a standing control that was demonstrated; `NOT-APPLICABLE` requires a
  justification — and `scripts/check-finding-shape.mjs`, a dependency-free
  validator that runs them in CI against both the template and a freshly
  scaffolded workspace.
- `scripts/check-links.mjs`, which resolves anchors instead of skipping them.
  The previous link check used a pattern that stops at `#`, so every anchor in
  the repository was unverified while the check reported success.
- `scripts/check-release.mjs`, asserting that the version agrees across
  `package.json`, `package-lock.json` and `CITATION.cff`, and that every
  truncated digest quoted in the README is a prefix of the digest the manifest
  actually records. Both had drifted.
- An assert that exactly 44 checks carry a structural fix — a number quoted in
  four hand-written places and previously compared against nothing.
- CI steps for each of the above, plus an assertion that the scaffolder refuses a
  `--dir` that escapes its target.
- `.github/dependabot.yml` for the SHA-pinned actions.

### Changed

- `catalogue/checks.json` drops the misleading `escalates` boolean and gains
  `escalation`, an object carrying the target band and the condition that
  triggers it. The Phase-0 workspace manifest now carries it too, as §5 requires.
- `catalogue/README.md` and the README no longer claim that `npm run verify`
  catches any prose/catalogue disagreement. It compares bytes; what closes the
  gap is the §3/§7 assertion, and both files now say so.

## 2.2.1

Rework of how effort is presented. The 2.2.0 table put a seven-column grid and a
wrapped URL in every row, and labelled a column "Docs" — a number with no unit
and no meaning to a first-time reader.

### Changed

- The README's start section is now one short block per level: what it does, the
  line to paste, and a plain-language note on what lands in the repository. The
  paste command sits in its own code block instead of inside a table cell.
- Effort is stated in units a reader can picture — **how many control scripts**,
  **how many tests**, **how many pull requests** — rather than lines of code.
- Test figures are re-measured as individual test cases rather than lines of test
  code: the observed engagements added 0, 15, 176 and 2,023 tests respectively.

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
