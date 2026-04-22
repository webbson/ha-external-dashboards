import { db, sqlite } from "../db/connection.js";
import { displayClients } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { reverseDns } from "../utils/client-identity.js";

/**
 * Persistent display-client tracking. Rows are keyed by a stable `identity`
 * string derived from the client's MAC (preferred) or IP (fallback). Used by
 * the admin Diagnostics page to render known clients with aliases and
 * last-seen timestamps. Connected-now state is not stored — it's computed
 * live against connectionManager.
 */

export interface ClientConnectInfo {
  identity: string;
  macAddress: string | null;
  ip: string | null;
  dashboardId: number;
  slug: string;
}

/**
 * Upsert a display_clients row on WS connect. Returns the PK of the row so
 * callers can stash it on the connection for close-time updates.
 *
 * Fires a best-effort reverse-DNS lookup if hostname is still null after
 * upsert. The promise is not awaited — the WS connection never blocks on it.
 */
export async function upsertDisplayClient(
  info: ClientConnectInfo
): Promise<number> {
  // Native SQLite UPSERT. Drizzle's onConflictDoUpdate is convenient but we
  // want to RETURNING the id, which works most reliably with raw better-sqlite3.
  const stmt = sqlite.prepare(
    `INSERT INTO display_clients (identity, mac_address, last_ip, last_dashboard_id, last_slug, last_seen_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(identity) DO UPDATE SET
       mac_address = COALESCE(excluded.mac_address, display_clients.mac_address),
       last_ip = excluded.last_ip,
       last_dashboard_id = excluded.last_dashboard_id,
       last_slug = excluded.last_slug,
       last_seen_at = excluded.last_seen_at
     RETURNING id, hostname`
  );
  const row = stmt.get(
    info.identity,
    info.macAddress,
    info.ip,
    info.dashboardId,
    info.slug
  ) as { id: number; hostname: string | null };

  // If hostname isn't set yet, try reverse-DNS in the background.
  if (!row.hostname && info.ip) {
    void reverseDns(info.ip).then((hostname) => {
      if (!hostname) return;
      db
        .update(displayClients)
        .set({ hostname })
        .where(eq(displayClients.id, row.id))
        .run();
    });
  }

  return row.id;
}

/** Stamp last_seen_at on WS close so "last seen N ago" is accurate. */
export function touchDisplayClient(rowId: number): void {
  db
    .update(displayClients)
    .set({ lastSeenAt: sql`(datetime('now'))` })
    .where(eq(displayClients.id, rowId))
    .run();
}
