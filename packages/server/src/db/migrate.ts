import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./connection.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolve the drizzle migrations folder. Two layouts are supported:
 *
 * 1. **Monorepo dev** (`tsx watch` or compiled server running from
 *    `packages/server/dist/db/`): the drizzle/ folder lives at the repo
 *    root, four levels up.
 *
 * 2. **Production add-on image**: the Dockerfile places drizzle/ next
 *    to the server's dist/ at `/app/drizzle/`, so it's two levels up.
 */
function findMigrationsFolder(): string {
  const candidates = [
    path.resolve(__dirname, "../../drizzle"), // production bundle
    path.resolve(__dirname, "../../../../drizzle"), // monorepo dev
  ];
  const found = candidates.find((p) => {
    try {
      return fs.existsSync(path.join(p, "meta", "_journal.json"));
    } catch {
      return false;
    }
  });
  if (!found) {
    throw new Error(
      `Could not locate drizzle/ migrations folder. Tried: ${candidates.join(", ")}`
    );
  }
  return found;
}

export function runMigrations() {
  const migrationsFolder = findMigrationsFolder();
  migrate(db, { migrationsFolder });
  console.log("Database migrations applied successfully");
}
