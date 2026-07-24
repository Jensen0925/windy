import { mkdir, rename, rm } from "node:fs/promises";
import { dirname } from "node:path";
import type { DownloadPlan, IndexedParameterSelection } from "./adapters/types";

interface EcmwfIndexEntry {
  param: string;
  levtype?: string;
  _offset: number;
  _length: number;
}

interface ByteRange {
  parameter: string;
  start: number;
  end: number;
}

export interface DownloadResult {
  targetPath: string;
  bytesWritten: number;
  requestCount: number;
}

export interface DownloadOptions {
  fetch?: typeof fetch;
  log?: (message: string) => void;
}

function isIndexEntry(value: unknown): value is EcmwfIndexEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const entry = value as Partial<EcmwfIndexEntry>;
  return (
    typeof entry.param === "string" &&
    typeof entry._offset === "number" &&
    Number.isSafeInteger(entry._offset) &&
    entry._offset >= 0 &&
    typeof entry._length === "number" &&
    Number.isSafeInteger(entry._length) &&
    entry._length > 0
  );
}

export function parseEcmwfIndex(content: string): EcmwfIndexEntry[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      let value: unknown;
      try {
        value = JSON.parse(line);
      } catch (error) {
        throw new Error(`invalid ECMWF index JSON on line ${index + 1}`, { cause: error });
      }

      if (!isIndexEntry(value)) {
        throw new Error(`invalid ECMWF index entry on line ${index + 1}`);
      }
      return value;
    });
}

export function selectEcmwfRanges(
  entries: readonly EcmwfIndexEntry[],
  selection: IndexedParameterSelection,
): ByteRange[] {
  const requested = new Set(selection.parameters);
  const selected = entries
    .filter((entry) => requested.has(entry.param) && entry.levtype === selection.levelType)
    .sort((left, right) => left._offset - right._offset);
  const found = new Set(selected.map((entry) => entry.param));
  const missing = selection.parameters.filter((parameter) => !found.has(parameter));

  if (missing.length > 0) {
    throw new Error(`ECMWF index is missing required parameters: ${missing.join(", ")}`);
  }

  return selected.map((entry) => ({
    parameter: entry.param,
    start: entry._offset,
    end: entry._offset + entry._length - 1,
  }));
}

async function fetchBytes(
  fetcher: typeof fetch,
  url: string,
  headers: Record<string, string> | undefined,
  expectedStatus?: number,
): Promise<Uint8Array> {
  const response = await fetcher(url, { headers });
  if (!response.ok || (expectedStatus !== undefined && response.status !== expectedStatus)) {
    throw new Error(`download failed (${response.status}) for ${url}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

function assertGribMessage(bytes: Uint8Array, context: string): void {
  if (
    bytes.byteLength < 4 ||
    bytes[0] !== 0x47 ||
    bytes[1] !== 0x52 ||
    bytes[2] !== 0x49 ||
    bytes[3] !== 0x42
  ) {
    throw new Error(`${context} did not return a GRIB message`);
  }
}

function concatenate(chunks: readonly Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

async function resolveEcmwfSelection(
  plan: DownloadPlan,
  fetcher: typeof fetch,
): Promise<{ bytes: Uint8Array; requestCount: number }> {
  const selection = plan.selection;
  if (!selection) {
    throw new Error("ECMWF indexed download requires a selection");
  }

  const indexResponse = await fetcher(selection.indexUrl, {
    headers: { Accept: "application/x-ndjson, application/json, text/plain" },
  });
  if (!indexResponse.ok) {
    throw new Error(`download failed (${indexResponse.status}) for ${selection.indexUrl}`);
  }

  const ranges = selectEcmwfRanges(parseEcmwfIndex(await indexResponse.text()), selection);
  const chunks: Uint8Array[] = [];
  for (const range of ranges) {
    const expectedLength = range.end - range.start + 1;
    const bytes = await fetchBytes(
      fetcher,
      plan.url,
      { ...plan.headers, Range: `bytes=${range.start}-${range.end}` },
      206,
    );
    if (bytes.byteLength !== expectedLength) {
      throw new Error(
        `ECMWF byte range for ${range.parameter} returned ${bytes.byteLength} bytes; expected ${expectedLength}`,
      );
    }
    assertGribMessage(bytes, `ECMWF parameter ${range.parameter}`);
    chunks.push(bytes);
  }

  return { bytes: concatenate(chunks), requestCount: ranges.length + 1 };
}

export async function downloadPlan(
  plan: DownloadPlan,
  options: DownloadOptions = {},
): Promise<DownloadResult> {
  const fetcher = options.fetch ?? fetch;
  const log = options.log ?? console.info;
  await mkdir(dirname(plan.targetPath), { recursive: true });

  const result = plan.selection
    ? await resolveEcmwfSelection(plan, fetcher)
    : {
        bytes: await fetchBytes(fetcher, plan.url, plan.headers),
        requestCount: 1,
      };
  assertGribMessage(result.bytes, plan.model.toUpperCase());

  const temporaryPath = `${plan.targetPath}.part-${crypto.randomUUID()}`;
  try {
    await Bun.write(temporaryPath, result.bytes);
    await rename(temporaryPath, plan.targetPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }

  log(`downloaded ${result.bytes.byteLength} bytes to ${plan.targetPath}`);
  return {
    targetPath: plan.targetPath,
    bytesWritten: result.bytes.byteLength,
    requestCount: result.requestCount,
  };
}
