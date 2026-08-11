## What changes, and why

<!-- The problem first, then the change. Link an issue if one exists. -->

## Checks affected

<!-- Identifiers, or "none" for documentation and tooling changes. -->

## How this could be proven wrong

<!--
For a catalogue change: what evidence would show your wording is worse than what
it replaces? A change that cannot be argued against usually has not been thought
through.
-->

## Checklist

- [ ] This strengthens the affected checks or makes them more precisely falsifiable — it does not soften them.
- [ ] No control is discharged by "a human reviews it."
- [ ] Any new or changed check carries a standing control with a cadence, a ratchet, and an owning role.
- [ ] `npm run build` was run and the regenerated artifacts are committed.
- [ ] `npm test` passes locally.
- [ ] No drive-by reformatting of the mandate volumes.

> Editing a volume changes its hash. That is expected and fine — but it must be a
> deliberate content change, not whitespace churn, because engagements pin these
> digests.
