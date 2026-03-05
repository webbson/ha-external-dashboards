import { FastifyInstance } from "fastify";
import { WebSocket } from "ws";
import { db } from "../db/connection.js";
import {
  dashboards,
  dashboardLayouts,
  componentInstances,
} from "../db/schema.js";
import { eq } from "drizzle-orm";
import { connectionManager } from "./manager.js";
import { haClient } from "./ha-client.js";

// Rate limiting for call_service
const rateLimits = new Map<WebSocket, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // per second

function checkRateLimit(ws: WebSocket): boolean {
  const now = Date.now();
  let entry = rateLimits.get(ws);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + 1000 };
    rateLimits.set(ws, entry);
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

async function getSubscribedEntities(dashboardId: number): Promise<string[]> {
  const dls = await db
    .select()
    .from(dashboardLayouts)
    .where(eq(dashboardLayouts.dashboardId, dashboardId));

  const entityIds = new Set<string>();
  for (const dl of dls) {
    const instances = await db
      .select()
      .from(componentInstances)
      .where(eq(componentInstances.dashboardLayoutId, dl.id));

    for (const inst of instances) {
      const bindings = inst.entityBindings as Record<
        string,
        string | string[]
      >;
      for (const val of Object.values(bindings)) {
        if (Array.isArray(val)) {
          val.forEach((id) => entityIds.add(id));
        } else {
          entityIds.add(val);
        }
      }
      // Also entities from visibility rules
      const rules = inst.visibilityRules as { entityId: string }[];
      for (const rule of rules) {
        entityIds.add(rule.entityId);
      }
    }
  }

  return Array.from(entityIds);
}

export async function setupWebSocketProxy(app: FastifyInstance) {
  app.get("/ws", { websocket: true }, async (socket, req) => {
    const url = new URL(req.url, "http://localhost");
    const slug = url.searchParams.get("slug");
    const accessKey = url.searchParams.get("accessKey");

    if (!slug || !accessKey) {
      socket.close(4001, "Missing slug or accessKey");
      return;
    }

    // Validate access key
    const [dashboard] = await db
      .select()
      .from(dashboards)
      .where(eq(dashboards.slug, slug));

    if (!dashboard || dashboard.accessKey !== accessKey) {
      socket.close(4003, "Invalid access key");
      return;
    }

    // Get subscribed entities for this dashboard
    const entityIds = await getSubscribedEntities(dashboard.id);
    const conn = connectionManager.add(
      socket,
      dashboard.id,
      slug,
      entityIds
    );

    // Send initial states for subscribed entities
    for (const entityId of entityIds) {
      const state = haClient.getState(entityId);
      if (state) {
        socket.send(
          JSON.stringify({
            type: "state_changed",
            entity_id: entityId,
            state,
          })
        );
      }
    }

    // Handle incoming messages (call_service for interactive mode)
    socket.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === "call_service") {
          // Verify interactive mode
          if (!dashboard.interactiveMode) {
            socket.send(
              JSON.stringify({
                type: "error",
                message: "Interactive mode disabled",
              })
            );
            return;
          }

          // Rate limit
          if (!checkRateLimit(socket)) {
            socket.send(
              JSON.stringify({ type: "error", message: "Rate limited" })
            );
            return;
          }

          // Validate entity access
          const targetEntity = msg.data?.entity_id as string | undefined;
          if (targetEntity && !conn.subscribedEntities.has(targetEntity)) {
            socket.send(
              JSON.stringify({
                type: "error",
                message: "Entity not accessible",
              })
            );
            return;
          }

          await haClient.callService(msg.domain, msg.service, msg.data ?? {});
        }
      } catch {
        // ignore parse errors
      }
    });

    socket.on("close", () => {
      connectionManager.remove(socket);
      rateLimits.delete(socket);
    });
  });
}
