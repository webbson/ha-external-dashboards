import { FastifyInstance } from "fastify";
import { db } from "../../db/connection.js";
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

/**
 * GET /api/admin/backup
 *
 * Returns a JSON snapshot of all user-data tables. Streams the file
 * back with a Content-Disposition header so browsers save it directly.
 */
export async function backupRoutes(app: FastifyInstance) {
  app.get("/api/admin/backup", async (_req, reply) => {
    const [
      themeRows,
      layoutRows,
      componentRows,
      dashboardRows,
      dashboardLayoutRows,
      componentInstanceRows,
      assetRows,
      entityAccessRows,
    ] = await Promise.all([
      db.select().from(themes),
      db.select().from(layouts),
      db.select().from(components),
      db.select().from(dashboards),
      db.select().from(dashboardLayouts),
      db.select().from(componentInstances),
      db.select().from(assets),
      db.select().from(dashboardEntityAccess),
    ]);

    const exportedAt = new Date().toISOString();
    const body = {
      version: 1 as const,
      exportedAt,
      tables: {
        themes: themeRows,
        layouts: layoutRows,
        components: componentRows,
        dashboards: dashboardRows,
        dashboard_layouts: dashboardLayoutRows,
        component_instances: componentInstanceRows,
        assets: assetRows,
        dashboard_entity_access: entityAccessRows,
      },
    };

    const filename = `ha-external-dashboards-backup-${exportedAt}.json`;
    reply.header("Content-Type", "application/json");
    reply.header(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    return body;
  });
}
