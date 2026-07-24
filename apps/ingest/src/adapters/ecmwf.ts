import { CHINA_BOUNDS } from "@china-weather/weather";
import type { DownloadPlan, ForecastAdapter, IngestionRequest } from "./types";
import { assertSupportedForecastHour, assertValidRequest } from "./validation";

const ECMWF_PARAMETERS = ["10u", "10v", "100u", "100v", "2t", "tp", "ssrd"] as const;
const DEFAULT_ECMWF_DATASET_URL = "https://data.ecmwf.int/forecasts";

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function formatCycle(date: Date): string {
  return date.getUTCHours().toString().padStart(2, "0");
}

export interface EcmwfAdapterOptions {
  baseUrl?: string;
}

export class EcmwfAdapter implements ForecastAdapter {
  readonly model = "ecmwf" as const;
  readonly #baseUrl: string;

  constructor(options: EcmwfAdapterOptions = {}) {
    this.#baseUrl =
      options.baseUrl?.trim() || process.env.ECMWF_DATASET_URL?.trim() || DEFAULT_ECMWF_DATASET_URL;
  }

  buildPlan(request: IngestionRequest): DownloadPlan {
    assertValidRequest(request, this.model);
    assertSupportedForecastHour(this.model, request.forecastHour);

    const date = formatDate(request.referenceTime);
    const cycle = formatCycle(request.referenceTime);
    const step = request.forecastHour;
    const directoryUrl = `${this.#baseUrl.replace(/\/$/, "")}/${date}/${cycle}z/ifs/0p25/oper`;
    const fileStem = `${date}${cycle}0000-${step}h-oper-fc`;

    return {
      model: this.model,
      referenceTime: request.referenceTime.toISOString(),
      forecastHour: step,
      method: "GET",
      url: `${directoryUrl}/${fileStem}.grib2`,
      targetPath: `${request.targetDirectory}/ecmwf/${date}/${cycle}/f${step
        .toString()
        .padStart(3, "0")}.grib2`,
      selection: {
        type: "ecmwf-json-lines-index",
        indexUrl: `${directoryUrl}/${fileStem}.index`,
        parameters: ECMWF_PARAMETERS,
        levelType: "sfc",
      },
      spatialSubset: {
        bounds: CHINA_BOUNDS,
        mode: "post-download-crop",
      },
      metadata: {
        region: "china",
        resolutionDegrees: 0.25,
        parameters: ECMWF_PARAMETERS,
        sourceGrid: "global",
      },
    };
  }
}
