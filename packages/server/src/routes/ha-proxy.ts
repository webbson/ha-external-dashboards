import { FastifyInstance } from "fastify";
import { z } from "zod";
import { haClient } from "../ws/ha-client.js";
import { matchGlob } from "@ha-external-dashboards/shared";
import { externalApiAuth } from "../middleware/external-api-auth.js";
import { isEntityAllowed } from "../services/entity-access.js";

const HA_HTTP_BASE =
  (process.env.HA_WS_URL ?? "ws://supervisor/core/websocket")
    .replace(/^ws(s?):/, "http$1:")
    .replace(/\/websocket$/, "")
    .replace(/\/api$/, "");

interface ProxyOptions {
  isExternal?: boolean;
}

export async function haImageProxyRoutes(app: FastifyInstance, opts?: ProxyOptions) {
  const preHandler = opts?.isExternal ? externalApiAuth : undefined;

  async function proxyToHA(req: { url: string }, reply: import("fastify").FastifyReply) {
    const token = process.env.SUPERVISOR_TOKEN;
    if (!token) return reply.code(503).send({ error: "HA not configured" });

    const url = `${HA_HTTP_BASE}${req.url}`;
    try {
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) return reply.code(resp.status).send({ error: "HA proxy error" });

      const contentType = resp.headers.get("content-type");
      if (contentType) reply.header("content-type", contentType);
      reply.header("cache-control", "public, max-age=60");
      return reply.send(Buffer.from(await resp.arrayBuffer()));
    } catch {
      return reply.code(502).send({ error: "Failed to fetch from HA" });
    }
  }

  const routeOpts = preHandler ? { preHandler } : {};
  app.get("/api/image_proxy/*", routeOpts, proxyToHA);
  app.get("/api/camera_proxy/*", routeOpts, proxyToHA);
}

const historyQuerySchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
});

export async function haHistoryProxyRoutes(app: FastifyInstance, opts?: ProxyOptions) {
  const preHandler = opts?.isExternal ? externalApiAuth : undefined;

  app.get<{ Params: { entityIds: string }; Querystring: { start?: string; end?: string } }>(
    "/api/history/:entityIds",
    preHandler ? { preHandler } : {},
    async (req, reply) => {
      const token = process.env.SUPERVISOR_TOKEN;
      if (!token) return reply.code(503).send({ error: "HA not configured" });

      const entityIds = req.params.entityIds.split(",").map((id) => id.trim()).filter(Boolean);
      if (entityIds.length === 0 || entityIds.length > 10) {
        return reply.code(400).send({ error: "Provide 1-10 comma-separated entity IDs" });
      }
      if (!entityIds.every((id) => /^[a-z_]+\.[a-z0-9_]+$/.test(id))) {
        return reply.code(400).send({ error: "Invalid entity ID format" });
      }

      // Entity filtering for external server
      if (opts?.isExternal) {
        const dashboard = (req as unknown as Record<string, unknown>).dashboard as { id: number };
        for (const entityId of entityIds) {
          const allowed = await isEntityAllowed(dashboard.id, entityId);
          if (!allowed) {
            return reply.code(403).send({ error: `Entity not accessible: ${entityId}` });
          }
        }
      }

      const query = historyQuerySchema.safeParse(req.query);
      if (!query.success) return reply.code(400).send({ error: "Invalid query parameters" });

      const now = new Date();
      const start = query.data.start ?? new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const end = query.data.end ?? now.toISOString();

      const url = `${HA_HTTP_BASE}/api/history/period/${start}?filter_entity_id=${entityIds.join(",")}&end_time=${end}`;
      try {
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) return reply.code(resp.status).send({ error: "HA history error" });

        reply.header("content-type", "application/json");
        reply.header("cache-control", "public, max-age=30");
        return reply.send(Buffer.from(await resp.arrayBuffer()));
      } catch {
        return reply.code(502).send({ error: "Failed to fetch history from HA" });
      }
    }
  );
}

export async function haProxyRoutes(app: FastifyInstance) {
  app.get("/api/ha/entities", async () => {
    const states = haClient.getAllStates();
    return Array.from(states.values()).map((s) => ({
      entity_id: s.entity_id,
      state: s.state,
      attributes: s.attributes,
    }));
  });

  app.get<{ Params: { entityId: string } }>(
    "/api/ha/entities/:entityId",
    async (req, reply) => {
      const state = haClient.getState(req.params.entityId);
      if (!state) return reply.code(404).send({ error: "Entity not found" });
      return state;
    }
  );

  app.get("/api/ha/status", async () => {
    return { connected: haClient.isConnected() };
  });

  app.get<{ Querystring: { pattern?: string } }>(
    "/api/ha/glob-match",
    async (req) => {
      const pattern = req.query.pattern;
      if (!pattern) return { matches: [], count: 0 };
      const allIds = Array.from(haClient.getAllStates().keys());
      const matches = matchGlob(pattern, allIds);
      return {
        matches: matches.slice(0, 100),
        count: matches.length,
      };
    }
  );
}
