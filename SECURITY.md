# Security policy

This repository contains documentation and small, dependency-free build scripts.
It processes no user data and ships no runtime service. The security surface is
correspondingly narrow — but two categories of report matter a great deal.

## What to report privately

**A check that can be passed while the underlying property is false.** A probe
with a trivial bypass, a target that can be satisfied decoratively, or a standing
control that can be made to look like it fired when it did not. These are
vulnerabilities in the mandate itself: an engagement that relies on such a check
will produce a report saying a system is safe when it is not, which is worse than
no report at all.

**A defect in the tooling that yields a false clearance.** For example, a
catalogue extractor that silently drops a check, or a manifest that verifies
against text it did not actually hash.

Report both privately through
[GitHub's private vulnerability reporting](https://github.com/mglaeser/ai-audit-mandate/security/advisories/new).

Everything else — wording, scope disagreements, checks you think are too strict
or too lax — belongs in a public issue, where the argument is more useful.

## What to include

- the affected check identifier or script;
- the property the check claims to establish;
- how it can be satisfied while that property is false;
- a suggested strengthening, if you have one.

Do not include real credentials, customer data, private hostnames, or findings
from a live engagement you are not authorised to share. Use synthetic examples.

## What to expect

- acknowledgement within 3 business days;
- an initial assessment within 7 business days;
- credit in the advisory and the changelog, unless you prefer otherwise.

A confirmed bypass results in a strengthened check and a changelog entry naming
what was weak. The mandate's own Rule applies to itself: a control that has been
shown not to block is recorded as failed, not quietly patched.

## Supported versions

The latest tagged release and the default branch receive corrections. Earlier
tags are historical records of what an engagement ran under and are deliberately
immutable — their hashes are load-bearing.
