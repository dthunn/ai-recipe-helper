import { Pool, types } from "pg";

// node-postgres returns NUMERIC as a string by default (avoids float precision
// loss), but nothing here needs that precision and callers type these columns
// as `number` — parse them at the driver level instead of at every call site.
types.setTypeParser(types.builtins.NUMERIC, (val) => parseFloat(val));

declare global {
  var pgPool: Pool | undefined;
}

export const pool =
  global.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") {
  global.pgPool = pool;
}
