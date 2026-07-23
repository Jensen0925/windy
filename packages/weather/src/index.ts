export const CHINA_BOUNDS = {
  west: 73,
  south: 3,
  east: 136,
  north: 54,
} as const;

export type ChinaBounds = typeof CHINA_BOUNDS;

export const DEFAULT_MAP_VIEW = {
  longitude: 104.5,
  latitude: 35.5,
  zoom: 3.45,
} as const;

export const FORECAST_STEP_HOURS = 3;
export const DEFAULT_FORECAST_STEP_COUNT = 33;
export const DEFAULT_IRRADIANCE_INTERVAL_HOURS = 3;

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const SECONDS_PER_HOUR = 60 * 60;

export type ForecastModel = "gfs" | "ecmwf";
export type WeatherLayer = "wind" | "temperature" | "precipitation" | "irradiance";

export const WEATHER_UNITS = {
  windSpeed: "m/s",
  temperature: "°C",
  precipitation: "mm/3h",
  irradiance: "W/m²",
  irradianceEnergy: "kWh/m²",
} as const;

export type WeatherUnit = (typeof WEATHER_UNITS)[keyof typeof WEATHER_UNITS];

export interface WeatherPoint {
  latitude: number;
  longitude: number;
  validTime: string;
  model: ForecastModel;
  windSpeed10m: number;
  windSpeed100m: number;
  /** Meteorological direction in degrees: the direction the wind comes from. */
  windDirection: number;
  /** Air temperature at two metres in degrees Celsius. */
  temperature2m: number;
  /** Accumulated precipitation for the current three-hour forecast step in millimetres. */
  precipitation3h: number;
  /** Accumulated precipitation since the beginning of the model run in millimetres. */
  precipitationTotal: number;
  /** Mean surface downwelling short-wave irradiance for the forecast step in W/m². */
  irradiance: number;
  /** Irradiation energy for the forecast step in kWh/m². */
  irradianceEnergy: number;
}

export interface WeatherPointInput {
  latitude: number;
  longitude: number;
  validTime: string;
  model: ForecastModel;
  windU10m: number;
  windV10m: number;
  windU100m: number;
  windV100m: number;
  temperature2m: number;
  precipitation3h: number;
  precipitationTotal: number;
  irradiance: number;
  irradianceIntervalHours?: number;
}

export interface LayerDefinition {
  id: WeatherLayer;
  name: string;
  shortName: string;
  unit: WeatherUnit;
  description: string;
  stops: ReadonlyArray<{ value: number; color: string }>;
}

export const LAYERS = {
  wind: {
    id: "wind",
    name: "风场",
    shortName: "风",
    unit: WEATHER_UNITS.windSpeed,
    description: "10 米地表风速与风向",
    stops: [
      { value: 0, color: "#0c4a6e" },
      { value: 4, color: "#06b6d4" },
      { value: 8, color: "#67e8f9" },
      { value: 14, color: "#facc15" },
      { value: 22, color: "#fb7185" },
      { value: 32, color: "#c026d3" },
    ],
  },
  temperature: {
    id: "temperature",
    name: "温度",
    shortName: "温度",
    unit: WEATHER_UNITS.temperature,
    description: "2 米气温",
    stops: [
      { value: -30, color: "#4c1d95" },
      { value: -10, color: "#2563eb" },
      { value: 5, color: "#22d3ee" },
      { value: 20, color: "#facc15" },
      { value: 30, color: "#f97316" },
      { value: 40, color: "#be123c" },
    ],
  },
  precipitation: {
    id: "precipitation",
    name: "降水",
    shortName: "降水",
    unit: WEATHER_UNITS.precipitation,
    description: "3 小时累计降水",
    stops: [
      { value: 0, color: "#082f49" },
      { value: 0.5, color: "#0ea5e9" },
      { value: 5, color: "#22c55e" },
      { value: 15, color: "#eab308" },
      { value: 30, color: "#f97316" },
      { value: 60, color: "#e11d48" },
    ],
  },
  irradiance: {
    id: "irradiance",
    name: "辐照度",
    shortName: "辐照",
    unit: WEATHER_UNITS.irradiance,
    description: "地表向下短波太阳辐射",
    stops: [
      { value: 0, color: "#172554" },
      { value: 150, color: "#1d4ed8" },
      { value: 350, color: "#06b6d4" },
      { value: 550, color: "#84cc16" },
      { value: 750, color: "#facc15" },
      { value: 950, color: "#fff7ae" },
    ],
  },
} as const satisfies Record<WeatherLayer, LayerDefinition>;

