import { FastifyInstance } from "fastify";
import { haClient } from "../ws/ha-client.js";

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
}
