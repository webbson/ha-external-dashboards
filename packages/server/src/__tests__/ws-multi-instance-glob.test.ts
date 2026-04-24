import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConnectionManager } from "../ws/manager.js";
import { WebSocket } from "ws";

type Msg = Record<string, unknown>;

function mockSocket(): { ws: WebSocket; sent: Msg[] } {
  const sent: Msg[] = [];
  const ws = {
    readyState: WebSocket.OPEN,
    send: vi.fn((data: string) => sent.push(JSON.parse(data))),
  } as unknown as WebSocket;
  return { ws, sent };
}

function makeState(state: string, attributes: Record<string, unknown> = {}) {
  return { state, attributes, entity_id: "", last_changed: "", last_updated: "", context: {} };
}

describe("ConnectionManager.sendStateUpdate — multi-instance glob", () => {
  let cm: ConnectionManager;

  beforeEach(() => {
    cm = new ConnectionManager();
  });

  it("migrates entity from instance A (state=on) to instance B (state=off) on state flip", () => {
    const { ws, sent } = mockSocket();
    const entityId = "binary_sensor.alice";
    const gpA = { pattern: "binary_sensor.*", instanceId: 1, selectorName: "employees", stateFilters: [{ operator: "eq" as const, value: "on" }] };
    const gpB = { pattern: "binary_sensor.*", instanceId: 2, selectorName: "employees", stateFilters: [{ operator: "eq" as const, value: "off" }] };

    const conn = cm.add(ws, 1, "test", [entityId], [gpA, gpB]);
    // Entity currently passes A's filter (state=on), tracked under A
    cm.trackGlobMatch(conn, entityId, gpA);

    // State flips to off — A's filter fails, B's filter passes
    const newState = makeState("off");
    cm.sendStateUpdate(entityId, newState, newState.attributes);

    const types = sent.map((m) => m.type);
    expect(types).toContain("glob_expansion_remove"); // A loses it
    expect(types).toContain("state_changed");          // entity still forwarded
    expect(types).toContain("glob_expansion_update");  // B gains it

    const remove = sent.find((m) => m.type === "glob_expansion_remove");
    expect(remove?.pattern).toBe("1:employees");
    expect(remove?.entityId).toBe(entityId);

    const update = sent.find((m) => m.type === "glob_expansion_update");
    expect(update?.pattern).toBe("2:employees");
    expect(update?.entityId).toBe(entityId);

    // State must be sent BEFORE expansion update
    const stateIdx = sent.findIndex((m) => m.type === "state_changed");
    const updateIdx = sent.findIndex((m) => m.type === "glob_expansion_update");
    expect(stateIdx).toBeLessThan(updateIdx);

    // Entity must remain subscribed (not lost from both)
    expect(conn.subscribedEntities.has(entityId)).toBe(true);
  });

  it("migrates entity from instance A (dept=Eng) to instance B (dept=Marketing) on attribute change", () => {
    const { ws, sent } = mockSocket();
    const entityId = "binary_sensor.bob";
    const gpA = { pattern: "binary_sensor.*", instanceId: 1, selectorName: "employees", attributeFilters: [{ attribute: "department", operator: "eq" as const, value: "Eng" }] };
    const gpB = { pattern: "binary_sensor.*", instanceId: 2, selectorName: "employees", attributeFilters: [{ attribute: "department", operator: "eq" as const, value: "Marketing" }] };

    const conn = cm.add(ws, 1, "test", [entityId], [gpA, gpB]);
    cm.trackGlobMatch(conn, entityId, gpA);

    const newState = makeState("on", { department: "Marketing" });
    cm.sendStateUpdate(entityId, newState, newState.attributes);

    const remove = sent.find((m) => m.type === "glob_expansion_remove");
    expect(remove?.pattern).toBe("1:employees");

    const update = sent.find((m) => m.type === "glob_expansion_update");
    expect(update?.pattern).toBe("2:employees");

    expect(sent.some((m) => m.type === "state_changed")).toBe(true);
    expect(conn.subscribedEntities.has(entityId)).toBe(true);
  });

  it("drops entity from sole instance when filter fails", () => {
    const { ws, sent } = mockSocket();
    const entityId = "binary_sensor.carol";
    const gp = { pattern: "binary_sensor.*", instanceId: 1, selectorName: "employees", stateFilters: [{ operator: "eq" as const, value: "on" }] };

    const conn = cm.add(ws, 1, "test", [entityId], [gp]);
    cm.trackGlobMatch(conn, entityId, gp);

    // State changes so filter fails
    const newState = makeState("off");
    cm.sendStateUpdate(entityId, newState, newState.attributes);

    expect(sent.some((m) => m.type === "glob_expansion_remove")).toBe(true);
    expect(sent.some((m) => m.type === "state_changed")).toBe(false);
    expect(sent.some((m) => m.type === "glob_expansion_update")).toBe(false);
    expect(conn.subscribedEntities.has(entityId)).toBe(false);
  });

  it("dynamically adds entity to sole instance when it newly matches filter", () => {
    const { ws, sent } = mockSocket();
    const entityId = "binary_sensor.dave";
    const gp = { pattern: "binary_sensor.*", instanceId: 1, selectorName: "employees", stateFilters: [{ operator: "eq" as const, value: "on" }] };

    // Entity not yet subscribed
    const conn = cm.add(ws, 1, "test", [], [gp]);

    const newState = makeState("on");
    cm.sendStateUpdate(entityId, newState, newState.attributes);

    expect(conn.subscribedEntities.has(entityId)).toBe(true);

    const stateIdx = sent.findIndex((m) => m.type === "state_changed");
    const updateIdx = sent.findIndex((m) => m.type === "glob_expansion_update");
    expect(stateIdx).toBeGreaterThanOrEqual(0);
    expect(updateIdx).toBeGreaterThan(stateIdx);

    const update = sent.find((m) => m.type === "glob_expansion_update");
    expect(update?.pattern).toBe("1:employees");
  });

  it("forwards state_changed without duplicate updates for unfiltered glob alongside filtered glob", () => {
    const { ws, sent } = mockSocket();
    const entityId = "binary_sensor.eve";
    const gpFiltered = { pattern: "binary_sensor.*", instanceId: 1, selectorName: "a", stateFilters: [{ operator: "eq" as const, value: "on" }] };
    const gpUnfiltered = { pattern: "binary_sensor.*", instanceId: 2, selectorName: "b" };

    const conn = cm.add(ws, 1, "test", [entityId], [gpFiltered, gpUnfiltered]);
    cm.trackGlobMatch(conn, entityId, gpFiltered);

    const newState = makeState("on");
    cm.sendStateUpdate(entityId, newState, newState.attributes);

    const stateMessages = sent.filter((m) => m.type === "state_changed");
    expect(stateMessages).toHaveLength(1); // no duplicates

    // No spurious glob_expansion_update for the unfiltered gp (entity already subscribed)
    const updates = sent.filter((m) => m.type === "glob_expansion_update");
    expect(updates).toHaveLength(0);

    expect(conn.subscribedEntities.has(entityId)).toBe(true);
  });
});
