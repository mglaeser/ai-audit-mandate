# Prompts

Three prompts, one per adoption level. Copy the block, paste it into your coding
agent, and it will read the mandate itself and start working.

Each prompt names the parts of the mandate to adopt and — just as importantly —
the parts to skip, so the agent does not build apparatus the project cannot
sustain.

| Level | Prompt | Answers | Adds | PRs | Time |
| --- | --- | --- | --- | --- | --- |
| **1** | [Baseline](level-1-baseline.md) | What is actually true here? | 2.5–6k docs | 1–3 | hours |
| **2** | [Governed](level-2-governed.md) | What is true, and what keeps it true? | 4–8k docs, 1.5–4k code, 0.5–3k tests | 10–25 | days |
| **3** | [Standing regime](level-3-standing-regime.md) | What survives everyone leaving? | 5–10k docs, 5–15k code, 3–10k tests | 30–60 | weeks |

Line counts are what a completed engagement adds, averaged over four real
implementations with the mandate's own text excluded. See
[adoption levels](../adoption-levels.md) for the caveats — control code varies by
an order of magnitude depending on how much verification you build rather than
configure.

## The one-liners

If you would rather not paste a whole prompt, paste one of these instead. The
agent fetches the full instructions itself.

```text
Read https://github.com/mglaeser/ai-audit-mandate/blob/main/docs/prompts/level-1-baseline.md and execute it against this repository.
```

```text
Read https://github.com/mglaeser/ai-audit-mandate/blob/main/docs/prompts/level-2-governed.md and execute it against this repository.
```

```text
Read https://github.com/mglaeser/ai-audit-mandate/blob/main/docs/prompts/level-3-standing-regime.md and execute it against this repository.
```

Agents without network access need the full prompt pasted directly — the blocks
in each level's page are self-contained.

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
