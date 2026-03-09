import { describe, it, expect } from "vitest";
import { parseDeriveEntityCalls } from "../services/derive-parser.js";

describe("parseDeriveEntityCalls", () => {
  it("extracts deriveEntity calls inside eachEntity blocks", () => {
    const template = `
      {{#eachEntity "sensors"}}
        <div>{{deriveEntity entity_id "binary_sensor" "_status"}}</div>
      {{/eachEntity}}
    `;
    const calls = parseDeriveEntityCalls(template);
    expect(calls).toEqual([
      { selectorName: "sensors", newDomain: "binary_sensor", suffix: "_status" },
    ]);
  });

  it("extracts deriveEntity calls without suffix", () => {
    const template = `
      {{#eachEntity "devices"}}
        {{deriveEntity entity_id "switch"}}
      {{/eachEntity}}
    `;
    const calls = parseDeriveEntityCalls(template);
    expect(calls).toEqual([
      { selectorName: "devices", newDomain: "switch", suffix: "" },
    ]);
  });

  it("extracts multiple deriveEntity calls in one block", () => {
    const template = `
      {{#eachEntity "sensors"}}
        {{deriveEntity entity_id "binary_sensor" "_status"}}
        {{deriveEntity entity_id "switch" "_toggle"}}
      {{/eachEntity}}
    `;
    const calls = parseDeriveEntityCalls(template);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual({ selectorName: "sensors", newDomain: "binary_sensor", suffix: "_status" });
    expect(calls[1]).toEqual({ selectorName: "sensors", newDomain: "switch", suffix: "_toggle" });
  });

  it("extracts top-level deriveEntity calls outside eachEntity", () => {
    const template = `
      <div>{{deriveEntity mainEntity "binary_sensor" "_online"}}</div>
    `;
    const calls = parseDeriveEntityCalls(template);
    expect(calls).toEqual([
      { selectorName: "mainEntity", newDomain: "binary_sensor", suffix: "_online" },
    ]);
  });

  it("does not duplicate calls inside eachEntity when also matching top-level regex", () => {
    const template = `
      {{#eachEntity "sensors"}}
        {{deriveEntity entity_id "binary_sensor" "_status"}}
      {{/eachEntity}}
      {{deriveEntity mainSensor "switch" "_ctrl"}}
    `;
    const calls = parseDeriveEntityCalls(template);
    expect(calls).toHaveLength(2);
    expect(calls[0].selectorName).toBe("sensors");
    expect(calls[1].selectorName).toBe("mainSensor");
  });

  it("returns empty for templates without deriveEntity", () => {
    const template = `<div>{{entity.state}}</div>`;
    const calls = parseDeriveEntityCalls(template);
    expect(calls).toEqual([]);
  });

  it("handles multiple eachEntity blocks", () => {
    const template = `
      {{#eachEntity "lights"}}
        {{deriveEntity entity_id "switch" "_power"}}
      {{/eachEntity}}
      {{#eachEntity "sensors"}}
        {{deriveEntity entity_id "binary_sensor" "_battery"}}
      {{/eachEntity}}
    `;
    const calls = parseDeriveEntityCalls(template);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual({ selectorName: "lights", newDomain: "switch", suffix: "_power" });
    expect(calls[1]).toEqual({ selectorName: "sensors", newDomain: "binary_sensor", suffix: "_battery" });
  });

  it("handles eachEntity with hash parameters", () => {
    const template = `
      {{#eachEntity "sensors" domain="sensor" sortBy="state"}}
        {{deriveEntity entity_id "binary_sensor" "_alert"}}
      {{/eachEntity}}
    `;
    const calls = parseDeriveEntityCalls(template);
    expect(calls).toEqual([
      { selectorName: "sensors", newDomain: "binary_sensor", suffix: "_alert" },
    ]);
  });
});
