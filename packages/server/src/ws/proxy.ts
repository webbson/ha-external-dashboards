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
import {
  matchGlob,
  type GlobAttributeFilter,
  type GlobStateFilter,
} from "@ha-external-dashboards/shared";
import { getEntityAccessPatterns } from "../services/entity-access.js";
import {
  computeIdentity,
  extractClientIp,
  resolveMac,
} from "../utils/client-identity.js";
import {
  touchDisplayClient,
  upsertDisplayClient,
} from "../services/display-clients.js";

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

interface GlobPatternEntry {
  pattern: string;
  instanceId: number;
  selectorName: string;
  attributeFilters?: GlobAttributeFilter[];
  stateFilters?: GlobStateFilter[];
}

function expansionKey(gp: GlobPatternEntry): string {
  return `${gp.instanceId}:${gp.selectorName}`;
}

interface GlobExpansionInfo {
  pattern: GlobPatternEntry;
  expandedIds: string[];
}

interface SubscriptionResult {
  entityIds: string[];
  globExpansions: Record<string, string[]>;
  globPatterns: GlobPatternEntry[];
  /** For tracking which entities came from filtered glob patterns */
  globExpansionInfo: GlobExpansionInfo[];
  /** Derived glob patterns for subscribe_entities validation */
  derivedGlobPatterns: string[];
}

function applyStringFilter(
  val: string,
  operator: string,
  target: string
): boolean {
  switch (operator) {
    case "eq":
      return val === target;
    case "neq":
      return val !== target;
    case "contains":
      return val.includes(target);
    case "startsWith":
      return val.startsWith(target);
    default:
      return true;
  }
}

function applyAttributeFilters(
  attributes: Record<string, unknown>,
  filters: GlobAttributeFilter[]
): boolean {
  return filters.every((f) =>
    applyStringFilter(String(attributes[f.attribute] ?? ""), f.operator, f.value)
  );
}

function applyStateFilters(
  state: string,
  filters: GlobStateFilter[]
): boolean {
  return filters.every((f) => applyStringFilter(state, f.operator, f.value));
}

