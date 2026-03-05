import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/connection.js";
import { popups } from "../db/schema.js";
import { eq } from "drizzle-orm";

const contentSchema = z.object({
  type: z.enum(["text", "image", "video"]),
  body: z.string().optional(),
  mediaUrl: z.string().optional(),
});

const createSchema = z.object({
  name: z.string().min(1),
  content: contentSchema,
  timeout: z.number().int().positive().default(10),
  targetDashboardIds: z.array(z.number().int()).default([]),
});

const updateSchema = createSchema.partial();

export async function popupRoutes(app: FastifyInstance) {
  app.get("/api/popups", async () => {
    return db.select().from(popups);
  });

  app.get<{ Params: { id: string } }>(
    "/api/popups/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [row] = await db
        .select()
        .from(popups)
        .where(eq(popups.id, id));
      if (!row) return reply.code(404).send({ error: "Not found" });
      return row;
    }
  );

  app.post("/api/popups", async (req, reply) => {
    const body = createSchema.parse(req.body);
    const [row] = await db.insert(popups).values(body).returning();
    return reply.code(201).send(row);
  });

  app.put<{ Params: { id: string } }>(
    "/api/popups/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const body = updateSchema.parse(req.body);
      const [row] = await db
        .update(popups)
        .set({ ...body, updatedAt: new Date().toISOString() })
        .where(eq(popups.id, id))
        .returning();
      if (!row) return reply.code(404).send({ error: "Not found" });
      return row;
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/api/popups/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [row] = await db
        .delete(popups)
        .where(eq(popups.id, id))
        .returning();
      if (!row) return reply.code(404).send({ error: "Not found" });
      return { success: true };
    }
  );
}
