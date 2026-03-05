import WebSocket from "ws";

export interface HAState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

type StateChangedCallback = (entityId: string, newState: HAState) => void;

export class HAClient {
  private ws: WebSocket | null = null;
  private msgId = 0;
  private states = new Map<string, HAState>();
  private onStateChanged: StateChangedCallback | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private supervisorToken: string;
  private haUrl: string;
  private connected = false;

  constructor() {
    this.supervisorToken = process.env.SUPERVISOR_TOKEN ?? "";
    this.haUrl =
      process.env.HA_WS_URL ?? "ws://supervisor/core/websocket";
  }

  setOnStateChanged(cb: StateChangedCallback) {
    this.onStateChanged = cb;
  }

  getState(entityId: string): HAState | undefined {
    return this.states.get(entityId);
  }

  getAllStates(): Map<string, HAState> {
    return this.states;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<void> {
    if (!this.supervisorToken) {
      console.warn(
        "SUPERVISOR_TOKEN not set — HA WebSocket client disabled"
      );
      return;
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.haUrl);

      this.ws.on("open", () => {
        console.log("HA WebSocket connected");
      });

      this.ws.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        this.handleMessage(msg, resolve, reject);
      });

      this.ws.on("close", () => {
        console.log("HA WebSocket closed, reconnecting in 5s...");
        this.connected = false;
        this.scheduleReconnect();
      });

      this.ws.on("error", (err) => {
        console.error("HA WebSocket error:", err.message);
        if (!this.connected) {
          reject(err);
        }
      });
    });
  }

  private handleMessage(
    msg: Record<string, unknown>,
    resolve: () => void,
    reject: (err: Error) => void
  ) {
    switch (msg.type) {
      case "auth_required":
        this.send({
          type: "auth",
          access_token: this.supervisorToken,
        });
        break;

      case "auth_ok":
        this.connected = true;
        this.fetchStates();
        this.subscribeEvents();
        resolve();
        break;

      case "auth_invalid":
        reject(new Error("HA auth failed: " + msg.message));
        break;

      case "result":
        if (
          msg.success &&
          Array.isArray(msg.result) &&
          (msg.result as HAState[]).length > 0 &&
          "entity_id" in (msg.result as HAState[])[0]
        ) {
          for (const state of msg.result as HAState[]) {
            this.states.set(state.entity_id, state);
          }
          console.log(`Loaded ${this.states.size} entity states from HA`);
        }
        break;

      case "event":
        this.handleEvent(msg);
        break;
    }
  }

  private handleEvent(msg: Record<string, unknown>) {
    const event = msg.event as {
      event_type: string;
      data: { entity_id: string; new_state: HAState };
    };
    if (event?.event_type === "state_changed" && event.data?.new_state) {
      const { entity_id, new_state } = event.data;
      this.states.set(entity_id, new_state);
      this.onStateChanged?.(entity_id, new_state);
    }
  }

  private fetchStates() {
    this.send({ id: ++this.msgId, type: "get_states" });
  }

  private subscribeEvents() {
    this.send({
      id: ++this.msgId,
      type: "subscribe_events",
      event_type: "state_changed",
    });
  }

  async callService(
    domain: string,
    service: string,
    data: Record<string, unknown>
  ): Promise<void> {
    this.send({
      id: ++this.msgId,
      type: "call_service",
      domain,
      service,
      service_data: data,
    });
  }

  private send(msg: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((err) => {
        console.error("HA reconnect failed:", err.message);
      });
    }, 5000);
  }

  close() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }
}

export const haClient = new HAClient();
