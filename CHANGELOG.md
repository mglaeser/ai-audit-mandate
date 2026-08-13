# Changelog

Notable changes to the mandate and its tooling. Versions follow the catalogue:
the major version is the catalogue version, so `2.x` is catalogue v2.0 — all 119
checks across three tracks.

Because engagements pin the mandate by hash, every release records the combined
digest of the two volumes.

## 2.5.0

Corrections to the volumes themselves, from a pass that asked whether this
mandate is really only for web applications. **It is** — that framing stays
deliberately, and the answer is not why this release exists. Measuring it turned
up four defects that hold regardless of scope, two of them in the prose.

**The combined mandate digest changes to
`sha256:2e6481a07b1951b459cde389b8d09fe6dc84371b8530329630729dcb9fcba4a8`.**
Re-pin before relying on an engagement that quoted the previous one.

For the record, since the question will recur: 88 of the 119 checks are
platform-neutral as written, 28 carry a web noun or the name of a web standard,
and exactly three — `A-22`, `A-24`, `B-12` — genuinely assume a browser or an
operated web runtime. Zero are inapplicable off the web. The specialisation is a
deliberate choice about who this is written for, not a limit of the catalogue.

### Fixed

- **The exfiltration-channel lists read as closed sets.** `C-08` gated "outbound
  HTTP, email and chat sends, pull-request creation, rendered links and rendered
  images", and `B-20`'s probe named a matching list. Both now say plainly that
  the enumeration is illustrative and instruct the auditor to enumerate this
  system's own channels first — DNS resolution, webhooks, telemetry fields, log
  lines an aggregator forwards. An auditor who found no rendered images could
  previously conclude the lethal trifecta's third leg was absent, which is a
  missed `STOP-SHIP` rather than a wording preference.
- **Article XV's Experimental exemption looked structural and was not.** Its four
  conditions all test whether production is reachable *from* the repository, and
  say nothing about what leaves it — so a repository could satisfy every one
  while publishing a package that runs on other people's machines. It now
  requires that nothing published runs elsewhere, and states that shipping to
  third parties is reaching production, someone else's, at `Incubating` minimum.
- **`A-22` overstated the law.** "Accessibility to WCAG 2.2 AA (a legal
  obligation in the EU, not a nicety)" is flatly true of neither every product
  nor every body; the Web Accessibility Directive and the Accessibility Act bind
  particular classes. The check now says so and tells the auditor to establish
  which applies rather than assume, while keeping the automated gate and treating
  the defect as worth fixing either way.
- **The release gate could not see a missing re-pin.** `check-release.mjs`
  validated whichever digests the newest changelog entry happened to quote, so an
  entry quoting none passed — exactly the case where a volume changed and nobody
  recorded it. It now requires the newest entry to record the digest, which is
  what this file's own preamble has always promised. The gate blocked this
  release until this entry was written.

## 2.4.0

A second adversarial audit, run because the first one's method was wrong. Its
refuters returned a single boolean, so a real defect filed with the wrong
severity was discarded outright — 73 of the 94 dismissals conceded in writing
that the facts held. Re-adjudicating them with validity separated from severity,
and auditing the ~600 lines of verification code the first pass had itself
introduced, produced 97 live defects. Volume text and digests are unchanged.

### Fixed

- **`--dir .` and `--dir ..` still escaped the target.** The guard added in 2.3.0
  compared against `basename`, which is the identity function on both, so
  `--dir . --force` overwrote the audited repository's own `README.md` and
  `--dir ..` wrote outside the target — the precise clobber 2.3.0 claimed to have
  closed. Both are now rejected, and CI asserts seven hostile values.
- **`--force` silently destroyed recorded verdicts** and exited 0, orphaning the
  evidence files those verdicts cited. It now refuses once any verdict has moved
  off `NO-EVIDENCE`, requires `--discard-verdicts`, and says what would be lost.
  It does not write a backup: an unattested second copy that no gate reads is the
  decorative control this mandate exists to name.
- **The scaffolder seeded 119 finding records where §5 requires exactly 79.** §5
  gates on the findings id-set equalling the *active* id-set, so the extra 40 broke
  the comparison rather than strengthening it. `audit/03-findings.json` now
  carries the active scope; the master index still carries all 119; and Track C's
  40 are named in `pending_check_ids`, which is what §5 means by "registered,
  counted, **and named**" — that field previously shipped empty.
- **`engagement-status.json` contradicted the file written beside it**, reporting
  `highest_open_band: null` and zero open findings while every record was
  `NO-EVIDENCE`, a state §5 defines as blocking exactly like an open finding of
  its band. The counters are now derived.
