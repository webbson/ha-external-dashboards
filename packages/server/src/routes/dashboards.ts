import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/connection.js";
import { dashboards, dashboardLayouts, componentInstances } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";
import { broadcastReload } from "../ws/popup-broadcast.js";

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  accessMode: z.enum(["public", "password", "header"]).default("public"),
  password: z.string().optional(),
  headerName: z.string().optional(),
  headerValue: z.string().optional(),
  interactiveMode: z.boolean().default(false),
  maxWidth: z.string().nullable().optional(),
  padding: z.string().nullable().optional(),
  themeId: z.number().int().nullable().optional(),
  layoutSwitchMode: z.enum(["tabs", "auto-rotate"]).default("tabs"),
  layoutRotateInterval: z.number().int().positive().default(30),
});

const updateSchema = createSchema.partial();

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/api/dashboards", async () => {
    return db.select().from(dashboards);
  });

  app.get<{ Params: { id: string } }>(
    "/api/dashboards/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [row] = await db
        .select()
        .from(dashboards)
        .where(eq(dashboards.id, id));
      if (!row) return reply.code(404).send({ error: "Not found" });

      const layouts = await db
        .select()
        .from(dashboardLayouts)
        .where(eq(dashboardLayouts.dashboardId, id));

      return { ...row, layouts };
    }
  );

  app.post("/api/dashboards", async (req, reply) => {
    const body = createSchema.parse(req.body);
    let passwordHash: string | null = null;
    if (body.accessMode === "password" && body.password) {
      passwordHash = await bcrypt.hash(body.password, 10);
    }
    const [row] = await db
      .insert(dashboards)
      .values({
        name: body.name,
        slug: body.slug,
        accessKey: nanoid(32),
        accessMode: body.accessMode,
        passwordHash,
        headerName: body.headerName ?? null,
        headerValue: body.headerValue ?? null,
        interactiveMode: body.interactiveMode,
        maxWidth: body.maxWidth ?? null,
        padding: body.padding ?? null,
        themeId: body.themeId ?? null,
        layoutSwitchMode: body.layoutSwitchMode,
        layoutRotateInterval: body.layoutRotateInterval,
      })
      .returning();
    return reply.code(201).send(row);
  });

  app.put<{ Params: { id: string } }>(
    "/api/dashboards/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const body = updateSchema.parse(req.body);
      const values: Record<string, unknown> = { ...body, updatedAt: new Date().toISOString() };
      delete values.password;
      if (body.password) {
        values.passwordHash = await bcrypt.hash(body.password, 10);
      }
      const [row] = await db
        .update(dashboards)
        .set(values)
        .where(eq(dashboards.id, id))
        .returning();
      if (!row) return reply.code(404).send({ error: "Not found" });
      broadcastReload(id);
      return row;
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/api/dashboards/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [row] = await db
        .delete(dashboards)
        .where(eq(dashboards.id, id))
        .returning();
      if (!row) return reply.code(404).send({ error: "Not found" });
      return { success: true };
    }
  );

  app.post<{ Params: { id: string } }>(
    "/api/dashboards/:id/regenerate-key",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [row] = await db
        .update(dashboards)
        .set({ accessKey: nanoid(32) })
        .where(eq(dashboards.id, id))
        .returning();
      if (!row) return reply.code(404).send({ error: "Not found" });
      return { accessKey: row.accessKey };
    }
  );

  // Dashboard layout management
  app.put<{ Params: { id: string } }>(
    "/api/dashboards/:id/layouts",
    async (req, reply) => {
      const dashboardId = parseInt(req.params.id);
      const body = z
        .array(
          z.object({
            id: z.number().int().optional(),
            layoutId: z.number().int(),
            sortOrder: z.number().int(),
            label: z.string().nullable().default(null),
            icon: z.string().nullable().default(null),
          }).refine(
            (item) => item.label || item.icon,
            { message: "Each tab must have at least a label or an icon" }
          )
        )
        .parse(req.body);

      const existing = await db
        .select()
        .from(dashboardLayouts)
        .where(eq(dashboardLayouts.dashboardId, dashboardId));

      const incomingIds = new Set(body.filter((l) => l.id).map((l) => l.id!));
      const toDelete = existing.filter((e) => !incomingIds.has(e.id));

      for (const dl of toDelete) {
        await db.delete(dashboardLayouts).where(eq(dashboardLayouts.id, dl.id));
      }

      for (const l of body) {
        if (l.id && existing.some((e) => e.id === l.id)) {
          await db
            .update(dashboardLayouts)
            .set({ layoutId: l.layoutId, sortOrder: l.sortOrder, label: l.label, icon: l.icon })
            .where(eq(dashboardLayouts.id, l.id));
        } else {
          await db.insert(dashboardLayouts).values({
            dashboardId,
            layoutId: l.layoutId,
            sortOrder: l.sortOrder,
            label: l.label,
            icon: l.icon,
          });
        }
      }

      return db
        .select()
        .from(dashboardLayouts)
        .where(eq(dashboardLayouts.dashboardId, dashboardId));
    }
  );

  // Component instances for a dashboard layout
  app.get<{ Params: { dlId: string } }>(
    "/api/dashboard-layouts/:dlId/instances",
    async (req) => {
      const dlId = parseInt(req.params.dlId);
      return db
        .select()
        .from(componentInstances)
        .where(eq(componentInstances.dashboardLayoutId, dlId));
    }
  );

  app.post<{ Params: { dlId: string } }>(
    "/api/dashboard-layouts/:dlId/instances",
    async (req, reply) => {
      const dlId = parseInt(req.params.dlId);
      const body = z
        .object({
          componentId: z.number().int(),
          regionId: z.string(),
          sortOrder: z.number().int().default(0),
          parameterValues: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
          entityBindings: z.record(z.union([z.string(), z.array(z.string())])).default({}),
          visibilityRules: z
            .array(
              z.object({
                entityId: z.string(),
                attribute: z.string().optional(),
                operator: z.string(),
                value: z.string(),
              })
            )
            .default([]),
          parentInstanceId: z.number().int().nullable().default(null),
          tabLabel: z.string().nullable().default(null),
          tabIcon: z.string().nullable().default(null),
        })
        .parse(req.body);

      const [row] = await db
        .insert(componentInstances)
        .values({ dashboardLayoutId: dlId, ...body })
        .returning();
      return reply.code(201).send(row);
    }
  );

  app.put<{ Params: { instanceId: string } }>(
    "/api/instances/:instanceId",
    async (req, reply) => {
      const id = parseInt(req.params.instanceId);
      const body = z
        .object({
          componentId: z.number().int(),
          regionId: z.string(),
          sortOrder: z.number().int(),
          parameterValues: z.record(z.union([z.string(), z.number(), z.boolean()])),
          entityBindings: z.record(z.union([z.string(), z.array(z.string())])),
          visibilityRules: z.array(
            z.object({
              entityId: z.string(),
              attribute: z.string().optional(),
              operator: z.string(),
              value: z.string(),
            })
          ),
          parentInstanceId: z.number().int().nullable(),
          tabLabel: z.string().nullable(),
          tabIcon: z.string().nullable(),
        })
        .partial()
        .parse(req.body);

      const [row] = await db
        .update(componentInstances)
        .set(body)
        .where(eq(componentInstances.id, id))
        .returning();
      if (!row) return reply.code(404).send({ error: "Not found" });
      return row;
    }
  );

  app.delete<{ Params: { instanceId: string } }>(
    "/api/instances/:instanceId",
    async (req, reply) => {
      const id = parseInt(req.params.instanceId);
      // Delete children first (cascade)
      await db
        .delete(componentInstances)
        .where(eq(componentInstances.parentInstanceId, id));
      // Then delete the instance itself
      const [row] = await db
        .delete(componentInstances)
        .where(eq(componentInstances.id, id))
        .returning();
      if (!row) return reply.code(404).send({ error: "Not found" });
      return { success: true };
    }
  );
}
