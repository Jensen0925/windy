import { CHINA_BOUNDS } from "@china-weather/weather";
import type { DownloadPlan, ForecastAdapter, IngestionRequest } from "./types";
import { assertSupportedForecastHour, assertValidRequest } from "./validation";

const GFS_PARAMETERS = ["10u", "10v", "100u", "100v", "2t", "tp", "dswrf"] as const;
const DEFAULT_GFS_FILTER_URL = "https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl";

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function formatCycle(date: Date): string {
  return date.getUTCHours().toString().padStart(2, "0");
}

export interface GfsAdapterOptions {
  baseUrl?: string;
}

export class GfsAdapter implements ForecastAdapter {
  readonly model = "gfs" as const;
  readonly #baseUrl: string;

  constructor(options: GfsAdapterOptions = {}) {
    this.#baseUrl =
      options.baseUrl?.trim() || process.env.GFS_FILTER_URL?.trim() || DEFAULT_GFS_FILTER_URL;
  }

  buildPlan(request: IngestionRequest): DownloadPlan {
    assertValidRequest(request, this.model);
    assertSupportedForecastHour(this.model, request.forecastHour);

    const date = formatDate(request.referenceTime);
    const cycle = formatCycle(request.referenceTime);
    const forecastHour = request.forecastHour.toString().padStart(3, "0");
    const params = new URLSearchParams({
      file: `gfs.t${cycle}z.pgrb2.0p25.f${forecastHour}`,
      lev_2_m_above_ground: "on",
      lev_10_m_above_ground: "on",
      lev_100_m_above_ground: "on",
      lev_surface: "on",
      var_TMP: "on",
      var_UGRD: "on",
      var_VGRD: "on",
      var_APCP: "on",
      var_DSWRF: "on",
      subregion: "",
      toplat: String(CHINA_BOUNDS.north),
      leftlon: String(CHINA_BOUNDS.west),
      rightlon: String(CHINA_BOUNDS.east),
      bottomlat: String(CHINA_BOUNDS.south),
      dir: `/gfs.${date}/${cycle}/atmos`,
    });

    return {
      model: this.model,
      referenceTime: request.referenceTime.toISOString(),
      forecastHour: request.forecastHour,
      method: "GET",
      url: `${this.#baseUrl}?${params.toString()}`,
      targetPath: `${request.targetDirectory}/gfs/${date}/${cycle}/f${forecastHour}.grib2`,
      spatialSubset: {
        bounds: CHINA_BOUNDS,
        mode: "remote-filter",
      },
      metadata: {
        region: "china",
        resolutionDegrees: 0.25,
        parameters: GFS_PARAMETERS,
        sourceGrid: "china-subregion",
      },
    };
  }
}
