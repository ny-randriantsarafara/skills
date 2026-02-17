# Framework Detection Rules

Backend signals:
- `express`, `fastify`, `@nestjs/core`, `koa`, `hono`

Frontend signals:
- `next`, `react`, `vite`, `nuxt`, `svelte`

Data signals:
- `prisma`, `typeorm`, `sequelize`, `mongoose`, `knex`

Queue/async signals:
- `bullmq`, `agenda`, `kafkajs`, `amqplib`, `@aws-sdk/client-sqs`

Infra/deploy signals:
- `Dockerfile`, `docker-compose*`, `.github/workflows/*`, `gitlab-ci.yml`,
  `terraform/`, `infra/`, `helm/`, `k8s/`

Repo type heuristics:
- `monorepo`: has workspaces (`package.json` workspaces)
- `frontend`: Next/React/Vite plus pages/app/src UI routes
- `service`: backend framework and HTTP/queue entrypoints
- `worker`: queue/cron heavy and no strong HTTP surface
- `library`: package with exports/types but no service scripts
- `infra`: mostly infra manifests and little app code
- `data`: migration/model heavy repo focused on schema movement
