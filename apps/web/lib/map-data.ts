import type { Feature, FeatureCollection, GeoJsonProperties, Geometry, Position } from "geojson";
import { feature } from "topojson-client";
import countriesTopology from "world-atlas/countries-110m.json";
import type { ForecastModel, WeatherLayer } from "./weather";
import { CHINA_BOUNDS, getForecastPoint, normalizeLayerValue } from "./weather";

const topology = countriesTopology as { objects: { countries: object } };
const converted = feature(
  topology as never,
  topology.objects.countries as never,
) as unknown as FeatureCollection;

export const countries = converted;
export const chinaFeature = converted.features.find((item) => String(item.id) === "156") as
  | Feature<Geometry, GeoJsonProperties>
  | undefined;

const cityEntries: Array<[string, number, number, string]> = [
  ["北京", 116.41, 39.9, "首都"],
  ["上海", 121.47, 31.23, "华东"],
  ["广州", 113.26, 23.13, "华南"],
  ["成都", 104.07, 30.67, "西南"],
  ["武汉", 114.31, 30.59, "华中"],
  ["西安", 108.94, 34.34, "西北"],
  ["乌鲁木齐", 87.62, 43.82, "西北"],
  ["哈尔滨", 126.53, 45.8, "东北"],
  ["拉萨", 91.11, 29.65, "西南"],
  ["海口", 110.2, 20.04, "华南"],
];

export const cities: FeatureCollection = {
  type: "FeatureCollection",
  features: cityEntries.map(([name, longitude, latitude, region]) => ({
    type: "Feature",
    properties: { name, region },
    geometry: { type: "Point", coordinates: [longitude, latitude] },
  })),
};

function pointInRing(point: [number, number], ring: Position[]) {
  let inside = false;
  for (
    let index = 0, previousIndex = ring.length - 1;
    index < ring.length;
    previousIndex = index, index += 1
  ) {
    const current = ring[index];
    const previous = ring[previousIndex];
    if (!current || !previous) continue;
    const [currentX = 0, currentY = 0] = current;
    const [previousX = 0, previousY = 0] = previous;
    const intersects =
      currentY > point[1] !== previousY > point[1] &&
      point[0] <
        ((previousX - currentX) * (point[1] - currentY)) / (previousY - currentY || 1e-8) +
          currentX;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function isInsideChina(point: [number, number]) {
  const geometry = chinaFeature?.geometry;
  if (!geometry) return true;
  if (geometry.type === "Polygon") {
    return geometry.coordinates.some((ring) => pointInRing(point, ring));
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) => polygon.some((ring) => pointInRing(point, ring)));
  }
  return true;
}

export function createWeatherGrid(
  layer: WeatherLayer,
  step: number,
  model: ForecastModel,
): FeatureCollection {
  const features: Feature[] = [];
  const [west, south] = CHINA_BOUNDS[0];
  const [east, north] = CHINA_BOUNDS[1];

  for (let latitude = south; latitude <= north; latitude += 1.45) {
    for (let longitude = west; longitude <= east; longitude += 1.55) {
      if (!isInsideChina([longitude, latitude])) continue;
      const point = getForecastPoint(longitude, latitude, step, model);
      const rawValue =
        layer === "wind"
          ? point.windSpeed
          : layer === "temperature"
            ? point.temperature
            : layer === "precipitation"
              ? point.precipitation
              : point.irradiance;
      features.push({
        type: "Feature",
        properties: {
          intensity: normalizeLayerValue(rawValue, layer),
          value: rawValue,
        },
        geometry: { type: "Point", coordinates: [longitude, latitude] },
      });
    }
  }

  return { type: "FeatureCollection", features };
}

export function createGraticule(): FeatureCollection {
  const features: Feature[] = [];
  for (let longitude = 75; longitude <= 135; longitude += 10) {
    features.push({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [longitude, 15],
          [longitude, 56],
        ],
      },
    });
  }
  for (let latitude = 20; latitude <= 50; latitude += 10) {
    features.push({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [70, latitude],
          [140, latitude],
        ],
      },
    });
  }
  return { type: "FeatureCollection", features };
}
