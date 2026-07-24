# Local infrastructure

Docker Compose provides the single-machine development dependencies for the
China weather MVP:

- PostgreSQL 16 with PostGIS
- Valkey with AOF persistence
- MinIO object storage
- a one-shot MinIO bucket initializer
- an optional GRIB2 processor tool container

## Start the data services

```bash
cp infra/.env.example infra/.env
docker compose --env-file infra/.env -f infra/docker-compose.yml up -d
```

Check health and initialization:

```bash
docker compose --env-file infra/.env -f infra/docker-compose.yml ps
docker compose --env-file infra/.env -f infra/docker-compose.yml logs minio-init
```

Default local endpoints:

| Service | Endpoint |
| --- | --- |
| PostgreSQL | `postgresql://weather:weather@localhost:5432/weather` |
| Valkey | `redis://localhost:6379` |
| MinIO S3 API | `http://localhost:9000` |
| MinIO console | `http://localhost:9001` |

Change all default passwords before exposing any service outside a developer
machine. The initialized bucket defaults to `weather-data` and contains the
logical prefixes `raw/`, `processed/`, and `manifests/`.

## Run the optional processor container

Place a GRIB2 file below `infra/data`, then run:

```bash
docker compose --env-file infra/.env -f infra/docker-compose.yml \
  --profile tools run --rm processor \
  --input /data/input/example.grib2 \
  --output /data/output/example \
  --model auto
```

The processor image and command are documented in
`services/process/README.md`.

## Stop services

```bash
docker compose --env-file infra/.env -f infra/docker-compose.yml down
```

Add `--volumes` only when local database, queue, and object data should be
destroyed as well.
