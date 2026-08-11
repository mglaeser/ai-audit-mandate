# Level 1 — Baseline

**Answers:** *What is actually true about this repository?*
**Effort:** hours. **Produces:** an evidenced inventory, no enforcement.
**Repository class:** Experimental.

Use this when you want an honest picture before deciding how much apparatus the
project deserves. It changes nothing about how the repository works.

**Typically adds:** 2,500–6,000 lines of audit documentation, no code, no tests,
across 1–3 pull requests. *(Measured across four real engagements; see
[adoption levels](../adoption-levels.md).)*

**One-liner, if you prefer:**

```text
Read https://github.com/mglaeser/ai-audit-mandate/blob/main/docs/prompts/level-1-baseline.md and execute it against this repository.
```

---

````markdown
Act as the auditor described in the AI Audit Mandate. Clone
https://github.com/mglaeser/ai-audit-mandate into a sibling directory, or read it
at that URL, and follow it — do not improvise a different audit.

ADOPT AT LEVEL 1 — BASELINE. Read these parts and apply them:

- mandate/01-foundation-and-core-tracks.md §0 (operating model, five hazards),
  §1 (rules of engagement), §3 (severity bands), §5 (finding-record schema),
  and the Track A and Track B catalogue in §6.
- mandate/02-security-privacy-assurance.md — the Track C catalogue only. Run the
  40 checks as discovery. Do not attempt Volume II's regime extension, its
  re-ratification, or its definition of done.
- docs/concepts.md for the vocabulary.

Skip for now: §6.5 structural remediation, §9 the standing regime, §10
operational reality, and Appendix A the Constitution. Those are Level 2 and 3.

WHAT I WANT

All 119 checks carrying a verdict backed by evidence, so I know where this
repository actually stands. Findings only — no fixes, no CI changes, no
refactors. If you find something catastrophic, tell me immediately and stop;
do not fix it.

HOW TO WORK

1. Scaffold the workspace:
     node scripts/new-engagement.mjs --target <this repository>
   Every check starts at NO-EVIDENCE and production_eligible reads false. Both
   are correct. Leave them until evidence changes them.

2. Freeze the baseline. Record the commit hash under audit. Every verdict must
   be rendered against that frozen state.

3. Map the audit surface into audit/00-audit-surface.json — every module, route,
   job, data store and egress path. This is the denominator. A file you never
   listed is a file you never audited.

4. Reconcile claims (audit/01-claims-ledger.md). Take every claim the repository
   makes about itself — README, comments, config names, docstrings — and check it
   against the code. Names are claims. A function called validateInput that
   validates nothing is a finding, not a naming quibble.

5. Run all 119 checks. For each, record: the probe you actually ran, the evidence
   (file paths, line numbers, command output), and a verdict. Then sweep every
   finding repository-wide before closing it — one generator wrote this code, so
   a defect is rarely singular. Record how many clones you found.

6. Band the findings by priority per §3 and write audit/09-executive-summary.md.

RULES I WILL CHECK YOU ON

- NO-EVIDENCE is a blocking state, not a neutral one. A check you did not run
  stays NO-EVIDENCE. Never mark something PASS because it looks fine.
- Every verdict cites an artifact I can re-examine myself. "Appears to handle
  errors correctly" is not evidence. A file and a line number is.
- Never discharge a finding by suggesting a human review it. Record it as open.
- Do not fix anything. A fix during discovery destroys the evidence for it.
- Report what is wrong, not how much is right. I have an unlimited supply of
  reassurance already.

DELIVER

audit/00-audit-surface.json, 01-claims-ledger.md, 03-findings.json (all 119),
03b-coverage-ledger.md mapping every surface item to the checks that touched it,
and 09-executive-summary.md.

Then tell me three things: the most dangerous thing you found, the thing most
likely to be wrong that you could not verify, and whether this repository should
move to Level 2.
````

---

## What you should see

A findings file where most checks are `PARTIAL` or `FAIL`, and a meaningful
number are `NOT-APPLICABLE` with a stated reason. That distribution is normal and
healthy — a first audit returning mostly `PASS` means the checks were not run
adversarially.

`production_eligible` stays `false`. Level 1 cannot change it.

## Next

[Level 2 — Governed](level-2-governed.md) turns the top findings into controls
that actually block.
