import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema";

export * from "./schema";

export interface DatabaseOptions {
  databaseUrl?: string;
  pool?: Omit<PoolConfig, "connectionString">;
}

export function createDatabase(options: DatabaseOptions | string = {}) {
  const normalizedOptions = typeof options === "string" ? { databaseUrl: options } : options;
  const databaseUrl = normalizedOptions.databaseUrl ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({
    ...normalizedOptions.pool,
    connectionString: databaseUrl,
  });

  return {
    db: drizzle({ client: pool, schema }),
    pool,
    close: () => pool.end(),
  };
}

export type DatabaseConnection = ReturnType<typeof createDatabase>;
export type Database = DatabaseConnection["db"];
