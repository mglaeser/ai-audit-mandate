# Engagement templates

Starting points for the artifacts an engagement produces. Copy them into the
repository under audit, then fill them from evidence — never from expectation.

| Template | Copy to | Purpose |
| --- | --- | --- |
| [`engagement-status.json`](engagement-status.json) | `audit/engagement-status.json` | The computed state of the engagement. A deploy gate reads this file and fails closed on it. |
| [`finding-record.json`](finding-record.json) | one element of `audit/03-findings.json` | One check's record: probe, evidence, clone sweep, structural fix, standing control, verification. |
| [`audit-workspace/`](audit-workspace) | `audit/` | The full artifact set, numbered in the order the phases produce them. |

## The two rules these templates encode

**Fail closed.** `production_eligible` starts `false` and stays `false` until it is
*computed* `true` from the gate invariants. It is never set by hand, and never
set by a model's judgement that things look fine.

**No verdict without evidence.** Every check starts at `NO-EVIDENCE`, which is a
blocking state, not a neutral one. A check moves off it only when an artifact
someone else could re-examine says so.

## Scaffold an engagement

```bash
node scripts/new-engagement.mjs --target ../path/to/repository
```

That copies the workspace, stamps the mandate hashes from
[`mandate/manifest.json`](../mandate/manifest.json) into the status file, and
leaves every verdict unset. It will not overwrite an existing `audit/`
directory.
