---
name: repo-intelligence
description: Analyze one or more repositories and produce a structured handover pack that explains business ownership, domain boundaries, key flows, data model, runtime/deploy/operations, and risk notes. Use when the user asks for repository intelligence, architecture handover, business logic mapping, service interaction mapping, onboarding docs, or repo-to-repo dependency graphs.
---

# Repo Intelligence

Generate deterministic repository intelligence artifacts from static code and config signals.

## Workflow

1. Run `scan` to collect structured raw facts.
2. Run `summarize` to generate handover and onboarding docs.
3. Run `graph` to emit org/service Mermaid graph.
4. Run `diff` to compare two snapshots.

## Commands

Entrypoint:

```bash
skills/repo-intelligence/scripts/repo-intel.sh <command> [options]
```

Scan all repos under current directory:

```bash
skills/repo-intelligence/scripts/repo-intel.sh scan --root .
```

Summarize all scanned repos:

```bash
skills/repo-intelligence/scripts/repo-intel.sh summarize --root .
```

Summarize one repo only:

```bash
skills/repo-intelligence/scripts/repo-intel.sh summarize --root . --repo my-service
```

Build org-level service map:

```bash
skills/repo-intelligence/scripts/repo-intel.sh graph --root .
```

Compare two snapshots:

```bash
skills/repo-intelligence/scripts/repo-intel.sh diff --root . --base <snapshot-id> --head <snapshot-id>
```

## Outputs

Read output contracts in:
- `references/output-contracts.md`
- `references/framework-detection.md`
- `references/domain-term-rules.md`

All generated files are written under `<root>/.repo-intel/`.

## Operating Rules

- Prefer static analysis and deterministic synthesis.
- Do not rely on marketing text when ownership can be inferred from APIs, entities, events, and dependencies.
- Keep docs factual and grounded in extracted files.
- Keep generated narratives concise and human-handover friendly.
