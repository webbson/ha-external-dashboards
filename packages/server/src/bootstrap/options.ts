import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

/**
 * Bridge between the Home Assistant add-on options UI and the server's env
 * vars. Supervisor writes the user's options to /data/options.json on start;
 * this module copies relevant values into process.env BEFORE any other
 * module reads them (it must be imported at the very top of index.ts).
 *
 * Also handles secret persistence so a fresh install gets a stable, random
 * JWT_SECRET without the user having to set anything: a generated secret
 * is written to /data/secrets.json and reused on subsequent boots.
 *
 * Outside the add-on environment (no /data dir, normal dev), this module
 * is a no-op so existing .env-driven flows keep working unchanged.
 */

const DATA_DIR = process.env.HA_DATA_DIR ?? "/data";
const OPTIONS_PATH = path.join(DATA_DIR, "options.json");
const SECRETS_PATH = path.join(DATA_DIR, "secrets.json");

interface AddonOptions {
  jwt_secret?: string;
  mcp_api_key?: string;
  external_base_url?: string;
}

interface PersistedSecrets {
  jwt_secret?: string;
}

function readJsonSafe<T>(p: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as T;
  } catch {
    return null;
  }
}

function writeJsonSafe(p: string, value: unknown): boolean {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(value, null, 2), { mode: 0o600 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Side-effect on import: runs once at module load so values land in env
 * BEFORE downstream modules (e.g. config/jwt.ts) read them. Safe to import
 * multiple times; subsequent calls via loadAddonOptions() are no-ops when
 * env is already populated.
 */
loadAddonOptions();

export function loadAddonOptions(): void {
  // Skip entirely if /data is not present (e.g. local dev with .env).
  if (!fs.existsSync(DATA_DIR)) return;

  const opts = readJsonSafe<AddonOptions>(OPTIONS_PATH) ?? {};

  // jwt_secret: env wins → options.json → /data/secrets.json → generated.
  if (!process.env.JWT_SECRET) {
    if (opts.jwt_secret) {
      process.env.JWT_SECRET = opts.jwt_secret;
    } else {
      const persisted = readJsonSafe<PersistedSecrets>(SECRETS_PATH);
      if (persisted?.jwt_secret) {
        process.env.JWT_SECRET = persisted.jwt_secret;
      } else {
        const fresh = crypto.randomBytes(32).toString("hex");
        process.env.JWT_SECRET = fresh;
        const ok = writeJsonSafe(SECRETS_PATH, { jwt_secret: fresh });
        if (ok) {
          console.log("[bootstrap] Generated and persisted JWT_SECRET to /data/secrets.json");
        } else {
          console.warn("[bootstrap] Generated ephemeral JWT_SECRET (could not persist to /data/secrets.json)");
        }
      }
    }
  }

  // mcp_api_key: env wins → options.json. No auto-generation — the user
  // explicitly opts in to the MCP endpoint by setting a key.
  if (!process.env.MCP_API_KEY && opts.mcp_api_key) {
    process.env.MCP_API_KEY = opts.mcp_api_key;
  }

  // external_base_url: env wins → options.json. Falls back to supervisor IP
  // detection at request time in settings.ts when not set here.
  if (!process.env.EXTERNAL_BASE_URL && opts.external_base_url) {
    process.env.EXTERNAL_BASE_URL = opts.external_base_url;
  }
}
