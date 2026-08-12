# Prompts

Three prompts, one per adoption level. Copy the block, paste it into your coding
agent, and it will read the mandate itself and start working.

Levels 1 and 2 name the parts of the mandate to adopt and — just as importantly —
the parts to skip, so the agent does not build apparatus the project cannot
sustain. Level 3 skips nothing; that is what makes it Level 3.

| Level | Prompt | Answers | Control scripts | New tests | PRs | Time |
| --- | --- | --- | --- | --- | --- | --- |
| **1** | [Baseline](level-1-baseline.md) | What is actually true here? | none | none | 1–3 | an afternoon |
| **2** | [Governed](level-2-governed.md) | What is true, and what keeps it true? | 10–25 | 15–200 | 10–25 | a few days |
| **3** | [Standing regime](level-3-standing-regime.md) | What survives everyone leaving? | 25–30 | 200–2,000 | 30–60 | weeks |

Counts are what four real implementations actually added — individual test cases,
not lines of test code. The test range is wide because it reflects whether you
configure verification or build it; see
[adoption levels](../adoption-levels.md).

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

Agents without network access cannot run these prompts unmodified: every block
begins by reading the mandate. Give the agent a local copy of the two volumes and
replace the block's first sentence with a pointer to that path.

Not sure which? [Adoption levels](../adoption-levels.md) has the comparison. The
short version: **Level 1** if the repository structurally cannot reach
production, **Level 3** if you can field a second-vendor verifier, a scheduled
runner and a gate its authors cannot write to, **Level 2** for everything else.

## Using them

They work with any capable coding agent. Each prompt asks the agent to read the
mandate from its public URL, so nothing has to be cloned to read it. Levels 1 and
2 do need a clone: their first step runs `scripts/new-engagement.mjs`, which
reads the catalogue, the manifest and the templates from it.

Levels are cumulative. Running Level 2 after Level 1 starts from the existing
findings rather than re-deriving them, so nothing is wasted by starting lower.

## Adapting them

Two edits are usually worth making before you paste:

**Name your constraints.** If there is no production traffic, no personal data,
or no multi-tenancy, say so. The agent will mark the dependent checks
`NOT-APPLICABLE` with a reason and a tripwire instead of inventing findings.

**Name your stack.** The prompts are deliberately language-agnostic. Telling the
agent what it is auditing produces better probes.

What not to edit, wherever a block states them: the rules about evidence,
`NO-EVIDENCE` blocking, watching controls fire, and never discharging a finding
by having a human review it. Level 1 inlines them; Levels 2 and 3 inherit them
from §1 and the Definition of Done, which those blocks require reading in full.
They are what separate an audit from a code review, and softening them is how you
get a report that says a system is safe when it is not.
