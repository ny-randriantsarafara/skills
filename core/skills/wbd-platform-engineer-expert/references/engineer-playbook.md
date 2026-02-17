# WBD Engineer Playbook

## Baseline Checks by Repository

Run the smallest useful check first, then run full baseline for touched areas.

| Repository | Fast Local Loop | Baseline Validation |
| --- | --- | --- |
| `customer-support-monorepo` | `lerna run test --parallel --scope <service-or-package>` | `lerna run build --include-dependencies --scope <target>` + `lerna run lint --parallel --scope <target>` |
| `eurosport-taxonomy` | `yarn test:unit:api` or nearest unit/e2e target | `yarn build` + `yarn lint` |
| `eurosport-uri` | `yarn test` on affected domain modules | `yarn build` + `yarn lint` + `yarn test` |
| `graphql-api` | `yarn test <pattern>` or focused suite + `yarn lint` | `yarn test` + `yarn lint` + `yarn build` |
| `infinity-cms-2` | `pnpm --dir backend <targeted-test>` or `pnpm --dir frontend <targeted-test>` | project-specific backend/frontend checks + impacted lambda tests |
| `netsport-export-service` | `yarn test:unit` for touched package | `yarn test:unit` + `yarn test:functional` |

## Suggested Investigation Paths

- Routing/API behavior:
  - `eurosport-taxonomy/api/src/routes/`
  - `graphql-api/src/resolvers/` and `graphql-api/src/typeDefs/`
  - `infinity-cms-2/backend/src/shared/adapters/graphql/`
- URL/canonicalization:
  - `eurosport-uri/src/services/`
  - `eurosport-uri/src/page-type/`
- Editorial/content workflows:
  - `infinity-cms-2/backend/src/content/`
  - `infinity-cms-2/backend/src/planner/`
  - `infinity-cms-2/frontend/`
- Export/partner ingestion:
  - `netsport-export-service/packages/`
- Customer support workflows:
  - `customer-support-monorepo/services/`
  - `customer-support-monorepo/packages/`

## High-Risk Files (Large Surface)

Use extra caution and targeted tests when modifying these files.

| Repository | File | Size |
| --- | --- | --- |
| `customer-support-monorepo` | `services/rap/issues/test/application/usecases/add-video-information.test.ts` | 569 lines |
| `eurosport-taxonomy` | `api/src/jest/fixtures/events.ts` | 1171 lines |
| `eurosport-uri` | `src/services/uri-to-metadata/__tests__/uri-to-metadata.test.ts` | 5618 lines |
| `graphql-api` | `src/constants/alerts.js` | 34438 lines |
| `infinity-cms-2` | `playwright/utils/seed/get-match-by-event.ts` | 8379 lines |
| `netsport-export-service` | `packages/netsport-export-infinity/src/__tests__/index.test.js` | 1426 lines |

## Cross-Repo Change Checklist

1. Confirm contract owner repository.
2. Update consumer and provider in the same change window when possible.
3. Validate env var names and defaults on both sides.
4. Add regression tests at contract boundary.
5. Document rollout order and rollback point.

## Incident / Hotfix Checklist

1. Reproduce with the smallest command and fixture.
2. Capture impacted repositories and contract edges.
3. Implement minimal fix in owning layer.
4. Run targeted tests first, then baseline checks.
5. Provide short postmortem notes with residual risk.
