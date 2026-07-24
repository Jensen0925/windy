import type { ForecastModel } from "@china-weather/weather";

export interface IngestionRequest {
  model: ForecastModel;
  referenceTime: Date;
  forecastHour: number;
  targetDirectory: string;
}

export interface GeographicBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface IndexedParameterSelection {
  type: "ecmwf-json-lines-index";
  indexUrl: string;
  parameters: readonly string[];
  levelType: "sfc";
}

export interface SpatialSubset {
  bounds: GeographicBounds;
  mode: "remote-filter" | "post-download-crop";
}

export interface DownloadPlan {
  model: ForecastModel;
  referenceTime: string;
  forecastHour: number;
  url: string;
  targetPath: string;
  method: "GET";
  headers?: Record<string, string>;
  selection?: IndexedParameterSelection;
  spatialSubset: SpatialSubset;
  metadata: {
    region: "china";
    resolutionDegrees: number;
    parameters: readonly string[];
    sourceGrid: "china-subregion" | "global";
  };
}

export interface ForecastAdapter {
  readonly model: ForecastModel;
  buildPlan(request: IngestionRequest): DownloadPlan;
}
