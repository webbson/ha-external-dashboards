import type { EntityState } from "../template/engine.js";

type MessageHandler = (msg: Record<string, unknown>) => void;

export class DisplayClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, MessageHandler[]>();
  private accessKey: string;
  private slug: string;
  private _globExpansions: Record<string, string[]> = {};
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private messageListeners = new Set<() => void>();

  constructor(slug: string, accessKey: string) {
    this.slug = slug;
    this.accessKey = accessKey;
  }

  get globExpansions(): Record<string, string[]> {
    return this._globExpansions;
  }

  /**
   * Subscribe to every incoming WS message. Used by the connection-lost
   * banner to track a heartbeat (any message keeps the link "alive").
   */
  onAnyMessage(listener: () => void): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  /**
   * Force an immediate reconnect attempt. Cancels any pending auto-reconnect
   * timer and closes the current socket so `onclose` triggers a fresh connect.
   */
  reconnect() {
    if (this.closed) return;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const ws = this.ws;
    this.ws = null;
    if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
      // onclose handler will schedule a reconnect, but we want it now
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      try {
        ws.close();
      } catch {
        // ignore
      }
    }
    this.connect();
  }

  connect() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/ws?slug=${this.slug}&accessKey=${this.accessKey}`;
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      for (const listener of this.messageListeners) {
        listener();
      }
      try {
        const msg = JSON.parse(event.data);
        const handlers = this.handlers.get(msg.type) ?? [];
        for (const handler of handlers) {
          handler(msg);
        }
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onclose = () => {
      if (this.closed) return;
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  on(type: string, handler: MessageHandler) {
    const existing = this.handlers.get(type) ?? [];
    existing.push(handler);
    this.handlers.set(type, existing);
  }

  off(type: string, handler: MessageHandler) {
    const existing = this.handlers.get(type) ?? [];
    this.handlers.set(
      type,
      existing.filter((h) => h !== handler)
    );
  }

  onStateChanged(callback: (entityId: string, state: EntityState) => void) {
    this.on("state_changed", (msg) => {
      callback(msg.entity_id as string, msg.state as EntityState);
    });
  }

  onReload(callback: () => void) {
    this.on("reload", () => callback());
  }

  onPopup(callback: (popup: Record<string, unknown>) => void) {
    this.on("popup", (msg) => callback(msg));
  }

  onGlobExpansions(callback: (expansions: Record<string, string[]>) => void) {
    this.on("glob_expansions", (msg) => {
      this._globExpansions = msg.expansions as Record<string, string[]>;
      callback(this._globExpansions);
    });
    this.on("glob_expansion_update", (msg) => {
      const pattern = msg.pattern as string;
      const entityId = msg.entityId as string;
      const existing = this._globExpansions[pattern] ?? [];
      if (!existing.includes(entityId)) {
        this._globExpansions = {
          ...this._globExpansions,
          [pattern]: [...existing, entityId],
        };
        callback(this._globExpansions);
      }
    });
    this.on("glob_expansion_remove", (msg) => {
      const pattern = msg.pattern as string;
      const entityId = msg.entityId as string;
      const existing = this._globExpansions[pattern] ?? [];
      if (existing.includes(entityId)) {
        this._globExpansions = {
          ...this._globExpansions,
          [pattern]: existing.filter((id) => id !== entityId),
        };
        callback(this._globExpansions);
      }
    });
  }

  subscribeEntities(entityIds: string[]) {
    this.ws?.send(
      JSON.stringify({ type: "subscribe_entities", entityIds })
    );
  }

  callService(domain: string, service: string, data: Record<string, unknown>) {
    this.ws?.send(
      JSON.stringify({ type: "call_service", domain, service, data })
    );
  }

  close() {
    this.closed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }
}
