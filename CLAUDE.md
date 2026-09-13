# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A monorepo for a ports data pipeline and dashboard, originally built as a take-home challenge ("searport" is the internal project/database name; the repo is `seaport-integration`):

- `frontend` — Next.js 15 / React 19 dashboard that reads port data from GraphQL via React Query
- `backend` — NestJS 11 GraphQL API backed by Prisma + PostgreSQL
- `etl` — Node/TypeScript ETL that reads Excel workbooks from Azure Blob Storage and upserts ports into Postgres
- `infra` — AWS CDK v2 stack describing the production deployment shape (VPC, RDS Postgres, Lambda)

## Commands

Run from the repo root unless noted.

```sh
npm run setup          # install deps where package manifests changed, start local Postgres, generate Prisma client
npm run init           # setup, then start frontend+backend+etl together (also copies .env.local.example -> .env.local)
npm run dev            # start frontend+backend+etl concurrently (assumes setup already ran)
npm run build          # build frontend, backend, etl, and infra
npm run test           # run backend + etl test suites
npm run local:db       # start only the local Postgres container
npm run local:db:ui    # start pgweb (http://localhost:8081)
npm run local:down     # stop the local docker compose stack
```

Per-package:

```sh
npm --prefix backend run dev              # nest start --watch (regenerates Prisma client first)
npm --prefix backend run test             # jest — run a single file: npx jest port.service.spec.ts (from backend/)
npm --prefix backend run prisma:generate  # regenerate Prisma client after schema.prisma changes

npm --prefix etl run dev                  # tsx watch src/index.ts (reads etl/.env.local)
npm --prefix etl run test                 # node --test --experimental-strip-types src/**/*.test.ts
                                           # relative imports in *.test.ts files MUST include the .ts extension
                                           # (Node's native type-stripping does not do extension-less resolution)

npm --prefix frontend run dev             # next dev

npm --prefix infra run synth              # cdk synth
```

Before running anything that touches the ETL, `etl/.env.local` needs a real `AZURE_CONTAINER_URL` — the real value is not committed to the repo. `frontend/.env.local`, `backend/.env.local`, and `etl/.env.local` are gitignored and bootstrapped from their `.env.local.example` counterparts by `scripts/init.mjs`; never commit the real `.env.local` files.

## Architecture

**Data flow**: ETL downloads an `.xlsx` workbook from an Azure Blob container → extracts/sanitizes rows → validates them against an Ajv schema → diffs against existing Postgres rows by `locode` and upserts only inserts/changes → NestJS resolves a GraphQL `ports`/`port` query straight off Prisma → the Next.js dashboard fetches that GraphQL endpoint client-side with React Query (5 minute `staleTime`).

**`etl/`** is a plain pipeline of pure-ish stages, each independently unit-tested and composed in `src/lambda/handler.ts` (the actual Lambda entrypoint; `src/index.ts` is a local CLI wrapper around the same handler):
- `extract.ts` — parses the worksheet: builds a case-insensitive header→column map from row 1, then reads each data row through that map. Handles two different coordinate encodings in source workbooks (a plain `latitude`/`longitude` column, or separate `latDegree`/`latMinutes`/`latDirection` columns) and two different locode encodings (a dedicated `unlocCode` column, or a `{CODE}` suffix embedded in the port name). Rows are dropped entirely (return `null`) only when *every* field is empty; otherwise missing/unparseable fields become `""` or `NaN` and are caught downstream by validation.
- `validation.ts` — Ajv schema; rejects empty strings (`minLength: 1`) and non-finite numbers (Ajv's `number` type check requires `isFinite`, so `NaN` coordinates from unparseable rows are correctly rejected here, not upstream).
- `load.ts` — diffs incoming valid rows against what's already in Postgres (by `locode`, comparing a JSON hash of the comparable fields) and only inserts/updates rows that actually changed, inside a single transaction.
- `blob.ts` — thin wrapper over `@azure/storage-blob` (list + download).

**`backend/`** is intentionally thin: `PortResolver` → `PortService` → Prisma, no extra layers. `Port` has a single unique-by-`locode` model (see `backend/prisma/schema.prisma`). GraphQL schema is auto-generated to `backend/src/schema.gql` (`autoSchemaFile` + `sortSchema: true`); don't hand-edit that file. CORS in `main.ts` is hardcoded to `http://localhost:3000`.

**`frontend/`** has no server-side data fetching — `Dashboard` is a client component that creates its own `QueryClient` and calls `fetchPorts()` (`lib/graphql.ts`), a raw `fetch` POST against `NEXT_PUBLIC_GRAPHQL_URL` (no codegen, no GraphQL client library).

**`infra/`** CDK stack (`SearportStack`) provisions a VPC, an RDS Postgres instance with a generated secret, and a Lambda (packaged from `etl/dist`) in the same VPC with a security group rule allowing Lambda → Postgres on 5432. This is deploy-shape reference infrastructure, not wired into any CI/CD in this repo.

**Local dev environment**: `docker-compose.local.yml` runs Postgres 16 and pgweb; `scripts/init.mjs` (driving `npm run setup`/`npm run init`) fingerprints each package's `package.json` to skip reinstalling unchanged workspaces, waits for the Postgres container's healthcheck, then generates the Prisma client. Postgres data lives in `docker/postgres-data/` and pgAdmin state in `docker/pgadmin-data/` — both are gitignored and should never be re-added to tracking.
