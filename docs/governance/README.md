# Governance — CB67 Labs

## ⚠ This repository is public. Governance here is deliberately sanitized.

Project governance exists in **two layers**, and the split is a security control,
not an organisational preference:

| Layer                       | Location                                               | Contents                                                                                                                                                                      |
| --------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Public** (this directory) | `docs/governance/` in the public repo                  | Principles, process, decision rationale, threat model _classes_, definitions of ready/done, sprint structure                                                                  |
| **Private**                 | `/opt/apiserver/docs/governance/` on the platform host | Everything above **plus** private addressing, internal hostnames, key fingerprints, filesystem paths, port inventory, operator source addresses, and raw reviewer transcripts |

### Why

An audit of the private governance set found private IPs in 13 files, the
internal hostname in 9, key fingerprints in 2, and an operator's public source
address in 1. Publishing those to a public repository would hand an attacker a
network map, a host inventory and a target list — the exact information
disclosure the platform's own security policy forbids.

The rule is simple and applies to every future document added here:

> Public governance describes **how we decide and what we require**.
> It never describes **where things are or how to reach them**.

### What must never appear in this directory

- Private IP addresses or network ranges
- Internal hostnames
- Filesystem paths to secrets, keys or certificates
- Key fingerprints or identifiers
- Port inventories or bind addresses
- Operator source addresses
- Component versions of internal services (aids CVE targeting)
- Raw log excerpts or command output that carries any of the above

### What belongs here

- Principles and constraints
- Decision records with rationale and trade-offs
- Threat model by _class_ of threat and control
- Definition of Ready / Definition of Done
- Sprint structure and gate criteria
- Review verdicts and their dispositions

## Index

| Document                                         | Purpose                                               |
| ------------------------------------------------ | ----------------------------------------------------- |
| [VISION.md](VISION.md)                           | What the platform is, and what it deliberately is not |
| [ARCHITECTURE.md](ARCHITECTURE.md)               | Planes, boundaries, request pipeline                  |
| [THREAT-MODEL.md](THREAT-MODEL.md)               | Adversaries, assets, controls                         |
| [SECURITY.md](SECURITY.md)                       | Security policy and acceptance criteria               |
| [DEFINITION-OF-READY.md](DEFINITION-OF-READY.md) | Entry criteria for implementation                     |
| [DEFINITION-OF-DONE.md](DEFINITION-OF-DONE.md)   | Exit criteria, severity scale, anti-theatre rules     |
| [DECISIONS.md](DECISIONS.md)                     | Decision log                                          |
| [SPRINTS.md](SPRINTS.md)                         | Sprint structure and gates                            |
| [CODEX-REVIEWS.md](CODEX-REVIEWS.md)             | Independent reviewer verdicts                         |
| [TEST-PLAN.md](TEST-PLAN.md)                     | What "tested" means per layer                         |
| [OPERATIONS.md](OPERATIONS.md)                   | Operating principles (procedures stay private)        |
| [DISASTER-RECOVERY.md](DISASTER-RECOVERY.md)     | Recovery objectives and validation rules              |

## Roles

**Claude Code** — Engineering team. Implements, tests, documents.

**Codex** — Scrum Master and Independent Reviewer. Reviews, challenges, gates.
Does not implement and does not modify files. No sprint is DONE without a
recorded verdict.

Claude may not declare a sprint complete on its own authority.
