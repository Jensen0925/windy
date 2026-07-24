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
apps/api          Forecast and nationwide location search API
apps/ingest       GFS and ECMWF regional ingestion
packages/db       Drizzle schema
packages/locations Nationwide province, prefecture, and county search index
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

## Location search

The location index contains 3,635 province, prefecture, and county-level records (no townships or streets) with Chinese names, pinyin, initials, administrative codes, and WGS84 center points.

```text
GET /api/cities/search?q=beijing&limit=10
GET /api/cities/:id
```

Data provenance and version details are documented in `packages/locations/README.md`.
