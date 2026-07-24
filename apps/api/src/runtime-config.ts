const DEFAULT_WEB_ORIGIN = "http://localhost:3000";
const DEFAULT_API_PORT = 4000;

export function parseCorsOrigins(value: string | undefined): string[] {
  const origins = value
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins && origins.length > 0 ? origins : [DEFAULT_WEB_ORIGIN];
}

export function parseApiPort(value: string | undefined): number {
  if (value === undefined || value.trim() === "") {
    return DEFAULT_API_PORT;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`API_PORT must be an integer between 1 and 65535; received ${value}`);
  }
  return port;
}
