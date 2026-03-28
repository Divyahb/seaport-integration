# searport

Monorepo for a ports data pipeline and dashboard:

- `frontend`: Next.js dashboard that reads port data from GraphQL
- `backend`: NestJS GraphQL API backed by Prisma and PostgreSQL
- `etl`: Node-based ETL that reads Excel workbooks and upserts ports into Postgres
- `infra`: AWS CDK stack for the ETL/database deployment shape

## Stack

### Frontend

- Next.js 15
- React 19
- `@tanstack/react-query`
- Tailwind CSS
- `clsx`
- `tailwind-merge`

### Backend

- NestJS 11
- GraphQL / Apollo
- Prisma
- PostgreSQL
- Jest

### ETL

- Node.js + TypeScript
- `exceljs`
- `ajv`
- `pg`
- `dotenv`
- `@azure/storage-blob`

### Infrastructure

- AWS CDK v2
- RDS PostgreSQL
- AWS Lambda
- VPC / Security Groups

## Prerequisites

- Node.js 20+ and npm
- Docker Desktop or Docker Engine
- Docker Compose support (`docker compose`)

Node.js is required to install dependencies and run the frontend, backend, ETL, and infrastructure tooling.
Docker is required for the local PostgreSQL and pgWeb services used by `npm run setup` and `npm run init`.

## Local services

- GraphQL API: `http://localhost:3001/graphql`
- pgWeb: `http://localhost:8081`
- PostgreSQL: `localhost:5432`

## Environment files

The bootstrap script copies these files automatically if they do not exist:

- `frontend/.env.local.example` -> `frontend/.env.local`
- `backend/.env.local.example` -> `backend/.env.local`
- `etl/.env.local.example` -> `etl/.env.local`

Current examples:

- `frontend/.env.local`
  - `NEXT_PUBLIC_GRAPHQL_URL=http://localhost:3001/graphql`
- `backend/.env.local`
  - `PORT=3001`
  - `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/searport?schema=public`
- `etl/.env.local`
  - `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/searport?schema=public`
  - `AZURE_CONTAINER_URL=...` at runtime is what the ETL uses

## Commands

### Root

```sh
npm run init
```

Runs setup, then starts frontend, backend, and ETL together.

Before running this command, update `etl/.env.local` and set `AZURE_CONTAINER_URL` to the value provided in the challenge document. The real container URL has not been pushed to the repository for security reasons.


```sh
npm run setup
```

Installs dependencies when package manifests changed, starts local Postgres, and generates the Prisma client.

```sh
npm run dev
```

Starts all apps concurrently.

```sh
npm run build
```

Builds frontend, backend, ETL, and infra.

```sh
npm run test
```

Runs backend and ETL tests.

```sh
npm run local:db
```

Starts only the local PostgreSQL container.

```sh
npm run local:db:ui
```

Starts pgWeb for the local database.

```sh
npm run local:db:all
```

Starts PostgreSQL and pgWeb together.

```sh
npm run local:start
```

Starts local Postgres, then starts all apps.

```sh
npm run local:down
```

Stops the local Docker Compose stack.

### Frontend

```sh
npm --prefix frontend run dev
npm --prefix frontend run build
npm --prefix frontend run start
```

### Backend

```sh
npm --prefix backend run dev
npm --prefix backend run debug
npm --prefix backend run build
npm --prefix backend run start
npm --prefix backend run test
npm --prefix backend run prisma:generate
```

### ETL

```sh
npm --prefix etl run dev
npm --prefix etl run debug
npm --prefix etl run build
npm --prefix etl run test
```

### Infra

```sh
npm --prefix infra run build
npm --prefix infra run synth
```

## Local workflow

1. Run `npm run setup`
2. Update `etl/.env.local` with the `AZURE_CONTAINER_URL` from the challenge document. The real URL is intentionally not committed to this repository for security.
3. Run `npm run init` for the full stack, or start only the app you want
4. Open the dashboard in the frontend app
5. Inspect database records in pgWeb if needed

If one process crashes during `npm run init` or `npm run dev`, the other processes continue running.

