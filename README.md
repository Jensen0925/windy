# China Weather Platform

A China-focused weather forecast platform for wind, temperature, precipitation, and solar irradiance.

## Stack

- Bun workspaces and Turborepo
- Next.js web application
- NestJS API
- Drizzle ORM with PostgreSQL/PostGIS
- Bun ingestion workers
- ecCodes/GDAL processing container
- Redis/Valkey and MinIO
- Docker Compose for local infrastructure

## Workspace

```text
apps/web          China weather map UI
apps/api          Forecast metadata and point-query API
apps/ingest       GFS and ECMWF regional ingestion
packages/db       Drizzle schema
packages/weather  Shared weather model and unit definitions
packages/ui       Shared UI primitives
services/process  GRIB2 processing tools
infra             Local infrastructure
```

## Development

```bash
cp .env.example .env
bun install
bun run compose:up
bun run dev
```

The application only targets China and only processes wind, temperature, precipitation, and surface solar irradiance.
