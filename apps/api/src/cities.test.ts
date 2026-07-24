import { describe, expect, test } from "bun:test";
import { LocationQueryError } from "@china-weather/locations";
import { createCityDetailsResponse, createCitySearchResponse } from "./cities";

describe("cities API domain", () => {
  test("searches the nationwide index", () => {
    const response = createCitySearchResponse("beijing", "5");

    expect(response.query).toBe("beijing");
    expect(response.limit).toBe(5);
    expect(response.data[0]?.fullName).toBe("北京市");
    expect(response.data[0]?.initials).toBe("bj");
    expect(response.dataset.version).toBe("2025.251231.260403");
  });

  test("returns all matching totals independently from the page size", () => {
    const response = createCitySearchResponse("朝阳", 1);
    expect(response.data).toHaveLength(1);
    expect(response.total).toBeGreaterThan(1);
  });

  test("returns no suggestions for an empty query", () => {
    expect(createCitySearchResponse()).toMatchObject({ data: [], query: "", total: 0 });
  });

  test("rejects invalid limits and overlong queries", () => {
    expect(() => createCitySearchResponse("北京", "0")).toThrow(LocationQueryError);
    expect(() => createCitySearchResponse("x".repeat(51))).toThrow(LocationQueryError);
  });

  test("returns location details by source id", () => {
    expect(createCityDetailsResponse("4403")?.data.fullName).toBe("深圳市");
    expect(createCityDetailsResponse("missing")).toBeUndefined();
  });
});
