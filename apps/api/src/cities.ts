import {
  type ChinaLocation,
  getLocationById,
  type LocationLevel,
  locationMetadata,
  parseLocationSearchLimit,
  searchLocations,
} from "@china-weather/locations";

const levelLabels: Record<LocationLevel, string> = {
  province: "省级",
  prefecture: "地级",
  county: "区县级",
};

export interface CitySearchItem extends ChinaLocation {
  displayName: string;
  subtitle: string;
}

function toSearchItem(location: ChinaLocation): CitySearchItem {
  const parentPath = location.path.split(" / ").slice(0, -1).join(" · ");
  return {
    ...location,
    displayName: location.fullName,
    subtitle: parentPath
      ? `${parentPath} · ${levelLabels[location.level]}`
      : levelLabels[location.level],
  };
}

export function createCitySearchResponse(query = "", limitValue?: string | number) {
  const limit = parseLocationSearchLimit(limitValue);
  const normalizedQuery = query.trim();
  const result = searchLocations(normalizedQuery, limit);

  return {
    data: result.items.map(toSearchItem),
    query: normalizedQuery,
    limit,
    total: result.total,
    dataset: {
      version: locationMetadata.version,
      updatedAt: locationMetadata.updatedAt,
    },
  };
}

export function createCityDetailsResponse(id: string) {
  const location = getLocationById(id);
  return location ? { data: toSearchItem(location) } : undefined;
}
