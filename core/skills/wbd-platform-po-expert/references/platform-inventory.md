# WBD Platform Inventory (PO View)

Source snapshot: `/Users/nrandriantsarafara/Works/wbd/.repo-intel`  
Snapshot id: `nogit-2026-02-17T13-19-44-366Z`  
Generated: 2026-02-17

## Repository Map

| Repository | Product Capability | Key Interfaces | Delivery Commands | Risk Signals |
| --- | --- | --- | --- | --- |
| `customer-support-monorepo` | Customer support tooling and workflows (flag issue, voucher/program support, Salesforce/Zendesk related flows) | 2 Kafka consumers detected; services: `admin`, `common`, `cs-tools`, `dsrr`, `fcca`, `program`, `rap`, `voucher` | `lerna run build --include-dependencies --scope <target>`; `lerna run test --parallel --scope <target>`; `lerna run lint --parallel --scope <target>` | 10 import cycles; large logging/metrics surface |
| `eurosport-taxonomy` | Taxonomy APIs, taxonomy search, admin taxonomy updates, sync scripts/lambdas | 9 Fastify routes including `GET /:taxonomyType/search/:name`, `POST /taxonomy`, `PUT /taxonomy` | `NODE_ENV=development yarn dev`; `yarn build`; `yarn lint`; `yarn test:unit` | TypeScript strict disabled; 4 import cycles |
| `eurosport-uri` | URL parsing and canonical URL generation for Eurosport content pages | Product endpoints from README: `/context`, `/generate`; integration envs for InArena, Infinity CMS, Netsport, Taxonomy | `yarn dev`; `yarn build`; `yarn test`; `yarn lint` | 5 import cycles; high test volume |
| `graphql-api` | Main GraphQL aggregation layer for Netsport/Inflow/Tracking/InArena/Video/Picture/Motif | Health route `GET /.well-known/apollo/server-health`; 2 Kafka `news` consumers; heavy downstream API fanout | `yarn watch`; `yarn test`; `yarn cucumber`; `yarn lint`; `yarn build` | TypeScript strict disabled; 78 env vars; high operational complexity |
| `infinity-cms-2` | Infinity CMS platform (backend + frontend + lambdas) for editorial/content workflows | 58 detected routes, 39 frontend pages; modules: `content`, `planner`, `search`, `seo`, `taxonomy`, `user` | `make`; `make start`; `make migrate-and-start`; `pnpm --dir backend ...`; `pnpm --dir frontend dev` | TypeScript strict disabled; 74 import cycles; 91 env vars |
| `netsport-export-service` | Partner export and ingestion pipelines (Dailymotion, Freewheel, Infinity, Motif, Video, Search) | No HTTP routes detected; package jobs under `packages/`; ingest and batch export scripts | `yarn test:unit`; `yarn test:functional`; `yarn deploy`; job scripts (`ingest-*`, `motif:*`) | TypeScript strict disabled; staging note: consumes production topic |

## Cross-Repository Dependency Cues

- `eurosport-uri`, `graphql-api`, and `infinity-cms-2` share integration seams around `INARENA_API_BASE_URL`, `INFINITY_CMS_API_BASE_URL`, and `TAXONOMY_API_BASE_URL`.
- `graphql-api` references `URI_API_URL`, implying URI service coupling for canonical URL/use-case features.
- `infinity-cms-2` and `eurosport-uri` both reference Netsport endpoints (`NETSPORT_API_URL` style env names).
- `netsport-export-service` uses `GRAPHQL_API`, so GraphQL schema/output changes can affect partner exports.

Treat these as dependency hypotheses based on env contract names and validate in source before final roadmap commitments.

## PO Planning Heuristics

- Prefer slices that keep one repository as the leading delivery unit.
- For multi-repo scope, define explicit contract milestones before UI/business rollout.
- For `infinity-cms-2` and `graphql-api`, reserve extra stabilization time for env/config and regression surface.
- For `netsport-export-service`, validate queue/topic and partner-side effects before production release windows.

## Evidence Paths

- `/Users/nrandriantsarafara/Works/wbd/.repo-intel/inventory.md`
- `/Users/nrandriantsarafara/Works/wbd/.repo-intel/repos/*/docs/HANDOVER.md`
- `/Users/nrandriantsarafara/Works/wbd/.repo-intel/repos/*/docs/RUNBOOK.md`
- `/Users/nrandriantsarafara/Works/wbd/.repo-intel/repos/*/docs/api_surface.md`
