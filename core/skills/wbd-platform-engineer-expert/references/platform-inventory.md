# WBD Platform Inventory (Engineer View)

Source snapshot: `/Users/nrandriantsarafara/Works/wbd/.repo-intel`  
Snapshot id: `nogit-2026-02-17T13-19-44-366Z`  
Generated: 2026-02-17

## Repository Routing Table

| Repository | Technical Role | Core Folders | Key Runtime/Contract Signals |
| --- | --- | --- | --- |
| `customer-support-monorepo` | Customer support services and shared packages | `services/`, `packages/`, `plugins/`, `terraform/` | 2 Kafka consumers, no HTTP routes detected, Salesforce/Zendesk host signals |
| `eurosport-taxonomy` | Taxonomy APIs and supporting lambdas/shared libs | `api/src/`, `shared/src/`, `lambdas/` | Fastify routes for taxonomy search/admin, DynamoDB/Mongo usage signals |
| `eurosport-uri` | URI parsing and canonical URL generation service | `src/` (alias/domain/inarena/infinity/taxonomy modules) | Product docs define `/context` and `/generate`, integrates with Taxonomy/Infinity/Netsport |
| `graphql-api` | GraphQL aggregation gateway and integration hub | `src/` (data-sources/resolvers/services/typeDefs), `database/`, `features/` | Health route + Kafka consumer signals, broad downstream env contract surface |
| `infinity-cms-2` | Editorial CMS backend, frontend, and lambdas | `backend/src/`, `frontend/`, `lambdas/`, `scripts/`, `playwright/` | 39 frontend pages, many backend modules, queue and search integrations |
| `netsport-export-service` | Partner export and ingest jobs | `packages/`, `functional-tests/` | Job-oriented scripts for ingest/export, depends on GraphQL/API/topic contracts |

## Cross-Repo Contract Cues

Validate these seams before and after changes:

- `INARENA_API_BASE_URL`: used by `eurosport-uri`, `graphql-api`, `infinity-cms-2`.
- `INFINITY_CMS_API_BASE_URL`: used by `eurosport-uri`, `graphql-api`, `infinity-cms-2`.
- `TAXONOMY_API_BASE_URL`: used by `eurosport-uri`, `graphql-api`, `infinity-cms-2`.
- `URI_API_URL`: present in `graphql-api` env contracts.
- `GRAPHQL_API`: present in `netsport-export-service` env contracts.
- `NETSPORT_API_URL`: present in `eurosport-uri` and `infinity-cms-2` env contracts.

Use these as integration leads; confirm concrete usage in source before changing contracts.

## Quality Hotspots

| Repository | Signal |
| --- | --- |
| `infinity-cms-2` | 74 import cycles; TypeScript strict disabled; 91 env vars |
| `graphql-api` | TypeScript strict disabled; 78 env vars; very large code/test surface |
| `customer-support-monorepo` | 10 import cycles |
| `eurosport-taxonomy` | TypeScript strict disabled; 4 import cycles |
| `eurosport-uri` | 5 import cycles |
| `netsport-export-service` | TypeScript strict disabled |

## Evidence Paths

- `/Users/nrandriantsarafara/Works/wbd/.repo-intel/inventory.md`
- `/Users/nrandriantsarafara/Works/wbd/.repo-intel/repos/*/docs/ARCHITECTURE.md`
- `/Users/nrandriantsarafara/Works/wbd/.repo-intel/repos/*/docs/RUNBOOK.md`
- `/Users/nrandriantsarafara/Works/wbd/.repo-intel/repos/*/raw/quality_signals.json`
