#!/usr/bin/env python3
"""Extract China forecast fields from a single-step GRIB2 bundle.

The pipeline intentionally separates field selection (ecCodes) from spatial
cropping and Cloud Optimized GeoTIFF creation (GDAL). Source-native units and
accumulation semantics are retained and recorded in manifest.json.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from typing import Any

DEFAULT_BBOX = (73.0, 3.0, 136.0, 54.0)
REQUIRED_FIELDS = ("wind_u", "wind_v", "temperature", "precipitation", "irradiance")
INVENTORY_KEYS = (
    "shortName",
    "name",
    "typeOfLevel",
    "level",
    "stepType",
    "stepRange",
    "units",
    "dataDate",
    "dataTime",
    "validityDate",
    "validityTime",
)


class ProcessingError(RuntimeError):
    """A user-actionable processing failure."""


def parse_bbox(value: str) -> tuple[float, float, float, float]:
    try:
        west, south, east, north = (float(part) for part in value.split(","))
    except (TypeError, ValueError) as error:
        raise argparse.ArgumentTypeError(
            "bbox must be WEST,SOUTH,EAST,NORTH, for example 73,3,136,54"
        ) from error

    if not (-180 <= west < east <= 180 and -90 <= south < north <= 90):
        raise argparse.ArgumentTypeError("bbox coordinates or ordering are invalid")
    return west, south, east, north


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Extract 10 m wind, 2 m temperature, precipitation, and solar "
            "irradiance from a GRIB2 bundle and crop them to China."
        )
    )
    parser.add_argument("--input", required=True, type=Path, help="source GRIB2 file")
    parser.add_argument("--output", required=True, type=Path, help="output directory")
    parser.add_argument(
        "--model",
        choices=("auto", "ecmwf", "gfs"),
        default=os.environ.get("PROCESS_MODEL", "auto"),
        help="parameter profile; auto detects ECMWF/GFS from available fields",
    )
    parser.add_argument(
        "--bbox",
        type=parse_bbox,
        default=parse_bbox(os.environ.get("CHINA_BBOX", "73,3,136,54")),
        metavar="WEST,SOUTH,EAST,NORTH",
        help="crop bounds in EPSG:4326 (default: 73,3,136,54)",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "config" / "parameters.json",
        help=argparse.SUPPRESS,
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="replace an existing non-empty output directory",
    )
    parser.add_argument(
        "--keep-intermediate",
        action="store_true",
        help="copy ecCodes-selected GRIB2 fields into output/intermediate",
    )
    return parser


def require_tool(name: str) -> None:
    if shutil.which(name) is None:
        raise ProcessingError(f"required executable is not available: {name}")


def run(command: list[str], *, capture: bool = False) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            command,
            check=True,
            text=True,
            stdout=subprocess.PIPE if capture else None,
            stderr=subprocess.PIPE if capture else None,
        )
    except subprocess.CalledProcessError as error:
        details = (error.stderr or error.stdout or "").strip()
        suffix = f": {details}" if details else ""
        raise ProcessingError(f"command failed ({' '.join(command)}){suffix}") from error


def load_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ProcessingError(f"cannot read JSON configuration {path}: {error}") from error


def inventory(input_path: Path) -> list[dict[str, Any]]:
    keys = ",".join(INVENTORY_KEYS)
    result = run(["grib_ls", "-j", "-p", keys, str(input_path)], capture=True)
    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise ProcessingError(f"ecCodes returned invalid JSON inventory: {error}") from error

    # ecCodes wraps JSON output as {"messages": [...]}. Accept a bare list as
    # well so the parser remains compatible with older tool builds.
    messages = payload.get("messages") if isinstance(payload, dict) else payload
    if not isinstance(messages, list) or not messages:
        raise ProcessingError("input contains no readable GRIB messages")
    return messages


def normalized(value: Any) -> str:
    return str(value).strip().lower()


def detect_model(messages: list[dict[str, Any]]) -> str:
    names = {normalized(message.get("shortName")) for message in messages}
    if "ssrd" in names:
        return "ecmwf"
    if "sdswrf" in names or "dswrf" in names or "apcp" in names:
        return "gfs"
    raise ProcessingError(
        "cannot auto-detect model; pass --model ecmwf or --model gfs explicitly"
    )


def matches(message: dict[str, Any], specification: dict[str, Any]) -> bool:
    aliases = {normalized(alias) for alias in specification["aliases"]}
    if normalized(message.get("shortName")) not in aliases:
        return False

    allowed_level_types = {
        normalized(level_type) for level_type in specification.get("typeOfLevel", [])
    }
    if allowed_level_types and normalized(message.get("typeOfLevel")) not in allowed_level_types:
        return False

    allowed_levels = {float(level) for level in specification.get("levels", [])}
    if allowed_levels:
        try:
            if float(message.get("level")) not in allowed_levels:
                return False
        except (TypeError, ValueError):
            return False
    return True


def select_fields(
    messages: list[dict[str, Any]], profile: dict[str, Any]
) -> dict[str, dict[str, Any]]:
    selected: dict[str, dict[str, Any]] = {}
    for field_name in REQUIRED_FIELDS:
        specification = profile[field_name]
        candidates = [message for message in messages if matches(message, specification)]
        if not candidates:
            aliases = ", ".join(specification["aliases"])
            raise ProcessingError(
                f"missing required field {field_name}; expected one of: {aliases}"
            )

        # Prefer the first alias in configuration to make selection deterministic.
        aliases = [normalized(alias) for alias in specification["aliases"]]
        candidates.sort(key=lambda item: aliases.index(normalized(item["shortName"])))
        selected[field_name] = candidates[0]
    return selected


def selector_for(message: dict[str, Any]) -> str:
    selectors = [f"shortName={message['shortName']}"]
    if message.get("typeOfLevel") not in (None, "unknown"):
        selectors.append(f"typeOfLevel={message['typeOfLevel']}")
    if message.get("level") is not None:
        selectors.append(f"level={message['level']}")
    if message.get("stepRange") not in (None, "unknown"):
        selectors.append(f"stepRange={message['stepRange']}")
    return ",".join(selectors)


def extract_message(input_path: Path, message: dict[str, Any], output_path: Path) -> None:
    run(
        [
            "grib_copy",
            "-w",
            selector_for(message),
            str(input_path),
            str(output_path),
        ]
    )
    if not output_path.exists() or output_path.stat().st_size == 0:
        raise ProcessingError(f"ecCodes produced no data for {message['shortName']}")


def crop_to_cog(
    source_path: Path,
    output_path: Path,
    bbox: tuple[float, float, float, float],
    field_name: str,
) -> dict[str, Any]:
    try:
        from osgeo import gdal  # type: ignore
    except ImportError as error:
        raise ProcessingError("Python GDAL bindings are not installed") from error

    gdal.UseExceptions()
    west, south, east, north = bbox
    resampling = "bilinear" if field_name != "precipitation" else "near"

    with tempfile.TemporaryDirectory(prefix="weather-warp-") as temporary:
        warped_path = Path(temporary) / "cropped.tif"
        source = gdal.Open(str(source_path), gdal.GA_ReadOnly)
        if source is None:
            raise ProcessingError(f"GDAL cannot open extracted field: {source_path}")
        source_band_count = source.RasterCount
        if source_band_count != 1:
            source = None
            raise ProcessingError(
                f"{field_name} selection contains {source_band_count} GRIB messages; "
                "provide exactly one model run and valid time per input bundle"
            )

        warped = gdal.Warp(
            str(warped_path),
            source,
            format="GTiff",
            dstSRS="EPSG:4326",
            outputBounds=(west, south, east, north),
            outputBoundsSRS="EPSG:4326",
            resampleAlg=resampling,
            dstNodata=-9999.0,
            multithread=True,
            creationOptions=["TILED=YES", "COMPRESS=DEFLATE", "BIGTIFF=IF_SAFER"],
        )
        source = None
        if warped is None:
            raise ProcessingError(f"GDAL failed to crop {field_name}")
        width = warped.RasterXSize
        height = warped.RasterYSize
        band_count = warped.RasterCount
        warped = None

        cog = gdal.Translate(
            str(output_path),
            str(warped_path),
            format="COG",
            creationOptions=[
                "COMPRESS=DEFLATE",
                "LEVEL=9",
                "BIGTIFF=IF_SAFER",
                "OVERVIEWS=AUTO",
                "RESAMPLING=AVERAGE",
            ],
        )
        if cog is None:
            raise ProcessingError(f"GDAL failed to create COG for {field_name}")
        cog = None

    return {
        "path": output_path.name,
        "width": width,
        "height": height,
        "bands": band_count,
        "sourceBands": source_band_count,
        "resampling": resampling,
    }


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def prepare_output(path: Path, overwrite: bool) -> None:
    if path.exists() and any(path.iterdir()):
        if not overwrite:
            raise ProcessingError(
                f"output directory is not empty: {path}; pass --overwrite to replace it"
            )
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def main() -> int:
    arguments = build_parser().parse_args()
    input_path = arguments.input.resolve()
    output_path = arguments.output.resolve()

    if not input_path.is_file():
        raise ProcessingError(f"input file does not exist: {input_path}")
    if input_path.stat().st_size == 0:
        raise ProcessingError(f"input file is empty: {input_path}")

    require_tool("grib_ls")
    require_tool("grib_copy")
    prepare_output(output_path, arguments.overwrite)

    configuration = load_json(arguments.config)
    messages = inventory(input_path)
    model = detect_model(messages) if arguments.model == "auto" else arguments.model

    try:
        profile = configuration["profiles"][model]
    except KeyError as error:
        raise ProcessingError(f"no parameter profile configured for model {model}") from error

    selected = select_fields(messages, profile)
    outputs: dict[str, Any] = {}

    with tempfile.TemporaryDirectory(prefix="weather-fields-") as temporary:
        temporary_path = Path(temporary)
        for field_name, message in selected.items():
            grib_path = temporary_path / f"{field_name}.grib2"
            cog_path = output_path / f"{field_name}.tif"
            extract_message(input_path, message, grib_path)
            raster_metadata = crop_to_cog(grib_path, cog_path, arguments.bbox, field_name)

            if arguments.keep_intermediate:
                intermediate = output_path / "intermediate"
                intermediate.mkdir(exist_ok=True)
                shutil.copy2(grib_path, intermediate / grib_path.name)

            outputs[field_name] = {
                "category": profile[field_name]["category"],
                "source": {
                    key: message.get(key)
                    for key in INVENTORY_KEYS
                    if message.get(key) is not None
                },
                "raster": raster_metadata,
            }

    manifest = {
        "schemaVersion": 1,
        "model": model,
        "input": {
            "fileName": input_path.name,
            "sizeBytes": input_path.stat().st_size,
            "sha256": sha256(input_path),
        },
        "coverage": {
            "crs": "EPSG:4326",
            "bbox": {
                "west": arguments.bbox[0],
                "south": arguments.bbox[1],
                "east": arguments.bbox[2],
                "north": arguments.bbox[3],
            },
            "scope": "China regional bounding box",
        },
        "unitPolicy": (
            "Source-native units and step semantics are preserved. Normalize accumulated "
            "precipitation and irradiance only when adjacent forecast steps are available."
        ),
        "outputs": outputs,
    }
    (output_path / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(f"processed {len(outputs)} fields for {model} into {output_path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ProcessingError as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1) from error
