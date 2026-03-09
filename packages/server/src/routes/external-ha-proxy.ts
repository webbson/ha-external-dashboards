import { FastifyInstance } from "fastify";
import { haClient } from "../ws/ha-client.js";
import { matchGlob } from "@ha-external-dashboards/shared";
import { externalApiAuth } from "../middleware/external-api-auth.js";
import { filterAllowedEntities, isEntityAllowed } from "../services/entity-access.js";

interface DashboardRecord {
  id: number;
  slug: string;
}

export async function externalHaProxyRoutes(app: FastifyInstance) {
  // /api/ha/status stays public — returns only a boolean
  app.get("/api/ha/status", async () => {
    return { connected: haClient.isConnected() };
  });

  // All other entity routes require auth + entity scoping
  app.get("/api/ha/entities", {
    preHandler: externalApiAuth,
  }, async (req) => {
    const dashboard = (req as unknown as Record<string, unknown>).dashboard as DashboardRecord;
    const allStates = haClient.getAllStates();
    const allIds = Array.from(allStates.keys());
    const allowedIds = await filterAllowedEntities(dashboard.id, allIds);

    return allowedIds.map((id) => {
      const s = allStates.get(id)!;
      return {
        entity_id: s.entity_id,
        state: s.state,
        attributes: s.attributes,
      };
    });
  });

  app.get<{ Params: { entityId: string } }>("/api/ha/entities/:entityId", {
    preHandler: externalApiAuth,
  }, async (req, reply) => {
    const dashboard = (req as unknown as Record<string, unknown>).dashboard as DashboardRecord;
    const entityId = req.params.entityId;

    const allowed = await isEntityAllowed(dashboard.id, entityId);
    if (!allowed) {
      return reply.code(403).send({ error: "Entity not accessible" });
    }

    const state = haClient.getState(entityId);
    if (!state) return reply.code(404).send({ error: "Entity not found" });
    return state;
  });

  app.get<{ Querystring: { pattern?: string } }>("/api/ha/glob-match", {
    preHandler: externalApiAuth,
  }, async (req) => {
    const dashboard = (req as unknown as Record<string, unknown>).dashboard as DashboardRecord;
    const pattern = req.query.pattern;
    if (!pattern) return { matches: [], count: 0 };

    // First match against all HA entities
    const allIds = Array.from(haClient.getAllStates().keys());
    const globMatches = matchGlob(pattern, allIds);

    // Then filter to only allowed entities
    const allowed = await filterAllowedEntities(dashboard.id, globMatches);
    return {
      matches: allowed.slice(0, 100),
      count: allowed.length,
    };
  });
}
