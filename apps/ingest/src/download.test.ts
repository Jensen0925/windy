import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EcmwfAdapter } from "./adapters/ecmwf";
import { downloadPlan, parseEcmwfIndex, selectEcmwfRanges } from "./download";

let temporaryDirectory: string | undefined;

afterEach(async () => {
  if (temporaryDirectory) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  }
});

function gribMessage(length: number, marker: number): Uint8Array {
  const bytes = new Uint8Array(length).fill(marker);
  bytes.set([0x47, 0x52, 0x49, 0x42]);
  return bytes;
}

describe("ECMWF indexed downloads", () => {
  test("parses JSON-lines indexes and preserves source byte order", () => {
    const entries = parseEcmwfIndex(
      [
        JSON.stringify({ param: "2t", levtype: "sfc", _offset: 20, _length: 10 }),
        JSON.stringify({ param: "10u", levtype: "sfc", _offset: 0, _length: 8 }),
      ].join("\n"),
    );

    expect(
      selectEcmwfRanges(entries, {
        type: "ecmwf-json-lines-index",
        indexUrl: "https://example.test/file.index",
        parameters: ["10u", "2t"],
        levelType: "sfc",
      }),
    ).toEqual([
      { parameter: "10u", start: 0, end: 7 },
      { parameter: "2t", start: 20, end: 29 },
    ]);
  });

  test("downloads only selected GRIB messages using HTTP ranges", async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "windy-ingest-"));
    const plan = new EcmwfAdapter({ baseUrl: "https://data.example/forecasts" }).buildPlan({
      model: "ecmwf",
      referenceTime: new Date("2026-07-23T00:00:00Z"),
      forecastHour: 12,
      targetDirectory: temporaryDirectory,
    });
    const parameters = plan.selection?.parameters ?? [];
    const index = parameters
      .map((param, index_) =>
        JSON.stringify({ param, levtype: "sfc", _offset: index_ * 8, _length: 8 }),
      )
      .join("\n");
    const requestedRanges: string[] = [];
    const fetcher: typeof fetch = Object.assign(
      async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith(".index")) {
          return new Response(index, { status: 200 });
        }

        const headers = new Headers(init?.headers);
        const range = headers.get("Range");
        if (!range) {
          return new Response("missing range", { status: 400 });
        }
        requestedRanges.push(range);
        const [startText, endText] = range.replace("bytes=", "").split("-");
        const start = Number(startText);
        const end = Number(endText);
        return new Response(gribMessage(end - start + 1, start).buffer as ArrayBuffer, {
          status: 206,
          headers: { "Content-Range": `${range.replace("=", " ")}/56` },
        });
      },
      { preconnect: fetch.preconnect },
    );

    const result = await downloadPlan(plan, { fetch: fetcher, log: () => undefined });
    const downloaded = new Uint8Array(await readFile(plan.targetPath));

    expect(requestedRanges).toHaveLength(7);
    expect(requestedRanges[0]).toBe("bytes=0-7");
    expect(result).toEqual({ targetPath: plan.targetPath, bytesWritten: 56, requestCount: 8 });
    expect(downloaded.byteLength).toBe(56);
    expect(new TextDecoder().decode(downloaded.slice(0, 4))).toBe("GRIB");
  });

  test("fails when the index omits a required parameter", () => {
    const entries = parseEcmwfIndex(
      JSON.stringify({ param: "10u", levtype: "sfc", _offset: 0, _length: 8 }),
    );

    expect(() =>
      selectEcmwfRanges(entries, {
        type: "ecmwf-json-lines-index",
        indexUrl: "https://example.test/file.index",
        parameters: ["10u", "ssrd"],
        levelType: "sfc",
      }),
    ).toThrow("missing required parameters: ssrd");
  });
});
