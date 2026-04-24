import { WebSocket } from "ws";
import {
  matchGlob,
  type GlobAttributeFilter,
  type GlobStateFilter,
} from "@ha-external-dashboards/shared";

function applyStringFilter(val: string, operator: string, target: string): boolean {
  switch (operator) {
    case "eq": return val === target;
    case "neq": return val !== target;
    case "contains": return val.includes(target);
    case "startsWith": return val.startsWith(target);
    default: return true;
  }
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

interface DisplayConnection {
  ws: WebSocket;
  dashboardId: number;
  slug: string;
  subscribedEntities: Set<string>;
  /** Entities matched by glob patterns that have filters — these need re-evaluation on state changes */
  globMatchedEntities: Map<string, GlobPatternEntry[]>;
  globPatterns: GlobPatternEntry[];
  /** Stable identity used to correlate with the persistent display_clients row ("mac:..." or "ip:...") */
  identity?: string;
  /** PK of the matched display_clients row, if any */
  clientRowId?: number;
}

export class ConnectionManager {
  private connections = new Map<WebSocket, DisplayConnection>();

  add(
    ws: WebSocket,
    dashboardId: number,
    slug: string,
    entityIds: string[],
    globPatterns: GlobPatternEntry[] = [],
    identity?: string,
    clientRowId?: number
  ) {
    const conn: DisplayConnection = {
      ws,
      dashboardId,
      slug,
      subscribedEntities: new Set(entityIds),
      globMatchedEntities: new Map(),
      globPatterns,
      identity,
      clientRowId,
    };
    this.connections.set(ws, conn);
    return conn;
  }

  getByWs(ws: WebSocket): DisplayConnection | undefined {
    return this.connections.get(ws);
  }

  /** Identities of currently-connected display clients (OPEN sockets only) */
  getConnectedIdentities(): Set<string> {
    const ids = new Set<string>();
    for (const conn of this.connections.values()) {
      if (conn.identity && conn.ws.readyState === WebSocket.OPEN) {
        ids.add(conn.identity);
      }
    }
    return ids;
  }

  remove(ws: WebSocket) {
    this.connections.delete(ws);
  }

  getByDashboardId(dashboardId: number): DisplayConnection[] {
    return Array.from(this.connections.values()).filter(
      (c) => c.dashboardId === dashboardId
    );
  }

  getBySlug(slug: string): DisplayConnection[] {
    return Array.from(this.connections.values()).filter(
      (c) => c.slug === slug
    );
  }

  getAll(): DisplayConnection[] {
    return Array.from(this.connections.values());
  }

  /** Aggregate stats for diagnostics: total connected display clients and count per slug */
  getDisplayClientStats(): { count: number; bySlug: Record<string, number> } {
    const bySlug: Record<string, number> = {};
    let count = 0;
    for (const conn of this.connections.values()) {
      if (conn.ws.readyState === WebSocket.OPEN) {
        count++;
        bySlug[conn.slug] = (bySlug[conn.slug] ?? 0) + 1;
      }
    }
    return { count, bySlug };
  }

  broadcastToDashboard(dashboardId: number, message: unknown) {
    const payload = JSON.stringify(message);
    for (const conn of this.getByDashboardId(dashboardId)) {
      if (conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(payload);
      }
    }
  }

  broadcastToSlug(slug: string, message: unknown) {
    const payload = JSON.stringify(message);
    for (const conn of this.getBySlug(slug)) {
      if (conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(payload);
      }
    }
  }

  broadcastToAll(message: unknown) {
    const payload = JSON.stringify(message);
    for (const conn of this.connections.values()) {
      if (conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(payload);
      }
    }
  }

  /** Track an entity as matched by a filtered glob pattern */
  trackGlobMatch(conn: DisplayConnection, entityId: string, gp: GlobPatternEntry) {
    const hasFilters =
      (gp.stateFilters && gp.stateFilters.length > 0) ||
      (gp.attributeFilters && gp.attributeFilters.length > 0);
    if (hasFilters) {
      const existing = conn.globMatchedEntities.get(entityId) ?? [];
      existing.push(gp);
      conn.globMatchedEntities.set(entityId, existing);
    }
  }

  sendStateUpdate(
    entityId: string,
    state: unknown,
    attributes?: Record<string, unknown>
  ) {
    const payload = JSON.stringify({
      type: "state_changed",
      entity_id: entityId,
      state,
    });
    const stateStr = String((state as Record<string, unknown>)?.state ?? "");

    for (const conn of this.connections.values()) {
      if (conn.ws.readyState !== WebSocket.OPEN) continue;

      const wasSubscribed = conn.subscribedEntities.has(entityId);

      if (conn.globPatterns.length === 0) {
        if (wasSubscribed) conn.ws.send(payload);
        continue;
      }

      // Re-evaluate ALL glob patterns for this entity on every state event.
      // This is required for multi-instance dashboards where the same entity
      // can migrate from one instance's filter to another's on a single state change.
      const prevMatched = conn.globMatchedEntities.get(entityId) ?? [];
      let hasPatternMatch = false;
      let anyGlobMatches = false;
      const nextMatched: GlobPatternEntry[] = [];
      const expansionUpdates: string[] = [];

      for (const gp of conn.globPatterns) {
        if (matchGlob(gp.pattern, [entityId]).length === 0) continue;
        hasPatternMatch = true;

        const hasFilters =
          (gp.stateFilters && gp.stateFilters.length > 0) ||
          (gp.attributeFilters && gp.attributeFilters.length > 0);
        const passes = this.passesFilters(gp, stateStr, attributes);
        const wasTracked = prevMatched.some(
          (p) => p.instanceId === gp.instanceId && p.selectorName === gp.selectorName
        );

        if (hasFilters) {
          if (!passes && wasTracked) {
            conn.ws.send(
              JSON.stringify({
                type: "glob_expansion_remove",
                pattern: expansionKey(gp),
                entityId,
              })
            );
          } else if (passes) {
            nextMatched.push(gp);
            anyGlobMatches = true;
            if (!wasTracked) {
              expansionUpdates.push(expansionKey(gp));
            }
          }
        } else {
          // Unfiltered glob: always matches when pattern matches
          anyGlobMatches = true;
          if (!wasSubscribed) {
            expansionUpdates.push(expansionKey(gp));
          }
        }
      }

      if (nextMatched.length > 0) {
        conn.globMatchedEntities.set(entityId, nextMatched);
      } else {
        conn.globMatchedEntities.delete(entityId);
      }

      if (hasPatternMatch) {
        if (anyGlobMatches) {
          conn.subscribedEntities.add(entityId);
          conn.ws.send(payload);
          for (const key of expansionUpdates) {
            conn.ws.send(
              JSON.stringify({
                type: "glob_expansion_update",
                pattern: key,
                entityId,
              })
            );
          }
        } else if (wasSubscribed) {
          conn.subscribedEntities.delete(entityId);
        }
      } else if (wasSubscribed) {
        // Entity is here via explicit binding or derived subscribe_entities — forward as-is
        conn.ws.send(payload);
      }
    }
  }

  private passesFilters(
    gp: GlobPatternEntry,
    stateStr: string,
    attributes?: Record<string, unknown>
  ): boolean {
    if (gp.attributeFilters && gp.attributeFilters.length > 0 && attributes) {
      const passes = gp.attributeFilters.every((f) => {
        const val = String(attributes[f.attribute] ?? "");
        return applyStringFilter(val, f.operator, f.value);
      });
      if (!passes) return false;
    }
    if (gp.stateFilters && gp.stateFilters.length > 0) {
      const passes = gp.stateFilters.every((f) =>
        applyStringFilter(stateStr, f.operator, f.value)
      );
      if (!passes) return false;
    }
    return true;
  }
}

export const connectionManager = new ConnectionManager();
