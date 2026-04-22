import { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db/connection.js";
import { displayClients } from "../../db/schema.js";
import { connectionManager } from "../../ws/manager.js";

const aliasSchema = z.object({
  alias: z.string().trim().max(100).nullable(),
});

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/**
 * Admin CRUD for persisted display clients. Rows are created lazily on WS
 * connect (see services/display-clients.ts). The `connected` flag is computed
 * live by intersecting each row's identity with the in-memory connection
 * manager — it's never stored.
 */
export async function clientsRoutes(app: FastifyInstance) {
  /** GET /api/admin/clients → list known clients, newest-first */
  app.get("/api/admin/clients", async () => {
    const rows = await db
      .select()
      .from(displayClients)
      .orderBy(desc(displayClients.lastSeenAt));
    const connected = connectionManager.getConnectedIdentities();
    return rows.map((r) => ({ ...r, connected: connected.has(r.identity) }));
  });

  /** PATCH /api/admin/clients/:id → set or clear alias */
  app.patch("/api/admin/clients/:id", async (req, reply) => {
    const { id } = paramsSchema.parse(req.params);
    const { alias } = aliasSchema.parse(req.body);
    // Treat empty string as null so the UI can clear the field.
    const normalised = alias && alias.length > 0 ? alias : null;

    const result = await db
      .update(displayClients)
      .set({ alias: normalised })
      .where(eq(displayClients.id, id))
      .returning();
    if (result.length === 0) {
      return reply.code(404).send({ error: "Client not found" });
    }
    return result[0];
  });

  /** DELETE /api/admin/clients/:id → forget a client */
  app.delete("/api/admin/clients/:id", async (req, reply) => {
    const { id } = paramsSchema.parse(req.params);
    const result = await db
      .delete(displayClients)
      .where(eq(displayClients.id, id))
      .returning({ id: displayClients.id });
    if (result.length === 0) {
      return reply.code(404).send({ error: "Client not found" });
    }
    return reply.code(204).send();
  });
}
