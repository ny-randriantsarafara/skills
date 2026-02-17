# llm-skills-platform

LLM-agnostic skills platform with canonical skill definitions and generated adapters.

## Source of truth

- Canonical skills: `core/skills/<skill-id>/skill.yaml`
- Canonical schema: `core/schema/skill.schema.json`
- Adapter manifest schema: `core/schema/adapter-manifest.schema.json`

## Generated outputs

- Adapters: `adapters/<tool>/<skill-id>/...`
- Compatibility matrix: `docs/compatibility-matrix.md`

## CLI

Use `skillctl` from `tools/skillctl`:

```bash
make bootstrap
make validate
make build TOOL=all
make matrix
make install TOOL=claude DEST=~/.claude/skills
make sync TOOL=all DEST=/tmp/skills
make doctor
```

## Tool tiers

- Tier1: Codex, Claude, Cursor
- Tier2: Copilot
