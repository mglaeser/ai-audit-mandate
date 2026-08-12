# Audit workspace

Copy this directory to `audit/` in the repository under audit. The files are
numbered in the order the phases produce them, so the directory listing reads as
the engagement's own timeline.

| File | Phase | What it holds |
| --- | --- | --- |
| `00-system-map.md` | 0 | What this system is, generated from the frozen baseline. |
| `00-audit-surface.json` | 0 | The denominator: every module, route, job, store and egress path. |
| `00-check-catalogue.json` | 0 | The active catalogue, seeded from `catalogue/checks.json`. |
| `01-claims-ledger.md` | 1 | Every claim the repository makes about itself, and whether it is true. |
| `02-calibration.md` | 2 | Seeded defects, and how many the pipeline caught before you trusted it. |
| `03-findings.json` / `.md` | 3 | One record per **active** check — Volume I's 79 at catalogue v1.0. Track C's 40 join when Part 2 opens v2.0. The machine-readable file is authoritative. |
| `03b-coverage-ledger.md` | 3 | Every surface item mapped to the checks that touched it. |
| `04-remediation-plan.md` | 4 | Waves, dependencies, and the structural ledger. |
| `05-verification.md` | 5–6 | Per-fix proof: red test, green test, mutation score, sweep, control fired. |
| `06-residual-risk-register.md` | 6 | What stays open, with a compensating control and a tripwire. |
| `07-substitution-ledger.md` | 6 | Every control that used to end in a person, and the mechanism that replaced it. |
| `08-standing-regime.md` | 7 | The machine that keeps the findings closed. |
| `09-executive-summary.md` | 7 | Written last. States the pipeline's catch rate, not the auditor's confidence. |
| `engagement-status.json` | all | The computed gate state. A deploy gate reads this and fails closed. |
| `evidence/` | all | Raw artifacts: logs, captures, run outputs. Append-only. |

## Two conventions worth keeping

**The JSON files are authoritative; the Markdown is for humans.** When they
disagree, the JSON wins, because that is what the gate reads.

**`evidence/` is append-only.** The regime's memory is write-protected for the
same reason a flight recorder is: the moment it can be edited, it stops being
evidence.
