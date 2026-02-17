# Migration Guide: Legacy `skills/` to `core/ + adapters/`

This repository now uses canonical skill definitions under `core/skills/<skill-id>/skill.yaml`.

## New Model

1. `core/skills/` is the source of truth.
2. `adapters/<tool>/` is generated output for each target assistant.
3. `tools/skillctl` builds, validates, installs, and syncs adapters.

## Typical Workflow

1. Edit canonical content in `core/skills/<skill-id>/`.
2. Run `make validate`.
3. Run `make build TOOL=all`.
4. Run `make matrix`.
5. Optionally run `make install TOOL=<tool> DEST=<path>`.

## Legacy Folder

The legacy `skills/` folder remains during migration for backward compatibility.
Do not introduce new source-of-truth edits there.

## Tool Tiers

- Tier1: `codex`, `claude`, `cursor`
- Tier2: `copilot`

Tier2 adapters include explicit unsupported-feature notes in each `adapter-manifest.json`.
