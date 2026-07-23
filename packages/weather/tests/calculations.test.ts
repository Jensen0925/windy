import { describe, expect, test } from "bun:test";
import {
  accumulatedRadiationToAverageIrradiance,
  calculateWindDirection,
  calculateWindSpeed,
  createDemoWeatherPoint,
  createWeatherPoint,
  getLayerValue,
  irradianceToEnergy,
} from "../src";

describe("wind calculations", () => {
  test("calculates speed from vector components", () => {
    expect(calculateWindSpeed(3, 4)).toBe(5);
  });

  test.each([
    [0, -10, 0],
    [-10, 0, 90],
    [0, 10, 180],
    [10, 0, 270],
  ])("converts u=%p and v=%p to meteorological direction %p", (u, v, expected) => {
    expect(calculateWindDirection(u, v)).toBeCloseTo(expected);
  });

  test("uses zero degrees for calm wind", () => {
    expect(calculateWindDirection(0, 0)).toBe(0);
  });
});

describe("irradiance calculations", () => {
  test("converts accumulated J/m² differences to average W/m²", () => {
    expect(accumulatedRadiationToAverageIrradiance(16_200_000, 5_400_000, 3)).toBe(1000);
  });

  test("handles a model accumulation reset", () => {
    expect(accumulatedRadiationToAverageIrradiance(5_400_000, 10_800_000, 3)).toBe(500);
  });

  test("converts average irradiance to interval energy", () => {
    expect(irradianceToEnergy(800, 3)).toBe(2.4);
  });

  test("rejects invalid physical values", () => {
    expect(() => accumulatedRadiationToAverageIrradiance(-1, 0, 3)).toThrow("cannot be negative");
    expect(() => irradianceToEnergy(-1, 3)).toThrow("cannot be negative");
    expect(() => irradianceToEnergy(500, 0)).toThrow("greater than zero");
  });
});

describe("weather point calculations", () => {
  test("derives display metrics from normalized field values", () => {
    const point = createWeatherPoint({
      longitude: 116.4,
      latitude: 39.9,
      validTime: "2026-07-23T06:00:00.000Z",
      model: "gfs",
      windU10m: 3,
      windV10m: 4,
      windU100m: 6,
      windV100m: 8,
      temperature2m: 28.26,
      precipitation3h: 1.24,
      precipitationTotal: 4.76,
      irradiance: 800.4,
    });

    expect(point).toMatchObject({
      longitude: 116.4,
      latitude: 39.9,
      validTime: "2026-07-23T06:00:00.000Z",
      windSpeed10m: 5,
      windSpeed100m: 10,
      temperature2m: 28.3,
      precipitation3h: 1.2,
      precipitationTotal: 4.8,
      irradiance: 800,
      irradianceEnergy: 2.401,
    });
    expect(point.windDirection).toBe(217);
  });

  test("keeps layer values aligned with the point contract", () => {
    const point = createDemoWeatherPoint(116.4, 39.9, "2026-07-23T04:00:00.000Z", "ecmwf");

    expect(getLayerValue(point, "wind")).toBe(point.windSpeed10m);
    expect(getLayerValue(point, "temperature")).toBe(point.temperature2m);
    expect(getLayerValue(point, "precipitation")).toBe(point.precipitation3h);
    expect(getLayerValue(point, "irradiance")).toBe(point.irradiance);
    expect(point.irradianceEnergy).toBeCloseTo((point.irradiance * 3) / 1000, 2);
  });

  test("rejects points outside China and invalid timestamps", () => {
    expect(() => createDemoWeatherPoint(0, 0, "2026-07-23T04:00:00.000Z", "gfs")).toThrow(
      "outside",
    );
    expect(() => createDemoWeatherPoint(116.4, 39.9, "not-a-date", "gfs")).toThrow("valid date");
  });
});