- **The unconditional `STOP-SHIP` set had no oracle.** It came from one literal
  regex over the heading, so reformatting a heading demoted a priority-10 check
  out of the set with every gate green. The §3 band table is now the oracle.
- **The escalation table had no oracle in §3** — only §7's italic tails, which
  omit `C-09` entirely, so deleting that entry produced a green build publishing
  `C-09` as a check that never escalates. §3's bullets are now parsed and compared
  in both directions.
- **`--check` was selected by `argv.includes`,** so any near-miss argument —
  `--verify`, the name of this repository's own npm script — fell through to
  **write** mode and silently re-attested. All three generators now reject
  unknown arguments.
- **The link checker produced false passes.** Its fence tracking was a parity
  toggle that ignored fence length, so a `##` inside a nested code block minted a
  real anchor and links to it were approved; its slugger diverged from GitHub's on
  underscores, links inside headings and duplicate collisions; and it never saw
  reference-style links at all. The slugger is now verified byte-for-byte against
  the anchors GitHub actually generates for this README.
- **The release check could be defeated by editing the digest** — it matched only
  quotes ending in `…`, so a full-length wrong digest was skipped rather than
  caught, and its third invariant compared two fields the same generator wrote
  from one expression, making it incapable of failing. It now cross-checks the
  manifest against the catalogue and the README's severity counts against both.
- **The schema validator ignored every keyword it did not implement**, so any
  future tightening of §5 would have been a silent no-op. It now refuses to run
  against a schema it cannot fully honour.
- **The structural-fix rule had been weakened**, scoped to "verdict is not
  `NO-EVIDENCE`" to accommodate a seed that asserted `taken: false` — a decision
  nobody had made. The seed now says `taken: null`, and the rule matches §5.
- **The README showed scaffolder output the script never prints** — a relative
  path where it always prints an absolute one, and two missing lines. Carried over
  unchecked during the 2.3.0 redesign.
- The routing table had a hole and an overlap: a prototype holding real
  credentials matched no row, and a repository serving real users matched two.
  Level 2 is now the explicit catch-all.
- `npm run verify` was described in three places as regenerating files. It writes
  nothing; `npm run build` does.
- `CONTRIBUTING.md` documented a conditional-escalation heading syntax the
  extractor stopped reading in 2.3.0, so a contributor following it would have had
  their escalation silently discarded.
- Prompt and adoption-level corrections: a scaffold command that could not run as
  written, a catch rate stated as its own complement, four false statements about
  what the prompts contain, a PR figure matching no surveyed engagement, and the
  credential-boundary guidance attributed to the wrong check.

### Added

- **Door membership and within-band order in the master index.** §5 names both
  among the per-check fields `audit/00-check-catalogue.json` carries, and neither
  existed. The §6.5 structural-remediation tables are now parsed — twelve doors
  across §6.5.1 and §6.5.2, thirty-seven checks, some belonging to more than one
  — and cross-checked against the count §6.5.1 states about itself. That oracle
  earned its place immediately: it caught the first parse counting twenty-nine
  where the prose says twenty-eight, because `A-07` appears parenthetically as
  "the clone class behind it" rather than as a member.
- **Negative fixtures.** `npm run schema` previously validated one always-valid
  file, proving nothing about the validator: deleting the code that enforces every
  §5 clause left the suite green. Seven fixtures now assert that each fail-closed
  rule rejects, and gutting the evaluator turns CI red.
- CI assertions on relations rather than literals — the findings id-set against
  the active id-set, the record key set against the committed template, the
  mandate pin, and the two `catalogue_version` values that must stay different.
- `LICENSE-CODE` (MIT) for `scripts/` and `templates/`. A content licence grants
  no patent rights and is not written for software; the parts you run are now
  licensed as software.
- Branch protection on `main`, with both CI jobs required.

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

- **The start section now routes the reader before it explains anything.** It
  previously presented three levels in sequence and put the "which one?" guidance
  last, so choosing required reading all three. A visitor now meets a three-row
  table — one condition each, the level as a link — and jumps to theirs. The rows
  are mutually exclusive: Level 3's row carries the capability that actually
  gates it, so a reader who cannot field a second-vendor verifier is routed to
  Level 2, which is what the mandate says.
- Each level now leads with a verb rather than a noun — *finds out what is true*,
  *makes the findings block*, *proves the controls still block* — which is the
  described → running → calibrated progression stated in the reader's terms.
- The manual, agent-free path moved into a collapsed block so it no longer
  competes with the three levels, and gained the `npm ci` step it was missing.
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
  code: the observed engagements added 15, 42, 176 and 2,023 tests respectively.

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
