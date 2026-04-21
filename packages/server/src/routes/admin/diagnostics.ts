import { FastifyInstance } from "fastify";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { db, DB_PATH } from "../../db/connection.js";
import {
  themes,
  layouts,
  components,
  dashboards,
  dashboardLayouts,
  componentInstances,
  assets,
  dashboardEntityAccess,
} from "../../db/schema.js";
import { haClient } from "../../ws/ha-client.js";
import { connectionManager } from "../../ws/manager.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const START_TIME = Date.now();

/** Read server version from package.json once at module load. */
function readServerVersion(): string {
  try {
    // packages/server/src/routes/admin/diagnostics.ts → packages/server/package.json
    const pkgPath = path.resolve(__dirname, "../../../package.json");
    const raw = fs.readFileSync(pkgPath, "utf8");
    return (JSON.parse(raw) as { version?: string }).version ?? "unknown";
  } catch {
    return "unknown";
  }
}

const SERVER_VERSION = readServerVersion();

async function countRows(
  table:
    | typeof themes
    | typeof layouts
    | typeof components
    | typeof dashboards
    | typeof dashboardLayouts
    | typeof componentInstances
    | typeof assets
    | typeof dashboardEntityAccess
): Promise<number> {
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(table);
  return Number(row?.count ?? 0);
}

/**
 * GET /api/admin/diagnostics
 *
 * Snapshot of runtime state for the admin UI. No heavy queries — should
 * be safe to poll every few seconds.
 */
export async function diagnosticsRoutes(app: FastifyInstance) {
  app.get("/api/admin/diagnostics", async () => {
    // HA WebSocket stats
    const haWs = {
      connected: haClient.isConnected(),
      lastReconnectAt: haClient.lastReconnectAt,
      reconnectCount: haClient.reconnectCount,
      lastMessageAt: haClient.lastMessageAt,
    };

    // Display client stats
    const displayClients = connectionManager.getDisplayClientStats();

    // DB size + table counts
    let dbSizeBytes = 0;
    try {
      dbSizeBytes = fs.statSync(DB_PATH).size;
    } catch {
      dbSizeBytes = 0;
    }
    const [
      themeCount,
      layoutCount,
      componentCount,
      dashboardCount,
      dashboardLayoutCount,
      componentInstanceCount,
      assetCount,
      entityAccessCount,
    ] = await Promise.all([
      countRows(themes),
      countRows(layouts),
      countRows(components),
      countRows(dashboards),
      countRows(dashboardLayouts),
      countRows(componentInstances),
      countRows(assets),
      countRows(dashboardEntityAccess),
    ]);

    const tableCounts: Record<string, number> = {
      themes: themeCount,
      layouts: layoutCount,
      components: componentCount,
      dashboards: dashboardCount,
      dashboard_layouts: dashboardLayoutCount,
      component_instances: componentInstanceCount,
      assets: assetCount,
      dashboard_entity_access: entityAccessCount,
    };

    // Entity stats
    const entities = {
      count: haClient.entityCount,
      lastSeenAt: haClient.lastMessageAt,
    };

    return {
      haWs,
      displayClients,
      db: {
        path: DB_PATH,
        sizeBytes: dbSizeBytes,
        tableCounts,
      },
      entities,
      uptimeMs: Date.now() - START_TIME,
      version: SERVER_VERSION,
    };
  });
}