## Data flow

1. ETL reads an Excel workbook
2. ETL sanitizes and extracts port rows
3. ETL validates extracted rows
4. ETL upserts rows into PostgreSQL
5. NestJS exposes port data through GraphQL
6. Next.js dashboard fetches data from GraphQL using React Query with a 5 minute `staleTime`

## Folder structure

```text
.
|-- backend
|   |-- prisma
|   |   `-- schema.prisma
|   |-- src
|   |   |-- ports
|   |   |   |-- port.model.ts
|   |   |   |-- port.resolver.spec.ts
|   |   |   |-- port.resolver.ts
|   |   |   |-- port.service.spec.ts
|   |   |   `-- port.service.ts
|   |   |-- prisma
|   |   |   `-- prisma.service.ts
|   |   |-- app.module.ts
|   |   |-- main.ts
|   |   `-- schema.gql
|   `-- .env.local.example
|-- docker
|   `-- postgres-data
|-- etl
|   |-- src
|   |   |-- lambda
|   |   |   `-- handler.ts
|   |   |-- blob.ts
|   |   |-- config.ts
|   |   |-- extract.test.ts
|   |   |-- extract.ts
|   |   |-- index.ts
|   |   |-- load.ts
|   |   |-- types.ts
|   |   |-- validation.test.ts
|   |   `-- validation.ts
|   `-- .env.local.example
|-- frontend
|   |-- app
|   |   |-- dashboard
|   |   |   `-- page.tsx
|   |   |-- globals.css
|   |   |-- layout.tsx
|   |   `-- page.tsx
|   |-- components
|   |   |-- ui
|   |   |   |-- card.tsx
|   |   |   `-- table.tsx
|   |   `-- dashboard.tsx
|   |-- lib
|   |   |-- graphql.ts
|   |   `-- utils.ts
|   `-- .env.local.example
|-- infra
|   |-- bin
|   |   `-- app.ts
|   |-- lib
|   |   `-- searport-stack.ts
|   `-- cdk.json
|-- scripts
|   `-- init.mjs
|-- docker-compose.local.yml
|-- init.sh
|-- package.json
`-- README.md
```

## Notes

- Local database services are defined in [docker-compose.local.yml](c:/Users/divya/development/sample/tilla/docker-compose.local.yml).
- The backend Prisma schema is in [backend/prisma/schema.prisma](c:/Users/divya/development/sample/tilla/backend/prisma/schema.prisma).
- The dashboard data fetcher is in [frontend/lib/graphql.ts](c:/Users/divya/development/sample/tilla/frontend/lib/graphql.ts).
- The ETL entrypoint is [etl/src/index.ts](c:/Users/divya/development/sample/tilla/etl/src/index.ts), and the Lambda handler is [etl/src/lambda/handler.ts](c:/Users/divya/development/sample/tilla/etl/src/lambda/handler.ts).

## Questions

### What are some edge cases to handle before shipping to production?

- Add a dedicated normalization layer and tenant-specific staging tables before converting records into one canonical schema.
- Handle partial ingestion so one failed chunk does not invalidate a full file sync.
- Process large files in chunks rather than loading everything into memory at once.
- Improve malformed-record handling with rejection logs, replay support, and better validation.
- Add stronger validation for `locode`, coordinates, timezone values, and ISO country codes.
- Add safer delete workflows with auditability before removing records from the canonical table.

### How would this scale for high traffic?

- Use caching at multiple layers: browser caching, React Query caching, and pagination.
- Add Redis for API-side caching.
- Apply rate limiting at the API layer.
- Use Postgres read replicas for read-heavy traffic.
- Scale backend instances horizontally behind a load balancer.
- Keep ETL on Lambda so ingestion can scale independently.
- Separate ingestion load from dashboard read traffic.

### What is important to work well in a fully remote team?

- Collaboration, trust, and strong async culture matter most.
- Clear written communication reduces dependency on meetings.
- Good documentation helps teammates continue work across time zones.
- Early visibility into blockers and decisions builds reliability.
- Respectful code review and clear handoffs make remote teams move faster.
