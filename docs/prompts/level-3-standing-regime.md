# Level 3 — Standing regime

**Answers:** *What survives everyone leaving?*
**Effort:** weeks, then permanent. **Produces:** machinery that proves itself.
**Repository class:** Production.

The full mandate. Controls are calibrated against their own decay, baselines
ratchet, the constitution is ratified, and `production_eligible` becomes
computable.

**What it adds to your repository:** everything Level 2 adds, plus the machinery
that proves the controls still work — a calibration corpus, a gate self-test, a
ratchet register, decay detectors. Roughly **25–30 control scripts** and
**200–2,000 new tests**, because the controls get tested too. Typically **30–60
pull requests** over weeks.

The upper end is not hypothetical: one engagement that built its own cross-vendor
verifier and write-separated lane wrote 2,023 tests and 36,000 lines of control
code. If you are building that infrastructure rather than configuring it, plan
accordingly. *(See [adoption levels](../adoption-levels.md).)*

**One-liner, if you prefer:**

```text
Read https://github.com/mglaeser/ai-audit-mandate/blob/main/docs/prompts/level-3-standing-regime.md and execute it against this repository.
```

---

````markdown
Act as the auditor described in the AI Audit Mandate. Clone
https://github.com/mglaeser/ai-audit-mandate into a sibling directory, or read it
at that URL, and follow it — do not improvise a different audit.

ADOPT AT LEVEL 3 — STANDING REGIME. Read and apply BOTH volumes in full,
including every part a lighter adoption skips:

- mandate/01-foundation-and-core-tracks.md complete — and specifically §9 (the
  standing regime: the ratchet S11, the cadence, continuous calibration S12, the
  decay watch, re-run triggers, the standing executors, freeze semantics, the
  evidence ledger, additive growth, and the regime applied to itself), §10
  (operational reality — the fast lane, burn-in, safe modes, the session tax),
  §11 (definition of done), and Appendix A in full including Article XV.
- mandate/02-security-privacy-assurance.md complete — all 40 Track C checks, the
  Phase 0'-7' protocol, and the closing definition of done.

Execute Volume I to closure FIRST, then Volume II. Volume II verifies that
Volume I actually happened and stops if it did not. Do not interleave them.

WHAT I WANT

A machine that keeps this system correct after I stop paying attention. Not a
report. The report is a by-product; the regime is the deliverable.

EXECUTE THE FULL PROTOCOL

Phases 0-7 over Volume I, then Phases 0'-7' over Volume II. Everything Level 2
does, plus the parts that make controls durable rather than merely present.

THE PART THAT ACTUALLY MATTERS — MAKE THE CONTROLS PROVE THEMSELVES

A safeguard installed once and never re-proven has already begun to fail. Build,
in scripts/regime/ and wired into CI and a schedule:

1. A calibration corpus (S12, A-36). Seeded defects covering at minimum: a
   hard-coded credential, prompt injection, an exfiltration path, a cross-tenant
   read, a hallucinated dependency, a swallowed exception, an assertion-free
   test. Do not drop the credential — it is the seed for B-06, the only
   unconditional STOP-SHIP that Volume I can close. Re-inject on a schedule. The catch rate is a live SLI. When it falls, releases freeze
   automatically — not a dashboard, a freeze.

2. A gate self-test (A-01). The policy bundle carries its own suite proving it
   blocks what it claims to block. Run it weekly against a synthetic change that
   violates each gate condition in turn. A gate that stops catching its seed is a
   failed gate and freezes all merges — not just the offending one, because the
   backstop itself has degraded.

3. A ratchet register (S11). Every measured baseline — mutation score, flaky
   rate, bypass paths at zero, open blockers, injection attack-success rate,
   components without provenance — may never regress. A regression blocks merges.

4. The decay watch (§9.4). Detectors for how this system will actually die:
   suppression counts creeping up, controls quietly disabled, drills overdue,
   evidence gone stale, coverage ledger shrinking.

5. Mutation testing as a permanent floor (A-02). Coverage that stays green when
   you break the code is decoration. Measure the mutation score, gate on it, and
   never lower the bar.

6. Re-run triggers (§9.5) and the monthly drill schedule (§9.2): rollback drill,
   restore drill, kill-switch pull, guardrail killed to prove fail-closed, an
   ungated amendment attempt that must be refused, a fast-lane escape seed that
   must fail to reach the lane.

INDEPENDENCE IS NOT OPTIONAL HERE (A-39, Article IV)

The model family that wrote the bug cannot be the one certifying the fix. Every
fix is attacked by an independent verifier from a DIFFERENT vendor with a
falsifying objective, and the merge decision belongs to a deterministic gate that
does not care what any model concluded. If you cannot field this, you cannot
reach Level 3 — say so plainly rather than simulating it, and deliver Level 2
with the gap recorded.

