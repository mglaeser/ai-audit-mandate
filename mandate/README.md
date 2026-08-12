# The mandate

Two volumes, executed in sequence. This directory is the source of truth for
everything else in the repository.

| Volume | File | Scope |
| --- | --- | --- |
| **I** | [`01-foundation-and-core-tracks.md`](01-foundation-and-core-tracks.md) | Rules of engagement, substitution principles, severity bands, execution protocol, finding schema, Tracks A and B (79 checks), structural remediation, the standing regime, and the Constitution. |
| **II** | [`02-security-privacy-assurance.md`](02-security-privacy-assurance.md) | Track C — Security, Privacy and Assurance (40 checks), catalogue v2.0, re-ratification, and the closing definition of done. |

[`manifest.json`](manifest.json) records a SHA-256 per volume plus a combined
digest over their deterministic concatenation.

## Read in order

Volume I first, to completion. It is a complete engagement in itself and it
builds the apparatus — the regime, the constitution, the gates — that Volume II
extends rather than re-derives.

Volume II opens by verifying that Volume I actually happened, and stops if it did
not. It is also the only volume that can clear production: Track C holds two of
the three unconditional `STOP-SHIP` checks (`C-01` and `C-04`; the third, `B-06`,
Volume I closes), and a volume that has not audited them is not entitled to clear
traffic past them.

## Why the files carry hashes

An engagement pins the exact text it ran under. A mandate that shifts mid-flight
is an engagement with no fixed denominator — findings measured against one
catalogue, closed against another.

```bash
npm run verify
```

Editing a volume changes its digest. That is expected for a deliberate content
change and recorded in the changelog. It is not expected from whitespace churn,
which is why `.gitattributes` marks these files `-text` and `.editorconfig`
leaves them alone.

## If you only read one part

Read §0 of Volume I — the operating model and the five hazards. It is four pages
and it explains why every later section is shaped the way it is. Then
[docs/concepts.md](../docs/concepts.md) covers the rest of the reasoning in
summary.
