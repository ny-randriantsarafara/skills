# Output Contracts

Root outputs under `<scan-root>/.repo-intel/`:
- `inventory.json`
- `inventory.md`
- `org-service-map.mmd`
- `diff.json`
- `diff.md`
- `snapshots/<snapshot-id>/...`
- `repos/<repo>/raw/*.json`
- `repos/<repo>/docs/*.md`

Per-repo raw files:
- `package.summary.json`
- `routes.json`
- `api_surface.json`
- `domain_terms.json`
- `db_models.json`
- `outbound_calls.json`
- `dependencies_external.json`
- `dependencies_internal.json`
- `envvars.json`
- `quality_signals.json`

Per-repo docs:
- `HANDOVER.md`
- `ARCHITECTURE.md`
- `RUNBOOK.md`
- `NEW_DEV.md`
- `HEALTH.md`
- `api_surface.md`
- `domain_glossary.md`

`HANDOVER.md` always contains exactly these sections:
1. What it is
2. What business capability it owns
3. Key flows
4. Core data model
5. External interactions
6. Internal interactions
7. How to run locally
8. How it deploys
9. Operational view
10. Risk notes
11. Onboarding checklist
