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
}

class ConnectionManager {
  private connections = new Map<WebSocket, DisplayConnection>();

  add(
    ws: WebSocket,
    dashboardId: number,
    slug: string,
    entityIds: string[],
    globPatterns: GlobPatternEntry[] = []
  ) {
    const conn: DisplayConnection = {
      ws,
      dashboardId,
      slug,
      subscribedEntities: new Set(entityIds),
      globMatchedEntities: new Map(),
      globPatterns,
    };
    this.connections.set(ws, conn);
    return conn;
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

      if (conn.subscribedEntities.has(entityId)) {
        // Re-evaluate filters for glob-matched entities
        const matchedGps = conn.globMatchedEntities.get(entityId);
        if (matchedGps && matchedGps.length > 0) {
          const remaining: GlobPatternEntry[] = [];
          for (const gp of matchedGps) {
            if (this.passesFilters(gp, stateStr, attributes)) {
              remaining.push(gp);
            } else {
              conn.ws.send(
                JSON.stringify({
                  type: "glob_expansion_remove",
                  pattern: expansionKey(gp),
                  entityId,
                })
              );
            }
          }
          if (remaining.length > 0) {
            conn.globMatchedEntities.set(entityId, remaining);
            conn.ws.send(payload);
          } else {
            // No pattern still matches — remove from subscriptions
            conn.subscribedEntities.delete(entityId);
            conn.globMatchedEntities.delete(entityId);
          }
          continue;
        }
        conn.ws.send(payload);
        continue;
      }

      // Check if any glob pattern matches this entity (dynamic discovery)
      if (conn.globPatterns.length > 0) {
        let matched = false;
        for (const gp of conn.globPatterns) {
          if (matchGlob(gp.pattern, [entityId]).length > 0) {
            if (!this.passesFilters(gp, stateStr, attributes)) continue;

            if (!matched) {
              conn.subscribedEntities.add(entityId);
              conn.ws.send(payload);
              matched = true;
            }
            this.trackGlobMatch(conn, entityId, gp);
            conn.ws.send(
              JSON.stringify({
                type: "glob_expansion_update",
                pattern: expansionKey(gp),
                entityId,
              })
            );
          }
        }
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
