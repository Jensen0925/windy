import { describe, expect, test } from "bun:test";
import { buildForecastSteps, DEFAULT_FORECAST_STEP_COUNT, FORECAST_STEP_HOURS } from "../src";

describe("forecast steps", () => {
  test("floors the reference to the previous UTC forecast boundary", () => {
    const steps = buildForecastSteps(new Date("2026-07-23T10:47:12.000Z"), 3);

    expect(steps).toEqual([
      "2026-07-23T09:00:00.000Z",
      "2026-07-23T12:00:00.000Z",
      "2026-07-23T15:00:00.000Z",
    ]);
  });

  test("uses the shared default count and three-hour interval", () => {
    const steps = buildForecastSteps(new Date("2026-07-23T00:00:00.000Z"));

    expect(steps).toHaveLength(DEFAULT_FORECAST_STEP_COUNT);
    expect(
      (new Date(steps[1] as string).getTime() - new Date(steps[0] as string).getTime()) / 3_600_000,
    ).toBe(FORECAST_STEP_HOURS);
  });

  test("supports empty schedules and explicit valid step sizes", () => {
    expect(buildForecastSteps(new Date("2026-07-23T00:00:00.000Z"), 0)).toEqual([]);
    expect(buildForecastSteps(new Date("2026-07-23T11:00:00.000Z"), 2, 6)).toEqual([
      "2026-07-23T06:00:00.000Z",
      "2026-07-23T12:00:00.000Z",
    ]);
  });

  test("rejects malformed schedule inputs", () => {
    expect(() => buildForecastSteps(new Date("invalid"))).toThrow("valid date");
    expect(() => buildForecastSteps(new Date(), -1)).toThrow("non-negative");
    expect(() => buildForecastSteps(new Date(), 1.5)).toThrow("safe integer");
    expect(() => buildForecastSteps(new Date(), 2, 5)).toThrow("divisor of 24");
  });
});
