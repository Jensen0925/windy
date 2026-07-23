import {
  bigint,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const FORECAST_MODELS = ["gfs", "ecmwf"] as const;
export const FORECAST_RUN_STATUSES = [
  "discovered",
  "downloading",
  "processing",
  "ready",
  "failed",
] as const;
export const WEATHER_PARAMETERS = [
  "wind_10m",
  "wind_100m",
  "temperature_2m",
  "precipitation",
  "irradiance",
] as const;

export type ForecastModel = (typeof FORECAST_MODELS)[number];
export type ForecastRunStatus = (typeof FORECAST_RUN_STATUSES)[number];
export type WeatherParameter = (typeof WEATHER_PARAMETERS)[number];
export type ForecastMetadata = Record<string, unknown>;

export const forecastModel = pgEnum("forecast_model", FORECAST_MODELS);
export const runStatus = pgEnum("forecast_run_status", FORECAST_RUN_STATUSES);
export const weatherParameter = pgEnum("weather_parameter", WEATHER_PARAMETERS);

export const modelRuns = pgTable(
  "model_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    model: forecastModel("model").notNull(),
    referenceTime: timestamp("reference_time", { withTimezone: true, mode: "date" }).notNull(),
    status: runStatus("status").notNull().default("discovered"),
    sourceUrl: text("source_url").notNull(),
    gridResolution: numeric("grid_resolution", {
      precision: 5,
      scale: 3,
      mode: "number",
    }).notNull(),
    forecastStepCount: integer("forecast_step_count").notNull().default(0),
    metadata: jsonb("metadata").$type<ForecastMetadata>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("model_runs_model_reference_time_uidx").on(table.model, table.referenceTime),
    index("model_runs_status_idx").on(table.status),
    index("model_runs_reference_time_idx").on(table.referenceTime),
  ],
);

export const forecastAssets = pgTable(
  "forecast_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    modelRunId: uuid("model_run_id")
      .notNull()
      .references(() => modelRuns.id, { onDelete: "cascade" }),
    parameter: weatherParameter("parameter").notNull(),
    validTime: timestamp("valid_time", { withTimezone: true, mode: "date" }).notNull(),
    forecastHour: integer("forecast_hour").notNull(),
    objectKey: text("object_key").notNull(),
    contentType: text("content_type").notNull().default("application/x-grib2"),
    byteSize: bigint("byte_size", { mode: "bigint" }).notNull(),
    checksum: text("checksum"),
    metadata: jsonb("metadata").$type<ForecastMetadata>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("forecast_assets_run_parameter_time_uidx").on(
      table.modelRunId,
      table.parameter,
      table.validTime,
    ),
    index("forecast_assets_run_time_idx").on(table.modelRunId, table.validTime),
    index("forecast_assets_valid_time_idx").on(table.validTime),
  ],
);

export const ingestionJobs = pgTable(
  "ingestion_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    modelRunId: uuid("model_run_id").references(() => modelRuns.id, { onDelete: "cascade" }),
    source: forecastModel("source").notNull(),
    status: runStatus("status").notNull().default("discovered"),
    attempt: integer("attempt").notNull().default(0),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("ingestion_jobs_source_status_idx").on(table.source, table.status),
    index("ingestion_jobs_model_run_idx").on(table.modelRunId),
  ],
);

export type ModelRun = typeof modelRuns.$inferSelect;
export type NewModelRun = typeof modelRuns.$inferInsert;
export type ForecastAsset = typeof forecastAssets.$inferSelect;
export type NewForecastAsset = typeof forecastAssets.$inferInsert;
export type IngestionJob = typeof ingestionJobs.$inferSelect;
export type NewIngestionJob = typeof ingestionJobs.$inferInsert;
