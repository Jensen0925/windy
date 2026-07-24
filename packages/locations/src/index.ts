import dataset from "../data/china-locations.json" with { type: "json" };
import { searchLocationDataset } from "./search";
import type { ChinaLocation, LocationDatasetMetadata, LocationSearchPage } from "./types";

export {
  DEFAULT_LOCATION_SEARCH_LIMIT,
  LocationQueryError,
  MAX_LOCATION_QUERY_LENGTH,
  MAX_LOCATION_SEARCH_LIMIT,
  parseLocationSearchLimit,
  searchLocationDataset,
} from "./search";
export type {
  ChinaLocation,
  LocationDatasetMetadata,
  LocationLevel,
  LocationSearchPage,
  MapLocation,
} from "./types";

export const locationMetadata = dataset.metadata as LocationDatasetMetadata;
export const locations = dataset.locations as ChinaLocation[];

const locationsById = new Map(locations.map((location) => [location.id, location]));

export function getLocationById(id: string): ChinaLocation | undefined {
  return locationsById.get(id);
}

export function searchLocations(query: string, limit?: number): LocationSearchPage {
  return searchLocationDataset(locations, query, limit);
}
