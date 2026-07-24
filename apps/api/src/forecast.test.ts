import { describe, expect, test } from "bun:test";
import {
  createForecastCatalog,
  createForecastRuns,
  createPointForecast,
  ForecastQueryError,
} from "./forecast";

describe("forecast domain", () => {
  test("builds a typed China-only catalog", () => {
    const catalog = createForecastCatalog(new Date("2026-07-23T10:45:00.000Z"));

    expect(catalog.bounds).toEqual({ west: 73, south: 3, east: 136, north: 54 });
    expect(catalog.models.map((model) => model.id)).toEqual(["ecmwf", "gfs"]);
    expect(catalog.steps[0]).toBe("2026-07-23T09:00:00.000Z");
  });

  test("normalizes a valid point query", () => {
    const result = createPointForecast({
      longitude: "116.4",
      latitude: "39.9",
      validTime: "2026-07-24T03:00:00Z",
      model: "ecmwf",
    });

    expect(result.source).toBe("ecmwf");
    expect(result.data.validTime).toBe("2026-07-24T03:00:00.000Z");
    expect(result.data.longitude).toBe(116.4);
  });

  test("rejects unknown models instead of silently selecting GFS", () => {
    expect(() =>
      createPointForecast({ longitude: "116.4", latitude: "39.9", model: "icon" }),
    ).toThrow(new ForecastQueryError("model must be either gfs or ecmwf"));
  });

  test("rejects blank and out-of-region coordinates", () => {
    expect(() => createPointForecast({ longitude: "", latitude: "39.9" })).toThrow(
      "lon must be a valid number",
    );
    expect(() => createPointForecast({ longitude: "10", latitude: "39.9" })).toThrow(
      "point is outside the supported China forecast bounds",
    );
  });

  test("computes model-specific available cycles", () => {
    const runs = createForecastRuns(new Date("2026-07-23T11:00:00.000Z"));

    expect(runs.find((run) => run.model === "gfs")?.referenceTime).toBe("2026-07-23T06:00:00.000Z");
    expect(runs.find((run) => run.model === "ecmwf")?.referenceTime).toBe(
      "2026-07-23T00:00:00.000Z",
    );
  });
});
