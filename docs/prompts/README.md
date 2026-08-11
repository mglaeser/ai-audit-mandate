# Prompts

Three prompts, one per adoption level. Copy the block, paste it into your coding
agent, and it will read the mandate itself and start working.

Each prompt names the parts of the mandate to adopt and — just as importantly —
the parts to skip, so the agent does not build apparatus the project cannot
sustain.

| Level | Prompt | Answers | Effort |
| --- | --- | --- | --- |
| **1** | [Baseline](level-1-baseline.md) | What is actually true here? | hours |
| **2** | [Governed](level-2-governed.md) | What is true, and what keeps it true? | days |
| **3** | [Standing regime](level-3-standing-regime.md) | What survives everyone leaving? | weeks, then permanent |

Not sure which? [Adoption levels](../adoption-levels.md) has the comparison. The
short version: **Level 1** if the repository cannot reach production, **Level 2**
if it is real but single-operator, **Level 3** if you can field an independent
verifier from a second vendor and a scheduled runner.

## Using them

They work with any capable coding agent. Each prompt asks the agent to read the
mandate from its public URL, so you do not need to clone anything first — though
cloning helps, because the scaffolding script is in the repository.

Levels are cumulative. Running Level 2 after Level 1 starts from the existing
findings rather than re-deriving them, so nothing is wasted by starting lower.

## Adapting them

Two edits are usually worth making before you paste:

**Name your constraints.** If there is no production traffic, no personal data,
or no multi-tenancy, say so. The agent will mark the dependent checks
`NOT-APPLICABLE` with a reason and a tripwire instead of inventing findings.

**Name your stack.** The prompts are deliberately language-agnostic. Telling the
agent what it is auditing produces better probes.

What not to edit: the rules about evidence, `NO-EVIDENCE` blocking, watching
controls fire, and never discharging a finding by having a human review it. Those
are what separate an audit from a code review, and softening them is how you get
a report that says a system is safe when it is not.
