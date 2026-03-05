import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/connection.js";
import { components } from "../db/schema.js";
import { eq } from "drizzle-orm";

const parameterDefSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(["string", "number", "boolean", "color", "select"]),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  options: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .optional(),
});

const entitySelectorDefSchema = z.object({
  name: z.string(),
  label: z.string(),
  mode: z.enum(["single", "multiple", "glob", "area", "tag"]),
  allowedDomains: z.array(z.string()).optional(),
});

const containerConfigSchema = z
  .object({
    type: z.enum(["tabs", "auto-rotate", "stack"]),
    rotateInterval: z.number().int().positive().optional(),
  })
  .nullable()
  .default(null);

const createSchema = z.object({
  name: z.string().min(1),
  template: z.string().default(""),
  styles: z.string().default(""),
  parameterDefs: z.array(parameterDefSchema).default([]),
  entitySelectorDefs: z.array(entitySelectorDefSchema).default([]),
  isContainer: z.boolean().default(false),
  containerConfig: containerConfigSchema,
  testEntityBindings: z
    .record(z.union([z.string(), z.array(z.string())]))
    .nullable()
    .default(null),
});

const updateSchema = createSchema.partial();

export async function componentRoutes(app: FastifyInstance) {
  app.get("/api/components", async () => {
    return db.select().from(components);
  });

  app.get<{ Params: { id: string } }>(
    "/api/components/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [row] = await db
        .select()
        .from(components)
        .where(eq(components.id, id));
      if (!row) return reply.code(404).send({ error: "Not found" });
      return row;
    }
  );

  app.post("/api/components", async (req, reply) => {
    const body = createSchema.parse(req.body);
    const [row] = await db.insert(components).values(body).returning();
    return reply.code(201).send(row);
  });

  app.put<{ Params: { id: string } }>(
    "/api/components/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const body = updateSchema.parse(req.body);
      const [row] = await db
        .update(components)
        .set({ ...body, updatedAt: new Date().toISOString() })
        .where(eq(components.id, id))
        .returning();
      if (!row) return reply.code(404).send({ error: "Not found" });
      return row;
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/api/components/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [row] = await db
        .delete(components)
        .where(eq(components.id, id))
        .returning();
      if (!row) return reply.code(404).send({ error: "Not found" });
      return { success: true };
    }
  );
}
