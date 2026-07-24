import type { ForecastModel } from "@china-weather/weather";
import type { IngestionRequest } from "./types";

const MODEL_CYCLES: Record<ForecastModel, readonly number[]> = {
  gfs: [0, 6, 12, 18],
  ecmwf: [0, 12],
};

export function assertValidRequest(request: IngestionRequest, model: ForecastModel): void {
  if (request.model !== model) {
    throw new Error(`adapter ${model} cannot build a plan for model ${request.model}`);
  }

  if (Number.isNaN(request.referenceTime.getTime())) {
    throw new Error("referenceTime must be a valid date");
  }

  if (
    request.referenceTime.getUTCMinutes() !== 0 ||
    request.referenceTime.getUTCSeconds() !== 0 ||
    request.referenceTime.getUTCMilliseconds() !== 0 ||
    !MODEL_CYCLES[model].includes(request.referenceTime.getUTCHours())
  ) {
    throw new Error(
      `${model} referenceTime must be an exact ${MODEL_CYCLES[model]
        .map((hour) => hour.toString().padStart(2, "0"))
        .join("/")} UTC cycle`,
    );
  }

  if (!Number.isInteger(request.forecastHour) || request.forecastHour < 0) {
    throw new Error("forecastHour must be a non-negative integer");
  }

  if (request.targetDirectory.trim().length === 0) {
    throw new Error("targetDirectory must not be empty");
  }
}

export function assertSupportedForecastHour(model: ForecastModel, forecastHour: number): void {
  const maximum = model === "gfs" ? 384 : 360;
  if (forecastHour > maximum) {
    throw new Error(`${model} forecastHour must not exceed ${maximum}`);
  }

  if (model === "gfs" && forecastHour > 120 && forecastHour % 3 !== 0) {
    throw new Error("gfs forecastHour must use a 3-hour step after hour 120");
  }

  if (model === "ecmwf" && forecastHour > 144 && forecastHour % 6 !== 0) {
    throw new Error("ecmwf forecastHour must use a 6-hour step after hour 144");
  }
}
