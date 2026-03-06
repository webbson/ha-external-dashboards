import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/connection.js";
import { layouts, dashboardLayouts } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { broadcastReloadForDashboards } from "../ws/popup-broadcast.js";

const regionSchema = z.object({
  id: z.string(),
  applyChromeTo: z.enum(["components", "region"]).optional(),
  flexDirection: z.enum(["column", "row"]).optional(),
  justifyContent: z.enum(["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"]).optional(),
  alignItems: z.enum(["stretch", "flex-start", "center", "flex-end"]).optional(),
  flexGrow: z.boolean().optional(),
});

const structureSchema = z.object({
  gridTemplate: z.string(),
  regions: z.array(regionSchema),
});

const createSchema = z.object({
  name: z.string().min(1),
  structure: structureSchema,
});

const updateSchema = createSchema.partial();

export async function layoutRoutes(app: FastifyInstance) {
  app.get("/api/layouts", async () => {
    const rows = await db
      .select({
        id: layouts.id,
        name: layouts.name,
        structure: layouts.structure,
        createdAt: layouts.createdAt,
        updatedAt: layouts.updatedAt,
        usageCount: sql<number>`(select count(*) from "dashboard_layouts" where "dashboard_layouts"."layout_id" = "layouts"."id")`.as("usage_count"),
      })
      .from(layouts);
    return rows;
  });

  app.get<{ Params: { id: string } }>(
    "/api/layouts/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [row] = await db
        .select()
        .from(layouts)
        .where(eq(layouts.id, id));
      if (!row) return reply.code(404).send({ error: "Not found" });
      return row;
    }
  );

  app.post("/api/layouts", async (req, reply) => {
    const body = createSchema.parse(req.body);
    const [row] = await db.insert(layouts).values(body).returning();
    return reply.code(201).send(row);
  });

  app.put<{ Params: { id: string } }>(
    "/api/layouts/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const body = updateSchema.parse(req.body);
      const [row] = await db
        .update(layouts)
        .set({ ...body, updatedAt: new Date().toISOString() })
        .where(eq(layouts.id, id))
        .returning();
      if (!row) return reply.code(404).send({ error: "Not found" });

      // Cascade reload to all dashboards using this layout
      const affected = await db
        .selectDistinct({ dashboardId: dashboardLayouts.dashboardId })
        .from(dashboardLayouts)
        .where(eq(dashboardLayouts.layoutId, id));
      if (affected.length > 0) {
        broadcastReloadForDashboards(affected.map((r) => r.dashboardId));
      }

      return row;
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/api/layouts/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);

      // Check if layout is in use
      const [usage] = await db
        .select({ count: sql<number>`count(*)` })
        .from(dashboardLayouts)
        .where(eq(dashboardLayouts.layoutId, id));

      if (usage.count > 0) {
        return reply.code(409).send({
          error: "Layout is in use by dashboards and cannot be deleted",
          usageCount: usage.count,
        });
      }

      const [row] = await db
        .delete(layouts)
        .where(eq(layouts.id, id))
        .returning();
      if (!row) return reply.code(404).send({ error: "Not found" });
      return { success: true };
    }
  );
}
