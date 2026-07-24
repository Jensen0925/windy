export type LocationLevel = "province" | "prefecture" | "county";

export interface ChinaLocation {
  id: string;
  parentId: string | null;
  code: string;
  level: LocationLevel;
  name: string;
  fullName: string;
  provinceName: string;
  prefectureName: string | null;
  path: string;
  longitude: number;
  latitude: number;
  pinyin: string;
  pinyinDisplay: string;
  initials: string;
}

export interface MapLocation {
  id: string;
  code: string;
  level: "prefecture";
  name: string;
  fullName: string;
  provinceName: string;
  longitude: number;
  latitude: number;
}

export interface LocationDatasetMetadata {
  version: string;
  updatedAt: string;
  recordCount: number;
  source: string;
  coordinateSystem: "WGS84";
  coverage: string;
}

export interface LocationSearchPage {
  items: ChinaLocation[];
  total: number;
}
