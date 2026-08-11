# Catalogue

[`checks.json`](checks.json) is the machine-readable index of all 119 checks. It
is **generated** from the mandate prose by
[`scripts/build-catalogue.mjs`](../scripts/build-catalogue.mjs) — do not edit it
by hand.

The prose is the source of truth. If the two ever disagree, the prose is right
and the catalogue is stale; `npm run verify` fails in exactly that case, which is
the point.

## Fields

| Field | Meaning |
| --- | --- |
| `id` | `TRACK-NN`, for example `C-01`. |
| `track` | `A`, `B` or `C`. |
| `priority` | 1–10, as stated in the check heading. |
| `band` | Derived from priority: `BLOCKER-1` at 9–10 down to `ADVISORY` at 1–2. |
| `stop_ship` | Whether the check can stop a ship, by either route. |
| `stop_ship_class` | `direct` — marked unconditionally, holds production down from Phase 0. `conditional` — escalates when its stated condition holds. |
| `substitutions` | Which substitution principles (`S1`–`S13`) the check invokes. |
| `has_structural_fix` | Whether the check carries an `S13` refactor that makes the defect unrepresentable. |
| `has_standing_control` | Whether permanent machinery is defined. Always `true` — a check without one could never be recorded as `PASS`. |
| `volume` / `part` | Which volume defines the check. |

## Querying

```bash
# Everything that blocks production from day one
jq -r '.totals.stop_ship_direct[]' catalogue/checks.json

# Checks with a structural fix, highest priority first
jq -r '[.checks[] | select(.has_structural_fix)]
       | sort_by(-.priority)[]
       | "\(.id)  \(.priority)/10  \(.title)"' catalogue/checks.json

# How many checks each substitution principle carries
jq -r '[.checks[].substitutions[]] | group_by(.) | map({(.[0]): length}) | add' catalogue/checks.json
```

## Regenerating

```bash
npm run catalogue    # rewrite checks.json from the volumes
npm run verify       # confirm it is current, without writing
```

The extractor asserts the counts it expects — 79 checks in Volume I, 40 in Volume
II, 119 total, no duplicate identifiers, and a standing control on every one. A
check that goes missing fails the build rather than silently shrinking the
denominator.
