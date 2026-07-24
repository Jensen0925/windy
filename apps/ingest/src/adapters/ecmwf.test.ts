import { describe, expect, test } from "bun:test";
import { EcmwfAdapter } from "./ecmwf";

const request = {
  model: "ecmwf" as const,
  referenceTime: new Date("2026-07-23T00:00:00.000Z"),
  forecastHour: 12,
  targetDirectory: "data/raw",
};

describe("EcmwfAdapter", () => {
  test("builds current IFS Open Data GRIB and index URLs", () => {
    const plan = new EcmwfAdapter({ baseUrl: "https://data.example/forecasts/" }).buildPlan(
      request,
    );

    expect(plan.url).toBe(
      "https://data.example/forecasts/20260723/00z/ifs/0p25/oper/20260723000000-12h-oper-fc.grib2",
    );
    expect(plan.selection?.indexUrl).toBe(
      "https://data.example/forecasts/20260723/00z/ifs/0p25/oper/20260723000000-12h-oper-fc.index",
    );
    expect(plan.selection?.parameters).toEqual(["10u", "10v", "100u", "100v", "2t", "tp", "ssrd"]);
    expect(plan.spatialSubset.mode).toBe("post-download-crop");
    expect(plan.metadata.sourceGrid).toBe("global");
  });

  test("enforces Open Data cycle and step availability", () => {
    const adapter = new EcmwfAdapter();
    expect(() =>
      adapter.buildPlan({ ...request, referenceTime: new Date("2026-07-23T06:00:00Z") }),
    ).toThrow("exact 00/12 UTC cycle");
    expect(() => adapter.buildPlan({ ...request, forecastHour: 153 })).toThrow(
      "6-hour step after hour 144",
    );
    expect(() => adapter.buildPlan({ ...request, forecastHour: 366 })).toThrow(
      "must not exceed 360",
    );
  });
});
