# Level 3 — Standing regime

**Answers:** *What survives everyone leaving?*
**Effort:** weeks, then permanent. **Produces:** machinery that proves itself.
**Repository class:** Production.

The full mandate. Controls are calibrated against their own decay, baselines
ratchet, the constitution is ratified, and `production_eligible` becomes
computable.

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

1. A calibration corpus (S12, A-36). Seeded defects covering at minimum: prompt
   injection, an exfiltration path, a cross-tenant read, a hallucinated
   dependency, a swallowed exception, an assertion-free test. Re-inject on a
   schedule. The catch rate is a live SLI. When it falls, releases freeze
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

SEPARATION OF POWERS (B-35, Article II)

The identity that writes code cannot be the identity that modifies the gate. Put
the policy bundle under separate ownership with its own credentials and prove the
separation with a CI assertion.

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