export const MODEL_NAMES: Record<ForecastModel, string> = {
  gfs: "GFS 0.25°",
  ecmwf: "ECMWF IFS",
};

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number`);
  }
}

function assertPositive(value: number, name: string): void {
  assertFinite(value, name);
  if (value <= 0) {
    throw new RangeError(`${name} must be greater than zero`);
  }
}

function round(value: number, fractionDigits: number): number {
  return Number(value.toFixed(fractionDigits));
}

export function normalizeLongitude(longitude: number): number {
  assertFinite(longitude, "longitude");
  if (longitude >= -180 && longitude < 180) {
    return Object.is(longitude, -0) ? 0 : longitude;
  }
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

export function normalizeDegrees(degrees: number): number {
  assertFinite(degrees, "degrees");
  return ((degrees % 360) + 360) % 360;
}

export function isInsideChinaBounds(longitude: number, latitude: number): boolean {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return false;
  }

  return (
    longitude >= CHINA_BOUNDS.west &&
    longitude <= CHINA_BOUNDS.east &&
    latitude >= CHINA_BOUNDS.south &&
    latitude <= CHINA_BOUNDS.north
  );
}

export function assertInsideChinaBounds(longitude: number, latitude: number): void {
  if (!isInsideChinaBounds(longitude, latitude)) {
    throw new RangeError("point is outside the supported China forecast bounds");
  }
}

export function buildForecastSteps(
  reference = new Date(),
  count = DEFAULT_FORECAST_STEP_COUNT,
  stepHours = FORECAST_STEP_HOURS,
): string[] {
  const referenceTime = new Date(reference);
  if (Number.isNaN(referenceTime.getTime())) {
    throw new RangeError("reference must be a valid date");
  }
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError("count must be a non-negative safe integer");
  }
  if (!Number.isSafeInteger(stepHours) || stepHours <= 0 || 24 % stepHours !== 0) {
    throw new RangeError("stepHours must be a positive whole-hour divisor of 24");
  }

  referenceTime.setUTCMinutes(0, 0, 0);
  referenceTime.setUTCHours(Math.floor(referenceTime.getUTCHours() / stepHours) * stepHours);

  return Array.from({ length: count }, (_, index) =>
    new Date(referenceTime.getTime() + index * stepHours * MILLISECONDS_PER_HOUR).toISOString(),
  );
}

export function calculateWindSpeed(uComponent: number, vComponent: number): number {
  assertFinite(uComponent, "uComponent");
  assertFinite(vComponent, "vComponent");
  return Math.hypot(uComponent, vComponent);
}

export function calculateWindDirection(uComponent: number, vComponent: number): number {
  const speed = calculateWindSpeed(uComponent, vComponent);
  if (speed === 0) {
    return 0;
  }

  return normalizeDegrees((Math.atan2(-uComponent, -vComponent) * 180) / Math.PI);
}

export function accumulatedRadiationToAverageIrradiance(
  accumulatedJoulesPerSquareMeter: number,
  previousAccumulatedJoulesPerSquareMeter: number,
  intervalHours: number,
): number {
  assertFinite(accumulatedJoulesPerSquareMeter, "accumulatedJoulesPerSquareMeter");
  assertFinite(previousAccumulatedJoulesPerSquareMeter, "previousAccumulatedJoulesPerSquareMeter");
  assertPositive(intervalHours, "intervalHours");

  if (accumulatedJoulesPerSquareMeter < 0 || previousAccumulatedJoulesPerSquareMeter < 0) {
    throw new RangeError("accumulated radiation values cannot be negative");
  }

  const difference =
    accumulatedJoulesPerSquareMeter >= previousAccumulatedJoulesPerSquareMeter
      ? accumulatedJoulesPerSquareMeter - previousAccumulatedJoulesPerSquareMeter
      : accumulatedJoulesPerSquareMeter;

  return difference / (intervalHours * SECONDS_PER_HOUR);
}

export function irradianceToEnergy(
  averageIrradianceWattsPerSquareMeter: number,
  intervalHours: number,
): number {
  assertFinite(averageIrradianceWattsPerSquareMeter, "averageIrradianceWattsPerSquareMeter");
  assertPositive(intervalHours, "intervalHours");
  if (averageIrradianceWattsPerSquareMeter < 0) {
    throw new RangeError("average irradiance cannot be negative");
  }

  return (averageIrradianceWattsPerSquareMeter * intervalHours) / 1000;
}

export function createWeatherPoint(input: WeatherPointInput): WeatherPoint {
  assertInsideChinaBounds(input.longitude, input.latitude);

  const validTime = new Date(input.validTime);
  if (Number.isNaN(validTime.getTime())) {
    throw new RangeError("validTime must be a valid date");
  }

  const numericInputs: ReadonlyArray<[string, number]> = [
    ["windU10m", input.windU10m],
    ["windV10m", input.windV10m],
    ["windU100m", input.windU100m],
    ["windV100m", input.windV100m],
    ["temperature2m", input.temperature2m],
    ["precipitation3h", input.precipitation3h],
    ["precipitationTotal", input.precipitationTotal],
    ["irradiance", input.irradiance],
  ];
  for (const [name, value] of numericInputs) {
    assertFinite(value, name);
  }

  const intervalHours = input.irradianceIntervalHours ?? DEFAULT_IRRADIANCE_INTERVAL_HOURS;
  if (input.precipitation3h < 0 || input.precipitationTotal < 0) {
    throw new RangeError("precipitation values cannot be negative");
  }

  const windSpeed10m = calculateWindSpeed(input.windU10m, input.windV10m);
  const windSpeed100m = calculateWindSpeed(input.windU100m, input.windV100m);

  return {
    latitude: input.latitude,
    longitude: normalizeLongitude(input.longitude),
    validTime: validTime.toISOString(),
    model: input.model,
    windSpeed10m: round(windSpeed10m, 1),
    windSpeed100m: round(windSpeed100m, 1),
    windDirection: Math.round(calculateWindDirection(input.windU10m, input.windV10m)),
    temperature2m: round(input.temperature2m, 1),
    precipitation3h: round(input.precipitation3h, 1),
    precipitationTotal: round(input.precipitationTotal, 1),
    irradiance: Math.round(input.irradiance),
    irradianceEnergy: round(irradianceToEnergy(input.irradiance, intervalHours), 3),
  };
}

export function getLayerValue(point: WeatherPoint, layer: WeatherLayer): number {
  switch (layer) {
    case "wind":
      return point.windSpeed10m;
    case "temperature":
      return point.temperature2m;
    case "precipitation":
      return point.precipitation3h;
    case "irradiance":
      return point.irradiance;
  }
}

export function createDemoWeatherPoint(
  longitude: number,
  latitude: number,
  validTime: string,
  model: ForecastModel,
): WeatherPoint {
  assertInsideChinaBounds(longitude, latitude);

  const time = new Date(validTime);
  if (Number.isNaN(time.getTime())) {
    throw new RangeError("validTime must be a valid date");
  }

  const chinaStandardTime =
    (time.getUTCHours() + 8 + time.getUTCMinutes() / 60 + time.getUTCSeconds() / 3600) % 24;
  const dayPhase = Math.sin(((chinaStandardTime - 6) / 12) * Math.PI);
  const spatialA = Math.sin(longitude * 0.16 + time.getTime() / 25_000_000);
  const spatialB = Math.cos(latitude * 0.21 - time.getTime() / 31_000_000);
  const modelOffset = model === "ecmwf" ? 0.7 : -0.4;
  const windSpeed10m = Math.max(0.6, 5.5 + spatialA * 3.8 + spatialB * 2 + modelOffset);
  const windDirection = normalizeDegrees((spatialA + 1) * 135 + longitude);
  const directionRadians = (windDirection * Math.PI) / 180;
  const windU10m = -windSpeed10m * Math.sin(directionRadians);
  const windV10m = -windSpeed10m * Math.cos(directionRadians);
  const windSpeed100m = windSpeed10m * 1.42;
  const precipitation3h = Math.max(0, (spatialA + spatialB - 0.75) * 12);
  const sunElevation = Math.max(0, dayPhase);
  const cloudFactor = Math.max(0.25, 1 - precipitation3h / 35);
  const irradiance = 930 * sunElevation * cloudFactor;

  return createWeatherPoint({
    latitude,
    longitude,
    validTime: time.toISOString(),
    model,
    windU10m,
    windV10m,
    windU100m: -windSpeed100m * Math.sin(directionRadians),
    windV100m: -windSpeed100m * Math.cos(directionRadians),
    temperature2m: 28 - Math.abs(latitude - 23) * 0.62 + spatialB * 4.2 + modelOffset,
    precipitation3h,
    precipitationTotal: precipitation3h * 2.4,
    irradiance,
  });
}
