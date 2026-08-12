# Getting started

This guide takes you from a clone to a running engagement. It assumes you have a
repository you want audited and Node.js 20 or newer for the tooling.

> **Want to skip the manual route?** [Three prompts](prompts/README.md) — one per
> adoption level — hand the whole procedure to a coding agent. This guide is for
> driving it yourself, or for understanding what the agent is doing.

## 0. Decide how deep to go

Level 1 inventories, Level 2 enforces, Level 3 keeps enforcing after you leave.
All three run all 119 checks; they differ in whether the controls execute. See
[adoption levels](adoption-levels.md) — choosing a level you cannot sustain
produces documentation of controls nobody runs, which is the failure mode the
mandate exists to catch.

## 1. Scaffold the workspace

```bash
git clone https://github.com/mglaeser/ai-audit-mandate.git
cd ai-audit-mandate
node scripts/new-engagement.mjs --target ../your-repository
```

That creates `../your-repository/audit/` with Volume I's 79 active checks seeded
at `NO-EVIDENCE`, Track C's 40 registered as a planned extension and named in
`pending_check_ids`, and the mandate's combined hash stamped into the status
file. From this point the engagement is pinned to an exact text.

`NO-EVIDENCE` is a blocking state, not a neutral one. A freshly scaffolded
workspace therefore holds `production_eligible: false` — which is correct, and
which is the point.

## 2. Read before you touch

Read [Volume I](../mandate/01-foundation-and-core-tracks.md) end to end before
doing anything else. It is long. Read it anyway — the execution protocol depends
on knowing the substitution principles and severity bands before you start
finding things.

> **Do not fix anything before Phase 3 completes.** A fix applied during
> discovery destroys the evidence that justified it.

## 3. Work the phases in order

| Phase | You are doing | You are not doing |
| --- | --- | --- |
| 0 | Freezing the baseline and mapping the surface | Changing anything |
| 1 | Reconciling every claim the repo makes about itself | Believing any of them |
| 2 | Seeding defects to measure whether the pipeline catches them | Trusting the pipeline yet |
| 3 | Running the catalogue against the frozen baseline | Fixing what you find |
| 4 | Planning waves, designing structural fixes | Starting the easy ones first |
| 5 | Repairing, one failing test at a time | Merging on any model's opinion |
| 6 | Re-auditing, sampling, verifying | Accepting a fix you did not re-run |
| 7 | Ratifying the constitution, standing up the regime | Declaring victory |

Phase 2 is the one teams skip, and it is the one that determines whether
anything after it means anything. If your pipeline catches two of six seeded
defects, then every `PASS` it produces later carries that error rate. Measure it
first; report it in the executive summary; never round it up.

## 4. Close Volume I, then start Volume II

Volume I is complete for its scope when its Definition of Done is met. It still
cannot clear production — Track C holds two of the three unconditional
`STOP-SHIP` checks, and a volume that has not audited them is not entitled to
clear traffic past them.

[Volume II](../mandate/02-security-privacy-assurance.md) opens by verifying that
Volume I actually happened. If the interval between them was not clean — if the
system served production traffic while `production_eligible` read `false` — that
is a gate-bypass finding, filed before any Track C check runs.

## Verifying the mandate has not shifted

```bash
npm run verify
```

This re-derives the catalogue, the check index and the manifest and fails if any
of them drifted from the
prose. Run it in CI. An engagement whose mandate changed mid-flight is an
engagement with no fixed denominator.

## A note on scope

The mandate is written for a system built end-to-end by AI with no human code
review. If that is not your situation, some checks will be over-engineered for
you — but read them before deciding, because the substitution principle behind
each one usually still applies. The honest move is to mark a check
`NOT-APPLICABLE` with a reason, not to quietly drop it.
