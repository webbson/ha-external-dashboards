import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/connection.js";
import { components, componentInstances, dashboardLayouts } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { broadcastReloadForDashboards } from "../ws/popup-broadcast.js";

const parameterDefSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(["string", "number", "boolean", "color", "select", "icon"]),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  options: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .optional(),
});

const entitySelectorDefSchema = z.object({
  name: z.string(),
  label: z.string(),
  mode: z.enum(["single", "multiple", "glob"]),
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

const importSchema = z.object({
  _exportMeta: z
    .object({
      version: z.number(),
      exportedAt: z.string(),
      source: z.string(),
    })
    .optional(),
  name: z.string().min(1),
  template: z.string().default(""),
  styles: z.string().default(""),
  parameterDefs: z.array(parameterDefSchema).default([]),
  entitySelectorDefs: z.array(entitySelectorDefSchema).default([]),
  isContainer: z.boolean().default(false),
  containerConfig: containerConfigSchema,
});

export async function componentRoutes(app: FastifyInstance) {
  app.get("/api/components", async () => {
    const rows = await db
      .select({
        id: components.id,
        name: components.name,
        template: components.template,
        styles: components.styles,
        parameterDefs: components.parameterDefs,
        entitySelectorDefs: components.entitySelectorDefs,
        isContainer: components.isContainer,
        containerConfig: components.containerConfig,
        testEntityBindings: components.testEntityBindings,
        isPrebuilt: components.isPrebuilt,
        createdAt: components.createdAt,
        updatedAt: components.updatedAt,
        usageCount: sql<number>`(select count(*) from "component_instances" where "component_instances"."component_id" = "components"."id")`.as("usage_count"),
      })
      .from(components);
    return rows;
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

  app.get<{ Params: { id: string } }>(
    "/api/components/:id/export",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [row] = await db
        .select()
        .from(components)
        .where(eq(components.id, id));
      if (!row) return reply.code(404).send({ error: "Not found" });

      const slug = row.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const exportData = {
        _exportMeta: {
          version: 1,
          exportedAt: new Date().toISOString(),
          source: "ha-external-dashboards",
        },
        name: row.name,
        template: row.template,
        styles: row.styles,
        parameterDefs: row.parameterDefs,
        entitySelectorDefs: row.entitySelectorDefs,
        isContainer: row.isContainer,
        containerConfig: row.containerConfig,
      };

      return reply
        .header(
          "Content-Disposition",
          `attachment; filename="${slug}.json"`
        )
        .type("application/json")
        .send(JSON.stringify(exportData, null, 2));
    }
  );

  app.post("/api/components/import", async (req, reply) => {
    const { _exportMeta, ...data } = importSchema.parse(req.body);

    // Handle name collisions
    let name = data.name;
    const existing = await db
      .select({ name: components.name })
      .from(components);
    const names = new Set(existing.map((r) => r.name));

    if (names.has(name)) {
      const base = `${name} (Imported)`;
      if (!names.has(base)) {
        name = base;
      } else {
        let i = 2;
        while (names.has(`${base} ${i}`)) i++;
        name = `${base} ${i}`;
      }
    }

    const [row] = await db
      .insert(components)
      .values({
        ...data,
        name,
        isPrebuilt: false,
        testEntityBindings: null,
      })
      .returning();
    return reply.code(201).send(row);
  });

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

      // Cascade reload to all dashboards using this component
      const affected = await db
        .selectDistinct({ dashboardId: dashboardLayouts.dashboardId })
        .from(componentInstances)
        .innerJoin(
          dashboardLayouts,
          eq(componentInstances.dashboardLayoutId, dashboardLayouts.id)
        )
        .where(eq(componentInstances.componentId, id));
      if (affected.length > 0) {
        broadcastReloadForDashboards(affected.map((r) => r.dashboardId));
      }

      return row;
    }
  );

  app.post<{ Params: { id: string } }>(
    "/api/components/:id/copy",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [source] = await db
        .select()
        .from(components)
        .where(eq(components.id, id));
      if (!source) return reply.code(404).send({ error: "Not found" });

      const [row] = await db
        .insert(components)
        .values({
          name: `${source.name} (Copy)`,
          template: source.template,
          styles: source.styles,
          parameterDefs: source.parameterDefs,
          entitySelectorDefs: source.entitySelectorDefs,
          isContainer: source.isContainer,
          containerConfig: source.containerConfig,
          testEntityBindings: source.testEntityBindings,
          isPrebuilt: false,
        })
        .returning();
      return reply.code(201).send(row);
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/api/components/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);

      // Check if component is in use
      const [usage] = await db
        .select({ count: sql<number>`count(*)` })
        .from(componentInstances)
        .where(eq(componentInstances.componentId, id));

      if (usage.count > 0) {
        return reply.code(409).send({
          error: "Component is in use and cannot be deleted",
          usageCount: usage.count,
        });
      }

      const [row] = await db
        .delete(components)
        .where(eq(components.id, id))
        .returning();
      if (!row) return reply.code(404).send({ error: "Not found" });
      return { success: true };
    }
  );
}
