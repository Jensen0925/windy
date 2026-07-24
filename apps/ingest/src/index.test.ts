import { describe, expect, test } from "bun:test";
import { latestCycle } from "./index";

describe("latestCycle", () => {
  test("accounts for publication delays and UTC day rollover", () => {
    expect(latestCycle("gfs", new Date("2026-07-23T11:00:00Z")).toISOString()).toBe(
      "2026-07-23T06:00:00.000Z",
    );
    expect(latestCycle("ecmwf", new Date("2026-07-23T06:00:00Z")).toISOString()).toBe(
      "2026-07-22T12:00:00.000Z",
    );
  });
});
