export type WeatherLayer = "wind" | "temperature" | "precipitation" | "irradiance";
export type ForecastModel = "ECMWF" | "GFS";

export interface WeatherLayerDefinition {
  id: WeatherLayer;
  label: string;
  shortLabel: string;
  unit: string;
  description: string;
  accent: string;
  colors: string[];
}

export interface ForecastPoint {
  longitude: number;
  latitude: number;
  windSpeed: number;
  windDirection: number;
  temperature: number;
  precipitation: number;
  irradiance: number;
}

export const CHINA_BOUNDS: [[number, number], [number, number]] = [
  [73.4, 17.5],
  [135.1, 53.7],
];

export const WEATHER_LAYERS: WeatherLayerDefinition[] = [
  {
    id: "wind",
    label: "风场",
    shortLabel: "风",
    unit: "m/s",
    description: "10 米风速与流向",
    accent: "#69f3d0",
    colors: ["#163754", "#236e8a", "#39b9ae", "#a2e65e", "#f2c94c", "#f5789f"],
  },
  {
    id: "temperature",
    label: "温度",
    shortLabel: "温",
    unit: "°C",
    description: "地面 2 米气温",
    accent: "#ff916d",
    colors: ["#263c98", "#377be8", "#61d4d5", "#f4d35e", "#f47c48", "#d94875"],
  },
  {
    id: "precipitation",
    label: "降水",
    shortLabel: "雨",
    unit: "mm/3h",
    description: "未来三小时累计",
    accent: "#7ca6ff",
    colors: ["#172a46", "#24558c", "#2e91b8", "#40d39c", "#8467da", "#cf71e8"],
  },
  {
    id: "irradiance",
    label: "辐照度",
    shortLabel: "光",
    unit: "W/m²",
    description: "地表向下短波辐射",
    accent: "#ffc957",
    colors: ["#3c4051", "#8c7545", "#d7a943", "#ffcc57", "#ff8b42", "#e65445"],
  },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const toRadians = (value: number) => (value * Math.PI) / 180;

function noise(longitude: number, latitude: number, step: number, seed: number) {
  const first = Math.sin(longitude * 0.18 + step * 0.37 + seed) * 0.5;
  const second = Math.cos(latitude * 0.23 - step * 0.29 + seed * 1.7) * 0.3;
  const third = Math.sin((longitude + latitude) * 0.11 + seed * 2.3) * 0.2;
  return first + second + third;
}

export function getForecastPoint(
  longitude: number,
  latitude: number,
  step: number,
  model: ForecastModel,
): ForecastPoint {
  const modelOffset = model === "ECMWF" ? 0.35 : 1.8;
  const field = noise(longitude, latitude, step, modelOffset);
  const northCooling = (latitude - 18) * 0.48;
  const daylight = clamp(Math.sin(((step % 8) / 8) * Math.PI) * 1.18, 0, 1);
  const rainCell = Math.max(0, Math.sin(longitude * 0.27 + latitude * 0.19 + step * 0.52));

  return {
    longitude,
    latitude,
    windSpeed: Number(
      clamp(4.5 + field * 5.8 + Math.abs(latitude - 34) * 0.09, 0.4, 18.9).toFixed(1),
    ),
    windDirection: Math.round((210 + longitude * 2.8 + latitude * 1.4 + step * 17) % 360),
    temperature: Number(clamp(34 - northCooling + field * 5.2, -18, 39).toFixed(1)),
    precipitation: Number(clamp((rainCell + field * 0.24 - 0.38) * 12, 0, 25).toFixed(1)),
    irradiance: Math.round(clamp((520 + field * 260) * daylight, 0, 930)),
  };
}

export function getLayerValue(point: ForecastPoint, layer: WeatherLayer) {
  switch (layer) {
    case "wind":
      return point.windSpeed;
    case "temperature":
      return point.temperature;
    case "precipitation":
      return point.precipitation;
    case "irradiance":
      return point.irradiance;
  }
}

export function normalizeLayerValue(value: number, layer: WeatherLayer) {
  switch (layer) {
    case "wind":
      return clamp(value / 19, 0, 1);
    case "temperature":
      return clamp((value + 18) / 57, 0, 1);
    case "precipitation":
      return clamp(value / 18, 0, 1);
    case "irradiance":
      return clamp(value / 900, 0, 1);
  }
}

export function getCompassDirection(degrees: number) {
  const directions = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
  return directions[Math.round(degrees / 45) % 8];
}

export function getWindVector(longitude: number, latitude: number, step: number) {
  const angle = toRadians((longitude * 3.1 + latitude * 1.7 + step * 18 + 190) % 360);
  const magnitude = 0.55 + Math.abs(noise(longitude, latitude, step, 0.72)) * 1.35;
  return {
    x: Math.cos(angle) * magnitude,
    y: Math.sin(angle) * magnitude,
  };
}

export function formatCoordinate(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(2)}°${value >= 0 ? positive : negative}`;
}
