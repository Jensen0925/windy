import { type MapLocation, mapLocations } from "@china-weather/locations/map";
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  Point,
  Position,
} from "geojson";
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

const LABELLED_CITY_NAMES = new Set([
  "北京",
  "天津",
  "石家庄",
  "太原",
  "呼和浩特",
  "沈阳",
  "长春",
  "哈尔滨",
  "上海",
  "南京",
  "杭州",
  "合肥",
  "福州",
  "南昌",
  "济南",
  "郑州",
  "武汉",
  "长沙",
  "广州",
  "深圳",
  "南宁",
  "海口",
  "重庆",
  "成都",
  "贵阳",
  "昆明",
  "拉萨",
  "西安",
  "兰州",
  "西宁",
  "银川",
  "乌鲁木齐",
  "香港",
  "澳门",
  "台北",
]);

export interface CityFeatureProperties {
  id: string;
  name: string;
  fullName: string;
  level: MapLocation["level"];
  showLabel: boolean;
}

export const cities: FeatureCollection<Point, CityFeatureProperties> = {
  type: "FeatureCollection",
  features: mapLocations.map((location) => ({
    type: "Feature",
    id: location.id,
    properties: {
      id: location.id,
      name: location.name,
      fullName: location.fullName,
      level: location.level,
      showLabel: LABELLED_CITY_NAMES.has(location.name),
    },
    geometry: {
      type: "Point",
      coordinates: [location.longitude, location.latitude],
    },
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
