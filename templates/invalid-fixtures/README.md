# Invalid fixtures

Records that must **fail** validation. `npm run schema` runs
`check-finding-shape.mjs --expect-invalid` over this directory and fails if any
of them passes.

They exist because a validator that is only ever pointed at valid input proves
nothing about itself: delete the code enforcing every §5 clause and a
positive-only suite stays green. One fixture per fail-closed clause in Volume I
§5, so removing any one of those rules turns CI red.

| Fixture | The rule it violates |
| --- | --- |
| `pass-without-standing-control.json` | `standing_control` may not be null on a `PASS` |
| `pass-without-demonstration.json` | `standing_control.demonstrated` may not be null on a `PASS` |
| `residual-risk-without-tripwire.json` | a residual risk needs a compensating control **and** a tripwire |
| `na-without-justification.json` | `NOT-APPLICABLE` requires `na_justification` |
| `structural-fix-declined-silently.json` | an available structural fix declined without a rationale |
| `unknown-property.json` | a key the §5 schema does not define |
| `invented-band.json` | a band outside the §3 set |
