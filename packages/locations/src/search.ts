import type { ChinaLocation, LocationLevel, LocationSearchPage } from "./types";

export const DEFAULT_LOCATION_SEARCH_LIMIT = 10;
export const MAX_LOCATION_SEARCH_LIMIT = 20;
export const MAX_LOCATION_QUERY_LENGTH = 50;

const levelPriority: Record<LocationLevel, number> = {
  province: 3,
  prefecture: 2,
  county: 1,
};

export class LocationQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocationQueryError";
  }
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("zh-CN").replaceAll(/\s+/g, " ");
}

function compact(value: string): string {
  return value.replaceAll(" ", "");
}

function scoreLocation(location: ChinaLocation, query: string): number {
  const normalizedQuery = normalize(query);
  const compactQuery = compact(normalizedQuery);
  const normalizedName = normalize(location.name);
  const normalizedFullName = normalize(location.fullName);
  const normalizedPath = normalize(location.path);

  if (normalizedName === normalizedQuery) return 1_000;
  if (normalizedFullName === normalizedQuery) return 980;
  if (normalizedName.startsWith(normalizedQuery)) return 940;
  if (normalizedFullName.startsWith(normalizedQuery)) return 920;
  if (location.pinyin === compactQuery) return 900;
  if (location.pinyin.startsWith(compactQuery)) return 860;
  if (location.pinyinDisplay.startsWith(normalizedQuery)) return 840;
  if (location.initials === compactQuery) return 820;
  if (location.initials.startsWith(compactQuery)) return 780;
  if (location.code === compactQuery) return 760;
  if (location.code.startsWith(compactQuery)) return 720;
  if (normalizedName.includes(normalizedQuery)) return 680;
  if (normalizedFullName.includes(normalizedQuery)) return 660;
  if (location.pinyin.includes(compactQuery)) return 620;
  if (normalizedPath.includes(normalizedQuery)) return 580;
  return 0;
}

export function parseLocationSearchLimit(value?: string | number): number {
  if (value === undefined || value === "") {
    return DEFAULT_LOCATION_SEARCH_LIMIT;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > MAX_LOCATION_SEARCH_LIMIT) {
    throw new LocationQueryError(
      `limit must be an integer between 1 and ${MAX_LOCATION_SEARCH_LIMIT}`,
    );
  }

  return parsed;
}

export function searchLocationDataset(
  locations: readonly ChinaLocation[],
  query: string,
  limit = DEFAULT_LOCATION_SEARCH_LIMIT,
): LocationSearchPage {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return { items: [], total: 0 };
  }
  if (normalizedQuery.length > MAX_LOCATION_QUERY_LENGTH) {
    throw new LocationQueryError(`query must not exceed ${MAX_LOCATION_QUERY_LENGTH} characters`);
  }

  const normalizedLimit = parseLocationSearchLimit(limit);
  const matches = locations
    .map((location) => ({ location, score: scoreLocation(location, normalizedQuery) }))
    .filter((match) => match.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        levelPriority[right.location.level] - levelPriority[left.location.level] ||
        left.location.path.localeCompare(right.location.path, "zh-CN"),
    );

  return {
    items: matches.slice(0, normalizedLimit).map((match) => match.location),
    total: matches.length,
  };
}
