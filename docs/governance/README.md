# Governance — CB67 Labs

## This repository is public. Governance here is deliberately sanitized.

Project governance exists in **two layers**, and the split is a security control
rather than an organisational preference:

| Layer                                               | Contents                                                                                                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Public** (this directory)                         | Principles, process, decision rationale, threat model _classes_, definitions of ready/done, sprint structure, review verdicts                           |
| **Private** (restricted-access platform repository) | Everything above, plus operational topology, addressing, host identifiers, credential metadata, filesystem layout, raw evidence and recovery procedures |

### The rule

> Public governance describes **how we decide and what we require**.
> It never describes **where things are or how to reach them**.

### What must never appear in this directory

- Private addressing or network ranges
- Internal hostnames
- Filesystem paths to secrets, keys or certificates
- Key fingerprints or identifiers
- Port inventories or bind addresses
- Operator source addresses
- Versions of internal services (aids CVE targeting)
- Raw log excerpts or command output carrying any of the above

An audit of the private governance set before publishing anything here found
material in every one of those categories. None of it reached this repository,
and a pre-push scan checks for it on every push.

### What belongs here

Principles and constraints · decision records with rationale and trade-offs ·
threat model by class of threat and control · Definition of Ready / Definition
of Done · sprint structure and gate criteria · review verdicts and dispositions.

## Contents

| Document                                                                                                                                      | Status                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `README.md` (this file)                                                                                                                       | **Present**                                                                               |
| Sanitized VISION, ARCHITECTURE, THREAT-MODEL, SECURITY, DoR, DoD, DECISIONS, SPRINTS, CODEX-REVIEWS, TEST-PLAN, OPERATIONS, DISASTER-RECOVERY | **Planned** — maintained privately today; sanitized versions land as each passes its gate |

Listing them as links before they exist would make this index a promise rather
than a description, which is the same failure mode the project rejects
elsewhere. They are named here so the intended shape is visible, and marked
planned so nobody mistakes intent for delivery.

Frontend-facing contracts that _are_ delivered live one directory up:
[`API-CONTRACTS.md`](../API-CONTRACTS.md), [`ENVIRONMENT.md`](../ENVIRONMENT.md),
[`FRONTEND-HANDOFF.md`](../FRONTEND-HANDOFF.md), [`MANIFEST.md`](../MANIFEST.md),
[`ROUTES.md`](../ROUTES.md), and the design documents alongside them.
Sprint evidence is in [`../evidence/`](../evidence/).

## Roles

**Claude Code** — Engineering team. Implements, tests, documents.

**Codex** — Scrum Master and Independent Reviewer. Reviews, challenges, gates.
Does not implement and does not modify files.

No sprint reaches DONE without a recorded reviewer verdict. Engineering may not
declare its own work complete.
