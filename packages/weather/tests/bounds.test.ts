import { describe, expect, test } from "bun:test";
import {
  assertInsideChinaBounds,
  CHINA_BOUNDS,
  isInsideChinaBounds,
  normalizeLongitude,
} from "../src";

describe("China forecast bounds", () => {
  test("includes all four bounding-box edges", () => {
    expect(isInsideChinaBounds(CHINA_BOUNDS.west, CHINA_BOUNDS.south)).toBe(true);
    expect(isInsideChinaBounds(CHINA_BOUNDS.east, CHINA_BOUNDS.north)).toBe(true);
  });

  test("rejects points outside the supported region and non-finite values", () => {
    expect(isInsideChinaBounds(CHINA_BOUNDS.west - 0.001, 30)).toBe(false);
    expect(isInsideChinaBounds(CHINA_BOUNDS.east + 0.001, 30)).toBe(false);
    expect(isInsideChinaBounds(110, CHINA_BOUNDS.south - 0.001)).toBe(false);
    expect(isInsideChinaBounds(110, CHINA_BOUNDS.north + 0.001)).toBe(false);
    expect(isInsideChinaBounds(Number.NaN, 30)).toBe(false);
    expect(isInsideChinaBounds(110, Number.POSITIVE_INFINITY)).toBe(false);
  });

  test("provides an assertion helper for API and calculation boundaries", () => {
    expect(() => assertInsideChinaBounds(116.4, 39.9)).not.toThrow();
    expect(() => assertInsideChinaBounds(0, 0)).toThrow("outside");
  });
});

describe("longitude normalization", () => {
  test.each([
    [116.4, 116.4],
    [190, -170],
    [-190, 170],
    [540, -180],
  ])("normalizes %p to %p", (input, expected) => {
    expect(normalizeLongitude(input)).toBeCloseTo(expected);
  });

  test("rejects non-finite longitudes", () => {
    expect(() => normalizeLongitude(Number.NaN)).toThrow("finite");
  });
});
