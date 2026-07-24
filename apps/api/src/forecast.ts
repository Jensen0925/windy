import {
  buildForecastSteps,
  CHINA_BOUNDS,
  createDemoWeatherPoint,
  type ForecastModel,
  isInsideChinaBounds,
  LAYERS,
  MODEL_NAMES,
} from "@china-weather/weather";

const FORECAST_MODELS = ["ecmwf", "gfs"] as const satisfies readonly ForecastModel[];

export class ForecastQueryError extends Error {}

export interface PointQueryInput {
  longitude?: string;
  latitude?: string;
  validTime?: string;
  model?: string;
}

function parseCoordinate(value: string | undefined, name: "lon" | "lat"): number {
  if (value === undefined || value.trim() === "") {
    throw new ForecastQueryError(`${name} must be a valid number`);
  }

  const coordinate = Number(value);
  if (!Number.isFinite(coordinate)) {
    throw new ForecastQueryError(`${name} must be a valid number`);
  }
  return coordinate;
}

function parseModel(value: string | undefined): ForecastModel {
  if (value === undefined || value === "") {
    return "gfs";
  }
  if (value === "gfs" || value === "ecmwf") {
    return value;
  }
  throw new ForecastQueryError("model must be either gfs or ecmwf");
}

function parseValidTime(value: string | undefined, now: Date): string {
  const time = value === undefined || value === "" ? now : new Date(value);
  if (Number.isNaN(time.getTime())) {
    throw new ForecastQueryError("time must be a valid ISO timestamp");
  }
  return time.toISOString();
}

export function createForecastCatalog(now = new Date()) {
  if (Number.isNaN(now.getTime())) {
    throw new Error("now must be a valid date");
  }

  return {
    bounds: CHINA_BOUNDS,
    layers: Object.values(LAYERS),
    models: FORECAST_MODELS.map((id) => ({ id, name: MODEL_NAMES[id] })),
    steps: buildForecastSteps(now),
    mode: "demo" as const,
  };
}

export function createPointForecast(input: PointQueryInput, now = new Date()) {
  const longitude = parseCoordinate(input.longitude, "lon");
  const latitude = parseCoordinate(input.latitude, "lat");
  const model = parseModel(input.model);
  const validTime = parseValidTime(input.validTime, now);

  if (!isInsideChinaBounds(longitude, latitude)) {
    throw new ForecastQueryError("point is outside the supported China forecast bounds");
  }

  return {
    data: createDemoWeatherPoint(longitude, latitude, validTime, model),
    mode: "demo" as const,
    source: model,
  };
}

function latestAvailableCycle(model: ForecastModel, now: Date): string {
  const delayHours = model === "ecmwf" ? 8 : 5;
  const cycleHours = model === "ecmwf" ? [0, 12] : [0, 6, 12, 18];
  const available = new Date(now.getTime() - delayHours * 60 * 60 * 1000);
  const hour = [...cycleHours].reverse().find((cycle) => cycle <= available.getUTCHours()) ?? 0;
  available.setUTCHours(hour, 0, 0, 0);
  return available.toISOString();
}

export function createForecastRuns(now = new Date()) {
  if (Number.isNaN(now.getTime())) {
    throw new Error("now must be a valid date");
  }

  return FORECAST_MODELS.map((model) => ({
    model,
    referenceTime: latestAvailableCycle(model, now),
    status: "ready" as const,
    region: "china" as const,
    parameters: ["wind", "temperature", "precipitation", "irradiance"] as const,
    mode: "demo" as const,
  }));
}
