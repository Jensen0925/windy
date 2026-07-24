#!/bin/sh
set -eu

alias_name="weather"
bucket="${MINIO_BUCKET:-weather-data}"

mc alias set "$alias_name" \
  "${MINIO_ENDPOINT:-http://minio:9000}" \
  "${MINIO_ROOT_USER:?MINIO_ROOT_USER is required}" \
  "${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD is required}"

mc mb --ignore-existing "$alias_name/$bucket"
mc anonymous set none "$alias_name/$bucket"

# Object stores do not require directories. These zero-byte marker objects make
# the intended pipeline layout visible in development consoles.
for prefix in raw processed manifests; do
  printf '' | mc pipe "$alias_name/$bucket/$prefix/.keep"
done

printf 'MinIO bucket ready: %s/%s\n' "$alias_name" "$bucket"
