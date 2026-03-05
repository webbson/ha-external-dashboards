import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./connection.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function runMigrations() {
  const migrationsFolder = path.resolve(__dirname, "../../../../drizzle");
  migrate(db, { migrationsFolder });
  console.log("Database migrations applied successfully");
}
