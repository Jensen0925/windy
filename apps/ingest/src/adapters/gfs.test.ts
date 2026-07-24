import { describe, expect, test } from "bun:test";
import { GfsAdapter } from "./gfs";

const request = {
  model: "gfs" as const,
  referenceTime: new Date("2026-07-23T00:00:00.000Z"),
  forecastHour: 12,
  targetDirectory: "data/raw",
};

describe("GfsAdapter", () => {
  test("builds an official NOMADS China subregion request", () => {
    const plan = new GfsAdapter({ baseUrl: "https://nomads.example/filter_gfs_0p25.pl" }).buildPlan(
      request,
    );
    const url = new URL(plan.url);

    expect(url.origin + url.pathname).toBe("https://nomads.example/filter_gfs_0p25.pl");
    expect(url.searchParams.get("file")).toBe("gfs.t00z.pgrb2.0p25.f012");
    expect(url.searchParams.get("dir")).toBe("/gfs.20260723/00/atmos");
    expect(url.searchParams.get("toplat")).toBe("54");
    expect(url.searchParams.get("bottomlat")).toBe("3");
    expect(url.searchParams.get("leftlon")).toBe("73");
    expect(url.searchParams.get("rightlon")).toBe("136");
    expect(url.searchParams.get("var_DSWRF")).toBe("on");
    expect(plan.spatialSubset.mode).toBe("remote-filter");
    expect(plan.targetPath).toEndWith("f012.grib2");
  });

  test("rejects invalid cycles and forecast steps", () => {
    const adapter = new GfsAdapter();
    expect(() =>
      adapter.buildPlan({ ...request, referenceTime: new Date("2026-07-23T01:00:00Z") }),
    ).toThrow("exact 00/06/12/18 UTC cycle");
    expect(() => adapter.buildPlan({ ...request, forecastHour: 121 })).toThrow(
      "3-hour step after hour 120",
    );
    expect(() => adapter.buildPlan({ ...request, forecastHour: 385 })).toThrow(
      "must not exceed 384",
    );
  });
});