Build the panel so it cannot be faked green:
  - a named REQUIRED approver that must explicitly approve; a refutation at any
    confidence is a veto, and a missing or fallback-replaced approver blocks;
  - at least one additional DISTINCT model approving — repeat votes from the same
    model never count twice;
  - no key present means the panel is INACTIVE and says so, exiting visibly with
    the residual recorded — never fake-green, never fake-blocking.

Two further anti-tamper mechanisms, not stated in the mandate but learned from
practice — adopt them as engineering judgement, not as a mandate requirement:
  - anti-canned-green: a majority of approvals must carry substantive, mutually
    distinct reasons;
  - anti-hardcoded-green: issue a random per-run challenge each approval must
    echo, so a future "return green" shortcut without a real round-trip fails.

AND MIND WHERE THE CREDENTIAL LIVES — THIS IS THE TRAP

A verifier that runs candidate code while holding the reviewer's credential is
not a verifier; it is a credential-disclosure path with a review-shaped name.
If your CI runs the panel from the pull request's own checkout, then opening a
PR that edits the panel script is sufficient to run arbitrary code with your
provider keys — and to control what the reviewer reports about the change.

So: the reviewed artifact must never hold the reviewer's credentials, and
candidate code must never authenticate its own review. Concretely —
  - run the credential-bearing job from a PROTECTED ref or a separate verifier
    repository, never from the candidate checkout;
  - take the candidate in as INERT DATA: fetched, hashed, never imported and
    never executed;
  - refuse `pull_request_target` and any `workflow_dispatch` whose ref input can
    select a candidate branch — both run with secrets against content the PR
    controls;
  - pin every action to an immutable commit SHA, never a moving tag;
  - assert at runtime that the engine is not the candidate checkout, by path AND
    by module origin.

Audit this before you build anything else on top of it. If you find this hole in
an existing setup, do not patch the workflow — remove the secrets from it and
rebuild the lane write-separated. A patched credential boundary is still a
credential boundary that was wrong once.

SEPARATION OF POWERS (B-35, Article II)

The identity that writes code cannot be the identity that modifies the gate. Put
the policy bundle under separate ownership with its own credentials and prove the
separation with a CI assertion.

MERGE AUTHORITY

If a person presses merge, mechanise the parts that are catastrophic to get
wrong: pin the exact reviewed head (a green check describes a COMMIT, not a pull
request — the author can push between your reading the verdict and your merging),
and refuse admin overrides and auto-merge. A status that describes itself as
trusted, write-separated or independently attested when it is none of those must
be rejected by the gate, not believed.

RATIFY (Phase 7, then 7')

Constitution at governance/constitution.md, every placeholder replaced by a
measured value, state RATIFIED at catalogue v2.0, hash-attested along with the
mandate manifest. Prove the amendment gate by attempting an ungated amendment and
capturing the refusal. Every agent session declares the constitution hash before
acting; a session without the current hash does not run.

DEFINITION OF DONE — CHECK YOURSELF AGAINST §11 AND VOLUME II'S CLOSING LIST

You are not done when findings are closed. You are done when the machine that
keeps them closed is running. Specifically:

- every one of the 119 checks has a standing control you have WATCHED block
  something, with the log in audit/05-verification.md;
- zero open STOP-SHIP, BLOCKER-1, BLOCKER-2;
- every fix has a test that went red before and green after, plus a mutation
  score proving that test can fail, plus a clone sweep with no survivors;
- the closing sample: at least 10% of all 119 checks re-verified, at least one
  from every represented band and each of Tracks A, B and C — widened to 30% on
  any disagreement;
- audit/engagement-status.json reads production_eligible COMPUTED from the gate
  invariants, never asserted, and the admission gate demonstrably refused a
  non-compliant artifact — with the log kept.

FINAL INSTRUCTION, WHICH OUTRANKS THE OTHERS

Near the end you will be tempted to write that the system is now in good shape.
Resist it. My value from you is the list of what is still wrong and what will go
wrong next, together with what is now watching for it. Never close a finding by
proposing a human review it, and never close one without leaving a standing
control behind it. A system with no reviewer does not hold its quality; it leaks
it quietly, in defensible increments, until it is exactly what it was before you
arrived — except now with a report saying otherwise.
````

---

## What you should see

Controls that fail loudly when they stop working. The signature of a real Level 3
is a gate self-test that reports one of its own conditions no longer catching its
seed, and freezes merges over it — the regime detecting its own decay before you
do.

`production_eligible` becomes computable. Whether it computes to `true` depends
on evidence, and `false` with a documented reason is a legitimate final state.

## Before you start

Be honest that you can field an independent second-vendor verifier and a
scheduled runner. If you cannot, [Level 2](level-2-governed.md) with recorded
residual risk is the stronger, more truthful outcome.
