# Concepts

The vocabulary the mandate uses, and why each idea exists. Read this if you want
the reasoning without the full 390 KB.

## The operating model

> Humans set the specification and hold the halt authority. They do not review changes.

Intent enters at the top as an executable specification. Verification happens
below, entirely by machine. The human is **in command**, never **in the loop**.

This sounds like a downgrade and is not. In-the-loop approval at machine change
velocity does not produce oversight; it produces a rubber stamp. Replacing the
approver with a gate that cannot be tired, rushed, or socially pressured is an
upgrade — but only while the gate is real, and only for as long as it stays real.

## The five hazards

A codebase with no human author fails in specific ways:

1. **Confident absence** — things that look present and are not. A regex named
   `guardrail`. A CI step ending in `|| true`. A `SECURITY.md` describing
   controls nobody built. Presence of a name is not presence of a control.
2. **Fabricated surface** — packages that exist on no registry, API methods that
   were never in the library, config keys invented because they were plausible.
3. **Clonal defects** — one generator wrote everything, so mistakes repeat
   verbatim. A missing ownership check is rarely one bug; it is a template
   applied fifteen times.
4. **No backstop** — the useful question is not *who understands this module* but
   *what artifact proves what this module does*.
5. **Reflexive verification** — the same model family that wrote the bug is asked
   to find the bug, then to judge whether the fix worked.

Hazard 3 is why a finding stays open while a clone of it survives. Hazard 5 is
why verification must come from a different vendor and end in a deterministic
arbiter that does not care what any model thinks.

## Substitution (S1–S13)

Every function the human reviewer used to perform must be replaced by something
deterministic, machine-executed, adversarially tested, and fail-closed. Each
substitution carries an identifier, cited inline on the checks that depend on it.

The checks where a substitution appears are the ones that matter most, because
they are exactly the ones a conventional audit would quietly pass.

## Severity bands

Priority drives the band; the band drives what it blocks.

| Band | Priority | Effect |
| --- | --- | --- |
| `STOP-SHIP` | 10, or escalated | No production traffic. Fail closed. |
| `BLOCKER-1` | 9–10 | Blocks release. |
| `BLOCKER-2` | 7–8 | Blocks release. |
| `MUST-FIX` | 5–6 | Fixed, or a dated residual-risk record with a tripwire. |
| `SHOULD-FIX` | 3–4 | Planned. |
| `ADVISORY` | 1–2 | Recorded. |

Three checks are `STOP-SHIP` by direct mark; two more escalate into it
conditionally. The distinction matters: a direct mark holds production down from
Phase 0, before anyone has looked at anything.

## Verdicts

`NO-EVIDENCE` is the starting state and it **blocks**. This is the single most
important convention in the schema: a check nobody has run is not neutral, it is
unknown, and unknown fails closed. A verdict moves off `NO-EVIDENCE` only when an
artifact someone else could re-examine says so.

## Standing controls

A finding is not closed by a fix. It is closed by a fix **plus** the permanent
machinery that keeps it fixed — with a cadence, a ratchet on its metric, its own
calibration, what it blocks when it trips, and an owning role.

Under the mandate's own rules, a check with no standing control cannot be
recorded as `PASS`, and a check whose only control is "a human reviews it" is an
automatic `FAIL`.

And the control must have been **watched**. Not designed, not configured —
watched. You re-introduce the defect and record the refusal. A control you have
not seen fire is a control you are hoping about.

## Structural fixes (S13)

44 of the 119 checks carry one. A structural fix removes the need for a standing
control entirely by making the defect *unrepresentable* rather than detectable.

The canonical example: rather than adding an ownership check to fifteen routes,
push tenancy into the data-access layer so a query cannot be constructed without
an ownership predicate. You stop finding the bug because you can no longer write
it. Fix the sixteenth route by hand and you will be back for the seventeenth.

Where a structural fix exists, read it before the standing control. It is the
cheaper fix, and it is the only one that cannot decay.

## The ratchet, the heartbeat, and decay

A safeguard installed once and never re-proven has already begun to fail. So the
regime carries three ideas:

- **The ratchet (S11)** — measured baselines that may never regress.
- **The heartbeat (S12)** — defects re-seeded on a schedule; a pipeline that
  stops catching them is a failed pipeline, and its catch rate is a live signal
  that freezes releases when it falls.
- **The decay watch** — detectors for how the system will actually die, which is
  rarely dramatically and usually in defensible increments.

## Why the volumes are sequential

Volume I builds the apparatus and audits what was built and how it ships. Volume
II audits what an attacker, a regulator, or an acquirer's counsel will ask.

The split is a scope boundary with a fixed sequence, not a priority statement.
Volume II holds the highest-severity items, which is precisely why it cannot run
first: it extends a standing machine and cannot substitute for one. In the
interval between the volumes, the honest machine-readable status of the system is
`production_eligible: false` — a computed field a deploy gate reads and fails
closed on, not a sentence a reader can skim.
