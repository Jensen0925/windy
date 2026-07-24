import { describe, expect, test } from "bun:test";
import {
  getLocationById,
  LocationQueryError,
  locationMetadata,
  locations,
  parseLocationSearchLimit,
  searchLocations,
} from "../src";

function names(query: string): string[] {
  return searchLocations(query, 10).items.map((location) => location.fullName);
}

describe("China location dataset", () => {
  test("contains the complete province, prefecture and county index", () => {
    expect(locationMetadata.recordCount).toBe(3_635);
    expect(locations.filter((location) => location.level === "province")).toHaveLength(34);
    expect(locations.every((location) => Number.isFinite(location.longitude))).toBe(true);
    expect(locations.every((location) => Number.isFinite(location.latitude))).toBe(true);
  });

  test("finds locations by Chinese name, pinyin and initials", () => {
    expect(names("北京")[0]).toBe("北京市");
    expect(names("beijing")[0]).toBe("北京市");
    expect(names("bei jing")[0]).toBe("北京市");
    expect(names("bj")[0]).toBe("北京市");
  });

  test("keeps same-name county results distinguishable by path", () => {
    const chaoyang = searchLocations("朝阳", 20).items;
    expect(chaoyang.some((location) => location.path.includes("北京市 / 北京市 / 朝阳区"))).toBe(
      true,
    );
    expect(chaoyang.some((location) => location.path.includes("辽宁省 / 朝阳市"))).toBe(true);
  });

  test("supports administrative codes and id lookup", () => {
    expect(searchLocations("110101000000").items[0]?.fullName).toBe("东城区");
    expect(getLocationById("110101")?.path).toBe("北京市 / 北京市 / 东城区");
  });

  test("returns an empty page for an empty query", () => {
    expect(searchLocations("   ")).toEqual({ items: [], total: 0 });
  });

  test("validates limits and query length", () => {
    expect(parseLocationSearchLimit(undefined)).toBe(10);
    expect(() => parseLocationSearchLimit("21")).toThrow(LocationQueryError);
    expect(() => searchLocations("a".repeat(51))).toThrow(LocationQueryError);
  });
});
