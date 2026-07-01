import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../../drizzle/schema.js";
import { ENV } from "./env.js";

const pool = new pg.Pool({
  connectionString: ENV.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected pool error:", err);
});

export const db = drizzle(pool, { schema });

export async function checkDbConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    console.log("[DB] PostgreSQL connected successfully");
    return true;
  } catch (err) {
    console.error("[DB] Connection failed:", err);
    return false;
  }
}
