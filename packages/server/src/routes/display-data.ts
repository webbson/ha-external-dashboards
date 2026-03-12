import { FastifyInstance } from "fastify";
import { db } from "../db/connection.js";
import {
  dashboards,
  dashboardLayouts,
  layouts,
  componentInstances,
  components,
  themes,
} from "../db/schema.js";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/jwt.js";
import { dashboardAuth } from "../middleware/dashboard-auth.js";

export async function displayDataRoutes(app: FastifyInstance) {
  // Serves full dashboard config to the display app
  app.get<{ Params: { slug: string } }>(
    "/api/display/:slug",
    { preHandler: dashboardAuth },
    async (req, reply) => {
      const dashboard = (req as unknown as Record<string, unknown>).dashboard as typeof dashboards.$inferSelect;

      // Resolve theme if set
      let themeData = { standardVariables: {} as Record<string, string>, globalStyles: {} as Record<string, string> };
      if (dashboard.themeId) {
        const [theme] = await db.select().from(themes).where(eq(themes.id, dashboard.themeId));
        if (theme) {
          themeData = {
            standardVariables: theme.standardVariables as Record<string, string>,
            globalStyles: theme.globalStyles as Record<string, string>,
          };
        }
      }

      // Get dashboard layouts with their layout structures
      const dls = await db
        .select()
        .from(dashboardLayouts)
        .where(eq(dashboardLayouts.dashboardId, dashboard.id));

      const dashLayoutsWithData = await Promise.all(
        dls.map(async (dl) => {
          const [layout] = await db
            .select()
            .from(layouts)
            .where(eq(layouts.id, dl.layoutId));

          const instances = await db
            .select()
            .from(componentInstances)
            .where(eq(componentInstances.dashboardLayoutId, dl.id));

          const visibilityRules = dl.visibilityRules
            ? (() => { try { return JSON.parse(dl.visibilityRules); } catch { return []; } })()
            : [];
          return {
            ...dl,
            visibilityRules,
            layout: layout
              ? { structure: layout.structure }
              : { structure: { gridTemplate: "none", regions: [] } },
            instances,
          };
        })
      );

      // Get all component definitions used
      const componentIds = new Set<number>();
      for (const dl of dashLayoutsWithData) {
        for (const inst of dl.instances) {
          componentIds.add(inst.componentId);
        }
      }

      const componentDefs: Record<number, unknown> = {};
      for (const compId of componentIds) {
        const [comp] = await db
          .select()
          .from(components)
          .where(eq(components.id, compId));
        if (comp) {
          componentDefs[compId] = comp;
        }
      }

      // Set ext_session cookie for subsequent API requests (image proxy, history, etc.)
      const sessionToken = jwt.sign(
        { dashboardId: dashboard.id, slug: dashboard.slug },
        JWT_SECRET,
        { expiresIn: "1d" }
      );
      reply.header(
        "Set-Cookie",
        `ext_session=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
      );

      return {
        dashboard: {
          id: dashboard.id,
          name: dashboard.name,
          slug: dashboard.slug,
          accessKey: dashboard.accessKey,
          accessMode: dashboard.accessMode,
          interactiveMode: dashboard.interactiveMode,
          maxWidth: dashboard.maxWidth,
          padding: dashboard.padding,
          globalStyles: themeData.globalStyles,
          standardVariables: themeData.standardVariables,
          layoutSwitchMode: dashboard.layoutSwitchMode,
          layoutRotateInterval: dashboard.layoutRotateInterval,
          blackoutEntity: dashboard.blackoutEntity,
          blackoutStartTime: dashboard.blackoutStartTime,
          blackoutEndTime: dashboard.blackoutEndTime,
        },
        layouts: dashLayoutsWithData.sort((a, b) => a.sortOrder - b.sortOrder),
        components: componentDefs,
      };
    }
  );
}
