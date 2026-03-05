import type { EntityState } from "../template/engine.js";

type MessageHandler = (msg: Record<string, unknown>) => void;

export class DisplayClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, MessageHandler[]>();
  private accessKey: string;
  private slug: string;

  constructor(slug: string, accessKey: string) {
    this.slug = slug;
    this.accessKey = accessKey;
  }

  connect() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/ws?slug=${this.slug}&accessKey=${this.accessKey}`;
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
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
      // Reconnect after 3 seconds
      setTimeout(() => this.connect(), 3000);
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

  callService(domain: string, service: string, data: Record<string, unknown>) {
    this.ws?.send(
      JSON.stringify({ type: "call_service", domain, service, data })
    );
  }

  close() {
    this.ws?.close();
    this.ws = null;
  }
}
