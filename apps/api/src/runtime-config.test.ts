import { describe, expect, test } from "bun:test";
import { parseApiPort, parseCorsOrigins } from "./runtime-config";

describe("runtime config", () => {
  test("trims CORS origins and drops empty entries", () => {
    expect(parseCorsOrigins(" https://a.example, ,https://b.example ")).toEqual([
      "https://a.example",
      "https://b.example",
    ]);
    expect(parseCorsOrigins(" ")).toEqual(["http://localhost:3000"]);
  });

  test("validates the listening port", () => {
    expect(parseApiPort(undefined)).toBe(4000);
    expect(parseApiPort("8080")).toBe(8080);
    expect(() => parseApiPort("0")).toThrow("API_PORT must be an integer");
    expect(() => parseApiPort("abc")).toThrow("API_PORT must be an integer");
  });
});
