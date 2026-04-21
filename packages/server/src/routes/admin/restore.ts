import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, sqlite } from "../../db/connection.js";
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
import { recomputeAllEntityAccess } from "../../services/entity-access.js";

const restoreSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().optional(),
  tables: z.object({
    themes: z.array(z.record(z.unknown())).default([]),
    layouts: z.array(z.record(z.unknown())).default([]),
    components: z.array(z.record(z.unknown())).default([]),
    dashboards: z.array(z.record(z.unknown())).default([]),
    dashboard_layouts: z.array(z.record(z.unknown())).default([]),
    component_instances: z.array(z.record(z.unknown())).default([]),
    assets: z.array(z.record(z.unknown())).default([]),
    dashboard_entity_access: z.array(z.record(z.unknown())).default([]),
  }),
});

/**
 * POST /api/admin/restore
 *
 * Replaces the entire user-data set with the backup payload. Wraps
 * truncate + re-insert in a single better-sqlite3 transaction so the
 * DB never ends up half-restored on error. After restore, recomputes
 * dashboard_entity_access to guarantee consistency.
 *
 * Rate-limited to 1/min per IP.
 */
export async function restoreRoutes(app: FastifyInstance) {
  app.post(
    "/api/admin/restore",
    {
      config: {
        rateLimit: {
          max: 1,
          timeWindow: "1 minute",
        },
      },
    },
    async (req, reply) => {
      const parsed = restoreSchema.parse(req.body);
      const t = parsed.tables;

      // Single transaction (better-sqlite3 via Drizzle is sync inside)
      const run = sqlite.transaction(() => {
        // Delete in FK-safe order (leaf → root)
        db.delete(componentInstances).run();
        db.delete(dashboardLayouts).run();
        db.delete(dashboardEntityAccess).run();
        db.delete(dashboards).run();
        db.delete(layouts).run();
        db.delete(components).run();
        db.delete(themes).run();
        db.delete(assets).run();

        // Re-insert in reverse order (root → leaf)
        if (t.themes.length > 0) {
          db.insert(themes)
            .values(t.themes as (typeof themes.$inferInsert)[])
            .run();
        }
        if (t.layouts.length > 0) {
          db.insert(layouts)
            .values(t.layouts as (typeof layouts.$inferInsert)[])
            .run();
        }
        if (t.components.length > 0) {
          db.insert(components)
            .values(t.components as (typeof components.$inferInsert)[])
            .run();
        }
        if (t.dashboards.length > 0) {
          db.insert(dashboards)
            .values(t.dashboards as (typeof dashboards.$inferInsert)[])
            .run();
        }
        if (t.dashboard_layouts.length > 0) {
          db.insert(dashboardLayouts)
            .values(t.dashboard_layouts as (typeof dashboardLayouts.$inferInsert)[])
            .run();
        }
        if (t.component_instances.length > 0) {
          db.insert(componentInstances)
            .values(t.component_instances as (typeof componentInstances.$inferInsert)[])
            .run();
        }
        if (t.assets.length > 0) {
          db.insert(assets)
            .values(t.assets as (typeof assets.$inferInsert)[])
            .run();
        }
        // dashboard_entity_access is recomputed after the transaction
      });

      try {
        run();
      } catch (err) {
        req.log.error({ err }, "Restore transaction failed");
        return reply.code(500).send({
          error: "Restore failed",
          message: err instanceof Error ? err.message : String(err),
        });
      }

      // Recompute entity access outside the transaction (uses async Drizzle ops)
      await recomputeAllEntityAccess();

      return {
        ok: true,
        stats: {
          themes: t.themes.length,
          layouts: t.layouts.length,
          components: t.components.length,
          dashboards: t.dashboards.length,
          dashboard_layouts: t.dashboard_layouts.length,
          component_instances: t.component_instances.length,
          assets: t.assets.length,
        },
      };
    }
  );
}
