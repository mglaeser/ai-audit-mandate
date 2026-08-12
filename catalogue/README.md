# Catalogue

[`checks.json`](checks.json) is the machine-readable index of all 119 checks. It
is **generated** from the mandate prose by
[`scripts/build-catalogue.mjs`](../scripts/build-catalogue.mjs) — do not edit it
by hand.

The prose is the source of truth. `npm run verify` regenerates the catalogue from
the volumes and fails if the committed file was hand-edited, or was not
regenerated after the prose changed.

Be precise about what that does and does not guarantee. `verify` compares bytes,
not meaning: it proves the catalogue is what the extractor produces from today's
prose, so a normative statement the extractor never parses cannot be caught by it
alone. That gap is closed separately, by asserting the extracted data against a
second, independent statement of the same facts — the §7 execution-order tables
and the §3 band table. If the derived band, the escalation set or the check count
disagrees with the prose that states them, the build fails and refuses to write.

## Fields

| Field | Meaning |
| --- | --- |
| `id` | `TRACK-NN`, for example `C-01`. |
| `track` | `A`, `B` or `C`. |
| `title` | The check name, as written in the heading. |
| `priority` | 1–10, as stated in the check heading. |
| `band` | The base band, derived from priority per Volume I §3: `STOP-SHIP` at 10, down to `ASSESS` at ≤4. Always the base band — escalations are recorded, not applied. |
| `stop_ship` | Whether the check can stop a ship, by either route. |
| `stop_ship_class` | `direct` — marked unconditionally, holds production down from Phase 0. `conditional` — escalates when its stated condition holds. |
| `escalation` | `{ to, condition }` when §3 states a condition that re-bands the check, otherwise `null`. |
| `substitutions` | The substitution principles the check names **in its heading trailer** — in practice `S1`–`S6` and `S8`–`S10`. Section-level principles (`S7` commentary, `S11` ratchet, `S12` calibration, `S13` structural fix) are stated in check bodies rather than trailers, so they never appear here; `S13` is surfaced by `has_structural_fix`. |
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
