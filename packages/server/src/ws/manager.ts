import { WebSocket } from "ws";

interface DisplayConnection {
  ws: WebSocket;
  dashboardId: number;
  slug: string;
  subscribedEntities: Set<string>;
}

class ConnectionManager {
  private connections = new Map<WebSocket, DisplayConnection>();

  add(ws: WebSocket, dashboardId: number, slug: string, entityIds: string[]) {
    const conn: DisplayConnection = {
      ws,
      dashboardId,
      slug,
      subscribedEntities: new Set(entityIds),
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

  sendStateUpdate(entityId: string, state: unknown) {
    const payload = JSON.stringify({
      type: "state_changed",
      entity_id: entityId,
      state,
    });
    for (const conn of this.connections.values()) {
      if (
        conn.subscribedEntities.has(entityId) &&
        conn.ws.readyState === WebSocket.OPEN
      ) {
        conn.ws.send(payload);
      }
    }
  }
}

export const connectionManager = new ConnectionManager();
