import { FastifyInstance } from "fastify";
import { haClient } from "../ws/ha-client.js";
import { matchGlob } from "@ha-external-dashboards/shared";

const HA_HTTP_BASE =
  (process.env.HA_WS_URL ?? "ws://supervisor/core/websocket")
    .replace(/^ws(s?):/, "http$1:")
    .replace(/\/websocket$/, "")
    .replace(/\/api$/, "");

export async function haImageProxyRoutes(app: FastifyInstance) {
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

  app.get("/api/image_proxy/*", proxyToHA);
  app.get("/api/camera_proxy/*", proxyToHA);
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
