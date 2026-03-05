import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/connection.js";
import { themes, dashboards } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { broadcastReloadForDashboards } from "../ws/popup-broadcast.js";

const createSchema = z.object({
  name: z.string().min(1),
  standardVariables: z.record(z.string()).default({}),
  globalStyles: z.record(z.string()).default({}),
});

const updateSchema = createSchema.partial();

export async function themeRoutes(app: FastifyInstance) {
  app.get("/api/themes", async () => {
    const rows = await db
      .select({
        id: themes.id,
        name: themes.name,
        standardVariables: themes.standardVariables,
        globalStyles: themes.globalStyles,
        createdAt: themes.createdAt,
        updatedAt: themes.updatedAt,
        usageCount: sql<number>`(select count(*) from dashboards where dashboards.theme_id = ${themes.id})`.as("usage_count"),
      })
      .from(themes);
    return rows;
  });

  app.get<{ Params: { id: string } }>(
    "/api/themes/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [row] = await db
        .select()
        .from(themes)
        .where(eq(themes.id, id));
      if (!row) return reply.code(404).send({ error: "Not found" });
      return row;
    }
  );

  app.post("/api/themes", async (req, reply) => {
    const body = createSchema.parse(req.body);
    const [row] = await db.insert(themes).values(body).returning();
    return reply.code(201).send(row);
  });

  app.put<{ Params: { id: string } }>(
    "/api/themes/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const body = updateSchema.parse(req.body);
      const [row] = await db
        .update(themes)
        .set({ ...body, updatedAt: new Date().toISOString() })
        .where(eq(themes.id, id))
        .returning();
      if (!row) return reply.code(404).send({ error: "Not found" });

      // Cascade reload to all dashboards using this theme
      const affected = await db
        .select({ id: dashboards.id })
        .from(dashboards)
        .where(eq(dashboards.themeId, id));
      if (affected.length > 0) {
        broadcastReloadForDashboards(affected.map((d) => d.id));
      }

      return row;
    }
  );

  app.post<{ Params: { id: string } }>(
    "/api/themes/:id/copy",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [source] = await db
        .select()
        .from(themes)
        .where(eq(themes.id, id));
      if (!source) return reply.code(404).send({ error: "Not found" });

      const [row] = await db
        .insert(themes)
        .values({
          name: `Copy of ${source.name}`,
          standardVariables: source.standardVariables,
          globalStyles: source.globalStyles,
        })
        .returning();
      return reply.code(201).send(row);
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/api/themes/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);

      // Check if any dashboards reference this theme
      const [usage] = await db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(dashboards)
        .where(eq(dashboards.themeId, id));

      if (usage.count > 0) {
        return reply.code(409).send({
          error: "Theme is in use by dashboards and cannot be deleted",
          usageCount: usage.count,
        });
      }

      const [row] = await db
        .delete(themes)
        .where(eq(themes.id, id))
        .returning();
      if (!row) return reply.code(404).send({ error: "Not found" });
      return { success: true };
    }
  );
}
