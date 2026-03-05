import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/connection.js";
import { layouts } from "../db/schema.js";
import { eq } from "drizzle-orm";

const regionSchema = z.object({
  id: z.string(),
  label: z.string(),
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
    return db.select().from(layouts);
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
      return row;
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/api/layouts/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [row] = await db
        .delete(layouts)
        .where(eq(layouts.id, id))
        .returning();
      if (!row) return reply.code(404).send({ error: "Not found" });
      return { success: true };
    }
  );
}
