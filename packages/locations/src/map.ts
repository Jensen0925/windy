import dataset from "../data/china-map-locations.json" with { type: "json" };
import type { LocationDatasetMetadata, MapLocation } from "./types";

export type { MapLocation } from "./types";

export const mapLocationMetadata = dataset.metadata as LocationDatasetMetadata;
export const mapLocations = dataset.locations as MapLocation[];

const mapLocationsById = new Map(mapLocations.map((location) => [location.id, location]));

export function getMapLocationById(id: string): MapLocation | undefined {
  return mapLocationsById.get(id);
}
