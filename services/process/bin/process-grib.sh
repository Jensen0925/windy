#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
service_dir=$(CDPATH= cd -- "$script_dir/.." && pwd)

exec python3 "$service_dir/src/process_grib.py" \
  --config "$service_dir/config/parameters.json" \
  "$@"
