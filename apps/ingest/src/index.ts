import type { ForecastModel } from "@china-weather/weather";
import { EcmwfAdapter } from "./adapters/ecmwf";
import { GfsAdapter } from "./adapters/gfs";
import type { ForecastAdapter } from "./adapters/types";
import { downloadPlan } from "./download";

function parseArgument(arguments_: readonly string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  return arguments_.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

export function latestCycle(model: ForecastModel, now = new Date()): Date {
  if (Number.isNaN(now.getTime())) {
    throw new Error("now must be a valid date");
  }

  const delayHours = model === "ecmwf" ? 8 : 5;
  const cycleHours = model === "ecmwf" ? [0, 12] : [0, 6, 12, 18];
  const available = new Date(now.getTime() - delayHours * 60 * 60 * 1000);
  const cycle = [...cycleHours].reverse().find((hour) => hour <= available.getUTCHours()) ?? 0;
  available.setUTCHours(cycle, 0, 0, 0);
  return available;
}

function parseModel(value: string): ForecastModel {
  if (value === "gfs" || value === "ecmwf") {
    return value;
  }
  throw new Error(`unsupported model: ${value}`);
}

function parseForecastHour(value: string): number {
  const forecastHour = Number(value);
  if (!Number.isInteger(forecastHour) || forecastHour < 0) {
    throw new Error(`invalid forecast step: ${value}`);
  }
  return forecastHour;
}

export async function runCli(arguments_ = Bun.argv, now = new Date()): Promise<void> {
  const model = parseModel(parseArgument(arguments_, "model") ?? "gfs");
  const forecastHour = parseForecastHour(parseArgument(arguments_, "step") ?? "0");
  const dryRun = arguments_.includes("--dry-run") || !arguments_.includes("--download");
  const targetDirectory = process.env.WEATHER_DATA_DIR?.trim() || "data/raw";
  const adapters: Record<ForecastModel, ForecastAdapter> = {
    gfs: new GfsAdapter(),
    ecmwf: new EcmwfAdapter(),
  };
  const plan = adapters[model].buildPlan({
    model,
    referenceTime: latestCycle(model, now),
    forecastHour,
    targetDirectory,
  });

  if (dryRun) {
    console.info(JSON.stringify(plan, null, 2));
    return;
  }
  await downloadPlan(plan);
}

if (import.meta.main) {
  await runCli();
}
