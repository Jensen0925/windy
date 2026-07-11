# China Weather Visualization MVP Design

Date: 2026-07-11
Status: Ready for user review

## Goal

Build a Windy.com-like weather visualization web application focused on China. The first phase should deliver a usable full-stack MVP with a polished map-first UI, four weather layers, a timeline, legends, and deployment scaffolding. Real weather data ingestion will happen in a later phase; this phase uses replaceable mock grid data behind production-shaped API contracts.

## Scope

The first phase includes:

- A Turborepo monorepo using Bun Workspaces.
- A Next.js web app.
- A Nest.js API service.
- Shared TypeScript types for API contracts.
- Drizzle ORM schema and database package.
- PostgreSQL 16 and Redis 7 in Docker Compose.
- A MapLibre GL JS map centered on China.
- Four weather layers: temperature, wind, solar irradiance, and rainfall.
- A Windy-like bottom timeline, layer legend, map tools, and right-side layer panel.
- Mock weather grid generation through the API.

The first phase does not include real ECMWF, GFS, ICON, NAM, HRRR, AROME, radar, satellite, ocean, air quality, typhoon, lightning, or observation data ingestion.

## Architecture

The monorepo will be organized as:

- `apps/web`: Next.js frontend. It owns the map UI, controls, layer state, timeline state, API fetching, and visual rendering of weather grids.
- `apps/api`: Nest.js backend. It owns layer metadata, forecast time endpoints, mock grid generation, city search, health checks, and cache boundaries.
- `packages/shared`: Shared TypeScript types and validation schemas for weather layers, forecast times, grid responses, and errors.
- `packages/db`: Drizzle schema, database connection helpers, and migration configuration.
- `infra/docker-compose.yml`: Local services for PostgreSQL 16, Redis 7, API, and Web.

Primary request flow:

```text
Next.js UI -> Nest.js API -> mock grid adapter/cache boundary -> MapLibre + Canvas/WebGL overlay
```

The API will expose the same data shape expected from future real model adapters. Later data ingestion work should replace the mock adapter without changing frontend rendering contracts.

## Frontend Experience

The first screen is the application itself: a full-screen map, not a landing page. The default view is China and nearby seas.

Layout:

- Top left: search box. The first phase supports built-in city search for major Chinese cities such as Beijing, Shanghai, Guangzhou, Chengdu, and Urumqi.
- Top center: product brand text, initially `Wind China` unless renamed later.
- Right side: Windy-style circular quick layer buttons. Clicking opens a dark layer panel with only four options: temperature, wind, solar irradiance, and rainfall.
- Bottom: Windy-like forecast timeline with play button, current time bubble, and future time steps.
- Bottom right: active layer legend and map tools. Tools include zoom controls, reset to China, fit view/fullscreen-style control, and wind particle toggle.
- Map body: MapLibre base map with province/city context, weather color overlay, and wind particles when the wind layer is active.

Visual style:

- Use dark translucent controls over the map.
- Keep panel radius restrained and avoid nested card layouts.
- Use weather-appropriate palettes:
  - Temperature: blue to yellow to red.
  - Wind speed: green to purple.
  - Rainfall: blue to cyan.
  - Solar irradiance: yellow to orange.
- Keep the right panel much smaller than Windy.com by limiting it to the four required layers.

## API Design

Endpoints:

- `GET /health`: health check.
- `GET /layers`: returns metadata for the four layers, including id, display name, unit, color scale, default range, and particle support.
- `GET /forecast/times`: returns forecast time steps every 3 hours for the next 72 hours.
- `GET /forecast/grid?layer=temperature&time=...&bbox=...&resolution=...`: returns a grid response for the selected layer, time, bounds, and resolution.
- `GET /cities/search?q=...`: returns built-in city matches for the search UI.

Grid response shape:

- `bounds`: geographic bounds.
- `width` and `height`: grid dimensions.
- `values`: scalar values for temperature, rainfall, and solar irradiance.
- `uValues` and `vValues`: wind vector components for the wind layer.
- `unit`: display unit.
- `min` and `max`: data range for legends and debugging.
- `generatedAt`: response generation timestamp.
- `source`: `mock` in the first phase.

The mock grid generator acts like a real adapter:

```text
input: layer, time, bbox, resolution
output: GridResponse
```

This keeps later GRIB, NetCDF, or tile-based adapters isolated from the frontend.

## Database Design

The first phase defines the future ingestion schema but does not require real weather data to be stored before the UI works.

Initial tables:

- `weather_models`: model sources such as mock, GFS, or ECMWF.
- `forecast_runs`: one model forecast run.
- `forecast_layers`: supported layer definitions.
- `forecast_grids`: grid metadata and object/file references, not large arrays directly embedded in relational rows.
- `ingest_jobs`: future ingestion job state.

The API can generate mock data directly. The database package exists so the real ingestion phase has an agreed destination and migration path.

## Caching

Redis cache keys are based on:

```text
layer + time + bbox + resolution
```

Behavior:

- If Redis is available, cache generated mock grid responses.
- If Redis is unavailable, generate mock grid responses directly and keep the API usable.
- Include `generatedAt` and `source: mock` in API responses for debugging.

## Error Handling

API errors are structured and predictable:

- Unsupported layer id returns a validation error.
- Invalid time format returns a validation error.
- Invalid or out-of-range bbox returns a validation error.
- Unsupported resolution returns a validation error.

Frontend behavior:

- The map must not blank out when a layer request fails.
- The active layer panel should show a retryable error state.
- Missing forecast times should appear disabled in the timeline.
- If wind particles fail, the UI falls back to a wind-speed color overlay.

## Testing

Expected coverage:

- `packages/shared`: type/schema validation tests.
- `apps/api`: endpoint tests for layers, forecast times, grid parameter validation, and mock grid dimensions.
- `apps/web`: component/state tests for layer switching, timeline selection, and legend updates.
- E2E: start web and API, then verify the home page, map container, layer switching, and timeline interaction.
- Visual verification: inspect desktop and mobile widths to ensure the bottom timeline, right panel, map tools, and map layers do not overlap incoherently.

## Out Of Scope For Phase 1

- Real weather data ingestion from ECMWF, GFS, ICON, NAM, HRRR, AROME, WW3, Copernicus, radar, satellite, METAR, CAMS, AQICN, JTWC, NHC, JMA, Blitzortung, or NOAA SPC.
- User accounts, login, favorites, alerts, sharing, or plugins.
- Full admin dashboard.
- Real forecast scheduling.
- GRIB or NetCDF parsing.
- Ocean, tide, wave, radar, satellite, air quality, typhoon, lightning, or severe weather layers.

## Later Phases

Recommended next steps after the MVP:

1. Choose one legally accessible public data source.
2. Add an ingestion worker and object/file storage references.
3. Replace the mock adapter with a real model adapter.
4. Add model switching and forecast run selection.
5. Expand layer coverage only after the core map and data pipeline are stable.

## Acceptance Criteria

The phase 1 implementation is complete when:

- `bun install` can install the monorepo dependencies.
- The web app and API can run locally.
- Docker Compose can start PostgreSQL 16 and Redis 7.
- The web app opens to a China-centered full-screen map.
- The user can switch between temperature, wind, solar irradiance, and rainfall.
- The bottom timeline can select forecast times and trigger data refreshes.
- The active legend changes with the selected layer.
- Wind mode shows animated particles or a graceful fallback.
- API endpoints return documented response shapes.
- Tests cover the core API contracts and UI state transitions.
