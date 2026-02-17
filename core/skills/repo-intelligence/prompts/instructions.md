
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
core/skills/repo-intelligence/scripts/repo-intel.sh <command> [options]
```

Scan all repos under current directory:

```bash
core/skills/repo-intelligence/scripts/repo-intel.sh scan --root .
```

Summarize all scanned repos:

```bash
core/skills/repo-intelligence/scripts/repo-intel.sh summarize --root .
```

Summarize one repo only:

```bash
core/skills/repo-intelligence/scripts/repo-intel.sh summarize --root . --repo my-service
```

Build org-level service map:

```bash
core/skills/repo-intelligence/scripts/repo-intel.sh graph --root .
```

Compare two snapshots:

```bash
core/skills/repo-intelligence/scripts/repo-intel.sh diff --root . --base <snapshot-id> --head <snapshot-id>
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
