import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/connection.js";
import { dashboards, dashboardLayouts } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { broadcastSwitchLayout } from "../ws/popup-broadcast.js";

const schema = z.object({
  dashboardSlug: z.string(),
  layoutLabel: z.string(),
  autoReturn: z.boolean().default(false),
  autoReturnDelay: z.number().int().positive().default(10),
});

export async function switchLayoutTriggerRoutes(app: FastifyInstance) {
  app.post(
    "/api/trigger/switch-layout",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 second",
        },
      },
    },
    async (req, reply) => {
      const body = schema.parse(req.body);

      const [dashboard] = await db
        .select()
        .from(dashboards)
        .where(eq(dashboards.slug, body.dashboardSlug));
      if (!dashboard) {
        return reply
          .code(404)
          .send({ error: `Dashboard '${body.dashboardSlug}' not found` });
      }

      const [dl] = await db
        .select()
        .from(dashboardLayouts)
        .where(
          and(
            eq(dashboardLayouts.dashboardId, dashboard.id),
            eq(dashboardLayouts.label, body.layoutLabel)
          )
        );
      if (!dl) {
        return reply.code(404).send({
          error: `Layout '${body.layoutLabel}' not found in dashboard '${body.dashboardSlug}'`,
        });
      }

      broadcastSwitchLayout(
        dashboard.id,
        dl.layoutId,
        body.autoReturn,
        body.autoReturnDelay
      );
      return { success: true };
    }
  );
}
