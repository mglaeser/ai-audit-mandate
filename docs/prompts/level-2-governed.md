# Level 2 — Governed

**Answers:** *What is true, and what keeps it true?*
**Effort:** days. **Produces:** controls that execute and block.
**Repository class:** Incubating.

The level most real projects should reach and stop at. Findings become gates,
the worst defects get designed away rather than policed, and deploy admission
fails closed.

**What it adds to your repository:** the `audit/` findings, a constitution, and
roughly **10–25 small control scripts** wired into CI — a secret scanner, a
dependency-existence check, an authorisation-coverage gate, a findings gate that
refuses deploy. Plus **15–200 new tests**, one per fix. Typically **10–25 pull
requests** over a few days. *(Measured across four real engagements; see
[adoption levels](../adoption-levels.md).)*

**One-liner, if you prefer:**

```text
Read https://github.com/mglaeser/ai-audit-mandate/blob/main/docs/prompts/level-2-governed.md and execute it against this repository.
```

---

````markdown
Act as the auditor described in the AI Audit Mandate. Clone
https://github.com/mglaeser/ai-audit-mandate into a sibling directory, or read it
at that URL, and follow it — do not improvise a different audit.

ADOPT AT LEVEL 2 — GOVERNED. Read these parts and apply them:

- mandate/01-foundation-and-core-tracks.md in full, with particular weight on
  §2 (substitution principles S1-S13), §4 (the execution protocol, all phases),
  §6.5 (structural remediation — read this before building any control),
  §8 (deliverables), and Appendix A (the Constitution).
- mandate/02-security-privacy-assurance.md in full. Track C runs here, so the
  security scope is evidenced rather than assumed.
- docs/adoption-levels.md — I am adopting at Level 2 deliberately, not falling
  short of Level 3.

Skip for now: §9.3 continuous calibration, §9.4 the decay watch, §9.6 the
standing executors, and Phase 7 ratification. Those need infrastructure I do not
have yet. Build everything so they can be added later without redesign. Article
XV binds an Incubating repository to observe-only burn-in of the drills and the
verifier fleet, so record each deferral explicitly in
audit/06-residual-risk-register.md with its tripwire — and note that §3 escalates
A-36 to BLOCKER-1 for exactly as long as §9.3 is absent. Scope
audit/08-standing-regime.md to what this level actually builds; a regime file
describing controls that do not run is the decorative gate this document exists
to catch.

WHAT I WANT

Every finding from discovery either fixed with a control that blocks, or recorded
as accepted risk with a tripwire. A deterministic gate in CI that I cannot bypass.
A constitution in force. And an honest, computed answer on whether this can serve
production.

HOW TO WORK

PHASE 0-3 — Discovery. If audit/ already exists from a Level 1 pass, start from
those findings and re-verify them against the current commit rather than
re-deriving them. Otherwise run:
     node ../ai-audit-mandate/scripts/new-engagement.mjs --target .
and complete discovery first. Change nothing until every check has a verdict.

PHASE 2 — Calibrate before you trust yourself. On a scratch branch, seed the six
defects the mandate names: one hard-coded credential, one missing cross-tenant
ownership check, one dependency pinned to a non-existent package, one swallowed
exception, one test whose assertion is vacuous, and one path where untrusted text
reaches a tool call. Seed them using the same generator that built this system so
they are clonally representative rather than artificially obvious. Run the
existing pipeline over them and count what it catches.

If the pipeline caught fewer than five of six, then a green build in this
repository is not evidence of anything — say exactly that in the first sentence
of the executive summary. What it MISSED is the error rate on every PASS you are
about to record: a pipeline that catches four of six leaves a third of those
verdicts unbacked. Report the catch rate and do not round it up. Keep the seeds;
they become the standing calibration corpus and the baseline nothing may fall
below.

