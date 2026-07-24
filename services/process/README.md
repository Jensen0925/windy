# GRIB2 processing service

This container is the processing boundary between downloaded NWP files and map
raster assets. It uses:

- **ecCodes** to inventory and select GRIB2 messages
- **GDAL** to reproject/crop them and write Cloud Optimized GeoTIFFs (COGs)

The initial scope is deliberately limited to the China regional bounding box
and these display categories:

| Category | Output | Default field |
| --- | --- | --- |
| Wind | `wind_u.tif`, `wind_v.tif` | 10 m U/V components |
| Temperature | `temperature.tif` | 2 m temperature |
| Precipitation | `precipitation.tif` | total precipitation |
| Irradiance | `irradiance.tif` | SSRD (ECMWF) or DSWRF (GFS) |

The default bounding box is `73°E, 3°N, 136°E, 54°N`. It is a rectangular data
cutout, not an administrative-boundary mask. A production administrative mask
must come from a reviewed, legally usable China boundary dataset.

## Important data contract

The input should be a **single forecast step** containing all required fields.
If a downloaded provider file contains only one parameter, concatenate matching
GRIB2 messages for the same model run and valid time before invoking this
processor. Do not combine different valid times into one bundle.

The processor preserves source-native values, units, `stepType`, and
`stepRange`. In particular:

- ECMWF `ssrd` is generally accumulated energy (`J/m²`).
- GFS NOMADS `DSWRF` is generally a flux or interval-average (`W/m²`); ecCodes commonly exposes it as `sdswrf`.
- precipitation may be accumulated and may use model-specific native units.

Correct cross-model normalization requires adjacent forecast steps. That logic
belongs in a later temporal-normalization stage and must not guess from a single
file. `manifest.json` records the source metadata needed by that stage.

## Build

```bash
docker build -t china-weather-process services/process
```

## Inspect a GRIB2 file

```bash
docker run --rm \
  -v "$PWD/data:/data" \
  --entrypoint /opt/weather/bin/inspect-grib.sh \
  china-weather-process \
  /data/input/example.grib2
```

## Process a file

```bash
docker run --rm \
  -v "$PWD/data:/data" \
  china-weather-process \
  --input /data/input/example.grib2 \
  --output /data/output/example \
  --model auto
```

Options:

```text
--model auto|ecmwf|gfs
--bbox WEST,SOUTH,EAST,NORTH
--overwrite
--keep-intermediate
```

The equivalent Compose command is:

```bash
docker compose -f infra/docker-compose.yml --profile tools run --rm processor \
  --input /data/input/example.grib2 \
  --output /data/output/example \
  --model auto
```

## Output layout

```text
output/example/
├── wind_u.tif
├── wind_v.tif
├── temperature.tif
├── precipitation.tif
├── irradiance.tif
└── manifest.json
```

When `--keep-intermediate` is supplied, selected GRIB2 messages are also copied
to `output/example/intermediate/` for debugging.

## Parameter profiles

`config/parameters.json` contains ordered aliases for ECMWF and GFS. The first
matching alias at the required surface/height is selected. If upstream ecCodes
short names differ, inspect the file and add the provider-specific alias without
changing the processing code.
