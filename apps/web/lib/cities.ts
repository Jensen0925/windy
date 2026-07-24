import type { ChinaLocation } from "@china-weather/locations";
import { type MapLocation, mapLocations } from "@china-weather/locations/map";

export type SelectedLocation = ChinaLocation | MapLocation;

const DEFAULT_API_ORIGIN = "http://localhost:4000";
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_ORIGIN).replace(/\/$/, "");

interface CitySearchPayload {
  data?: ChinaLocation[];
}

export async function searchCities(
  query: string,
  options: { limit?: number; signal?: AbortSignal } = {},
): Promise<ChinaLocation[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const parameters = new URLSearchParams({
    q: normalizedQuery,
    limit: String(options.limit ?? 10),
  });
  const response = await fetch(`${API_ORIGIN}/api/cities/search?${parameters}`, {
    signal: options.signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`城市搜索服务返回 ${response.status}`);
  }

  const payload = (await response.json()) as CitySearchPayload | ChinaLocation[];
  return Array.isArray(payload) ? payload : (payload.data ?? []);
}

export function getDefaultCity() {
  return mapLocations.find((item) => item.name === "北京") ?? null;
}

export function getLocationPoint(location: SelectedLocation): [number, number] {
  return [location.longitude, location.latitude];
}

export function getLocationZoom(location: SelectedLocation) {
  switch (location.level) {
    case "county":
      return 8;
    case "prefecture":
      return 6.2;
    case "province":
      return 5;
  }
}

export function getLocationLevelLabel(level: ChinaLocation["level"]) {
  switch (level) {
    case "province":
      return "省级";
    case "prefecture":
      return "地级";
    case "county":
      return "区县";
  }
}

export function getLocationSubtitle(location: ChinaLocation) {
  const ancestors = [location.provinceName, location.prefectureName]
    .filter(
      (name, index, values): name is string => Boolean(name) && values.indexOf(name) === index,
    )
    .filter((name) => name !== location.fullName && name !== location.name);
  return [...ancestors, getLocationLevelLabel(location.level)].join(" · ");
}