async function getSubscribedEntities(
  dashboardId: number
): Promise<SubscriptionResult> {
  // Read allowed entities/globs from pre-computed entity-access table
  const accessPatterns = await getEntityAccessPatterns(dashboardId);

  const entityIds = new Set<string>(accessPatterns.entities);
  const globExpansions: Record<string, string[]> = {};
  const globPatterns: GlobPatternEntry[] = [];
  const globExpansionInfo: GlobExpansionInfo[] = [];

  // Cache glob expansions against current HA entities (no subscriptions yet)
  const allEntityIds = Array.from(haClient.getAllStates().keys());
  const allGlobs = [...accessPatterns.bindingGlobs, ...accessPatterns.derivedGlobs];
  const globExpansionCache = new Map<string, string[]>();
  for (const globPattern of allGlobs) {
    globExpansionCache.set(globPattern, matchGlob(globPattern, allEntityIds));
  }

  // Track which binding globs are referenced by component instances
  const referencedGlobs = new Set<string>();

  // Process component instances to build filtered subscriptions
  const dls = await db
    .select()
    .from(dashboardLayouts)
    .where(eq(dashboardLayouts.dashboardId, dashboardId));

  for (const dl of dls) {
    const instances = await db
      .select()
      .from(componentInstances)
      .where(eq(componentInstances.dashboardLayoutId, dl.id));

    for (const inst of instances) {
      const instanceFilters = (inst.entityFilters ?? {}) as Record<
        string,
        { attributeFilters?: GlobAttributeFilter[]; stateFilters?: GlobStateFilter[] }
      >;
      const bindings = inst.entityBindings as Record<string, string | string[]>;

      for (const [selectorName, val] of Object.entries(bindings)) {
        if (typeof val === "string" && accessPatterns.bindingGlobs.includes(val)) {
          referencedGlobs.add(val);
          const expanded = globExpansionCache.get(val) ?? [];
          const selectorFilters = instanceFilters[selectorName];
          const attrFilters = selectorFilters?.attributeFilters;
          const stFilters = selectorFilters?.stateFilters;

          if (
            (attrFilters && attrFilters.length > 0) ||
            (stFilters && stFilters.length > 0)
          ) {
            // Filtered glob: only subscribe entities passing filters
            const filtered = expanded.filter((id) => {
              const entityState = haClient.getState(id);
              if (!entityState) return false;
              if (attrFilters && attrFilters.length > 0 && !applyAttributeFilters(entityState.attributes, attrFilters)) return false;
              if (stFilters && stFilters.length > 0 && !applyStateFilters(entityState.state, stFilters)) return false;
              return true;
            });

            filtered.forEach((id) => entityIds.add(id));
            const gpEntry: GlobPatternEntry = {
              pattern: val,
              instanceId: inst.id,
              selectorName,
              attributeFilters: attrFilters,
              stateFilters: stFilters,
            };
            const key = expansionKey(gpEntry);
            globExpansions[key] = filtered;
            globPatterns.push(gpEntry);
            globExpansionInfo.push({ pattern: gpEntry, expandedIds: filtered });
          } else {
            // Unfiltered glob: subscribe all expanded entities
            expanded.forEach((id) => entityIds.add(id));
            const gpEntry: GlobPatternEntry = {
              pattern: val,
              instanceId: inst.id,
              selectorName,
            };
            const key = expansionKey(gpEntry);
            globExpansions[key] = expanded;
            globPatterns.push(gpEntry);
            globExpansionInfo.push({ pattern: gpEntry, expandedIds: expanded });
          }
        }
      }
    }
  }

  // Add unreferenced binding globs (e.g. from visibility rules or other non-instance sources)
  for (const globPattern of accessPatterns.bindingGlobs) {
    if (!referencedGlobs.has(globPattern)) {
      const expanded = globExpansionCache.get(globPattern) ?? [];
      expanded.forEach((id) => entityIds.add(id));
      const gpEntry: GlobPatternEntry = {
        pattern: globPattern,
        instanceId: 0,
        selectorName: globPattern,
      };
      globExpansions[globPattern] = expanded;
      globPatterns.push(gpEntry);
      globExpansionInfo.push({ pattern: gpEntry, expandedIds: expanded });
    }
  }

  // Derived globs: display manages subscriptions via subscribe_entities.
  // Store separately for subscribe_entities validation — not in globPatterns
  // (which would trigger glob_expansion_update in manager.ts dynamic discovery).
  const derivedGlobPatterns = accessPatterns.derivedGlobs;

  return {
    entityIds: Array.from(entityIds),
    globExpansions,
    globPatterns,
    globExpansionInfo,
    derivedGlobPatterns,
  };
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

    // Identify the client by MAC (preferred) or IP (fallback) and persist.
    // Errors here must never prevent the WS from working — identification is
    // advisory.
    const ip = extractClientIp(req);
    let identity: string | undefined;
    let clientRowId: number | undefined;
    try {
      const mac = await resolveMac(ip);
      identity = computeIdentity(mac, ip);
      clientRowId = await upsertDisplayClient({
        identity,
        macAddress: mac,
        ip,
        dashboardId: dashboard.id,
        slug,
      });
    } catch (err) {
      req.log.warn({ err }, "Failed to persist display client");
    }

    // Get subscribed entities for this dashboard
    const subscription = await getSubscribedEntities(dashboard.id);
    const conn = connectionManager.add(
      socket,
      dashboard.id,
      slug,
      subscription.entityIds,
      subscription.globPatterns,
      identity,
      clientRowId
    );

    // Track initial glob-matched entities for filter re-evaluation
    for (const info of subscription.globExpansionInfo) {
      for (const eid of info.expandedIds) {
        connectionManager.trackGlobMatch(conn, eid, info.pattern);
      }
    }

    // Send initial states for subscribed entities
    for (const entityId of subscription.entityIds) {
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

    // Send glob expansion map so display can resolve patterns to entity IDs
    if (Object.keys(subscription.globExpansions).length > 0) {
      socket.send(
        JSON.stringify({
          type: "glob_expansions",
          expansions: subscription.globExpansions,
        })
      );
    }

    // Periodic app-level heartbeat. Without this, a quiet dashboard (no HA
    // state changes for >15s) triggers the display's disconnect banner even
    // though the socket is perfectly healthy. Sending every 10s gives the
    // display a steady stream of traffic; it ignores the payload and just
    // resets its "last message" timer.
    const heartbeat = setInterval(() => {
      if (socket.readyState === socket.OPEN) {
        try {
          socket.send(JSON.stringify({ type: "heartbeat" }));
        } catch {
          // transient send error — next interval will retry, close handler cleans up
        }
      }
    }, 10_000);

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

        if (msg.type === "subscribe_entities") {
          const entityIds = msg.entityIds as string[] | undefined;
          if (!Array.isArray(entityIds)) return;

          for (const entityId of entityIds) {
            if (conn.subscribedEntities.has(entityId)) continue;

            // Allow derived glob patterns AND any valid HA entity (for inline {{state}} refs in templates)
            const matchesDerivedGlob = subscription.derivedGlobPatterns.some(
              (pattern) => matchGlob(pattern, [entityId]).length > 0
            );
            const state = haClient.getState(entityId);
            if (!matchesDerivedGlob && !state) continue;

            conn.subscribedEntities.add(entityId);

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
        }
      } catch {
        // ignore parse errors
      }
    });

    socket.on("close", () => {
      clearInterval(heartbeat);
      if (clientRowId != null) {
        try {
          touchDisplayClient(clientRowId);
        } catch (err) {
          req.log.warn({ err, clientRowId }, "Failed to stamp client last_seen_at on close");
        }
      }
      connectionManager.remove(socket);
      rateLimits.delete(socket);
    });
  });
}