PHASE 4 — Plan structurally first. For every finding, check whether §6.5 or the
check itself offers a structural fix (S13). Prefer it over a standing control,
always. Do not add an ownership check to fifteen routes — push tenancy into the
data-access layer so the unsafe query cannot be written. Do not write a lint rule
for a defect a type can make unrepresentable. Record in audit/04-remediation-plan.md
every structural fix you took, and every one you declined with the reason and the
control running forever instead.

PHASE 5 — Repair, highest band first. For each fix, in this order:
  a. a test that fails first, derived from the specification, not the code;
  b. the smallest change that makes it pass;
  c. a repository-wide clone sweep — the same defect elsewhere, by pattern;
  d. a standing control that prevents recurrence;
  e. proof you WATCHED the control block: re-introduce the defect, capture the
     refusal, save it under audit/evidence/. A control you have not seen fire is
     a control you are hoping about.

PHASE 6 — Re-verify, then have someone else re-verify you. Re-run every check
that is not PASS; a verdict may change only on fresh evidence, never on a second
opinion about the same evidence. Then hand at least 10% of the catalogue — at
least one from every represented band — to an independent agent given only the
probe text and no sight of your verdicts, and reconcile every disagreement by
widening the sample rather than by discussion. Demote to PARTIAL any check that
is satisfied today but has no standing control holding it. This phase produces
audit/05-verification.md, audit/06-residual-risk-register.md and
audit/07-substitution-ledger.md; nothing else does.

BUILD THESE CONTROLS AS EXECUTABLE CODE, NOT DESCRIPTIONS

Put them in scripts/regime/ and wire every one into CI as blocking:

- a findings gate that fails the build while any STOP-SHIP or BLOCKER is open,
  and refuses deploy admission while production_eligible is false (fail-closed,
  and prove the refusal in CI with a job that expects it to refuse);
- a dependency-existence check — every package must resolve on a real registry,
  because hallucinated package names are pre-registered by attackers (B-04, C-03);
- a secret scan blocking on any credential in source (B-06, priority 10);
- an authorisation-coverage check: no route without an authz test (C-01);
- a source-gate rejecting stubs, TODO-shaped implementations, empty catch blocks
  and floating model aliases;
- a constitution-hash verifier that fails when the attested hash does not match.

No || true. No continue-on-error. No skip labels. An override path that exists is
a gate that does not exist.

CONSTITUTION

Instantiate Appendix A at governance/constitution.md with measured values, not
placeholders. Set constitution_state to IN_FORCE_PROVISIONAL — not RATIFIED,
which needs Level 3. Attest its hash and the mandate manifest hash.

BE HONEST ABOUT WHAT I CANNOT DO

I likely cannot field an independent verifier from a second vendor, a scheduled
runner with a dead-man switch, or a separate repository for the policy bundle. Do
not fake these and do not silently skip them. For each, write in
audit/06-residual-risk-register.md what is missing, the compensating control, an
executable tripwire, and the owning role. Then keep the affected checks off PASS.
A recorded limitation is a finding. A hidden one is a lie, and it is the exact
decorative control this mandate exists to catch.

If a check genuinely does not apply — no multi-tenancy, no tool-use, no personal
data — mark it NOT-APPLICABLE in an exceptions ledger with the architectural
reason AND the tripwire that reactivates it when that assumption stops holding.

DELIVER

The full audit/ set through 09, governance/constitution.md, scripts/regime/ with
working controls, CI wired to block, and audit/engagement-status.json with
production_eligible COMPUTED — never asserted.

Then tell me: which controls you watched fire, what the seeded-defect catch rate
was before and after, what stays open and why, and the single highest-value thing
I could do next.
````

---

## What you should see

CI that fails on a real problem, and a deploy-admission check that refuses while
blockers remain. `production_eligible` almost certainly still reads `false` — and
for a single-operator project, that is often the correct permanent answer rather
than a failure.

The residual-risk register is the most valuable file this level produces. It is
where the project stops pretending.

## Next

[Level 3 — Standing regime](level-3-standing-regime.md) makes the controls prove
themselves over time.
