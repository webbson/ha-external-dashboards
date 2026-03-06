import { db } from "../db/connection.js";
import { components } from "../db/schema.js";
import { eq } from "drizzle-orm";

interface PrebuiltComponent {
  name: string;
  template: string;
  styles: string;
  parameterDefs: {
    name: string;
    label: string;
    type: string;
    default?: string | number | boolean;
    options?: { label: string; value: string }[];
  }[];
  entitySelectorDefs: {
    name: string;
    label: string;
    mode: string;
    allowedDomains?: string[];
  }[];
  isContainer: boolean;
  containerConfig: { type: "tabs" | "auto-rotate" | "stack"; rotateInterval?: number } | null;
}

const prebuiltComponents: PrebuiltComponent[] = [
  {
    name: "Clock",
    template: `<div class="clock">
  <div class="clock-time" id="clock-time"></div>
  <div class="clock-date" id="clock-date"></div>
</div>
<script>
(function tick() {
  const now = new Date();
  const el = document.getElementById('clock-time');
  const dl = document.getElementById('clock-date');
  if (el) el.textContent = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  if (dl) dl.textContent = now.toLocaleDateString([], {weekday:'long', month:'long', day:'numeric'});
  setTimeout(tick, 1000);
})();
</script>`,
    styles: `.clock { text-align: center; padding: 20px; }
.clock-time { font-size: 4em; font-weight: 200; color: var(--db-font-color, #fff); }
.clock-date { font-size: 1.2em; color: var(--db-font-color-secondary, #aaa); margin-top: 8px; }`,
    parameterDefs: [],
    entitySelectorDefs: [],
    isContainer: false,
    containerConfig: null,
  },
  {
    name: "Entity Value",
    template: `<div class="entity-value">
  <div class="entity-label">{{param "label"}}</div>
  <div class="entity-state">{{state (param "entity")}}{{#if (param "unit")}} <span class="unit">{{param "unit"}}</span>{{/if}}</div>
</div>`,
    styles: `.entity-value { padding: 16px; text-align: center; }
.entity-label { font-size: 0.9em; color: var(--db-font-color-secondary, #aaa); margin-bottom: 4px; }
.entity-state { font-size: 2.5em; font-weight: 300; color: var(--db-font-color, #fff); }
.unit { font-size: 0.4em; color: var(--db-font-color-secondary, #aaa); }`,
    parameterDefs: [
      { name: "label", label: "Label", type: "string", default: "Sensor" },
      { name: "unit", label: "Unit", type: "string", default: "" },
    ],
    entitySelectorDefs: [
      { name: "entity", label: "Entity", mode: "single" },
    ],
    isContainer: false,
    containerConfig: null,
  },
  {
    name: "Weather Card",
    template: `<div class="weather-card">
  <div class="weather-main">
    <div class="weather-temp">{{state (param "entity")}}°</div>
    <div class="weather-condition">{{attr (param "entity") "friendly_name"}}</div>
  </div>
  <div class="weather-details">
    <div class="weather-detail">
      <span class="detail-label">Humidity</span>
      <span class="detail-value">{{attr (param "entity") "humidity"}}%</span>
    </div>
    <div class="weather-detail">
      <span class="detail-label">Wind</span>
      <span class="detail-value">{{attr (param "entity") "wind_speed"}} km/h</span>
    </div>
  </div>
</div>`,
    styles: `.weather-card { padding: 20px; }
.weather-main { text-align: center; margin-bottom: 16px; }
.weather-temp { font-size: 3.5em; font-weight: 200; color: var(--db-font-color, #fff); }
.weather-condition { color: var(--db-font-color-secondary, #aaa); }
.weather-details { display: flex; justify-content: space-around; }
.weather-detail { text-align: center; }
.detail-label { display: block; font-size: 0.8em; color: var(--db-font-color-secondary, #aaa); }
.detail-value { font-size: 1.2em; color: var(--db-font-color, #fff); }`,
    parameterDefs: [],
    entitySelectorDefs: [
      { name: "entity", label: "Weather Entity", mode: "single", allowedDomains: ["weather"] },
    ],
    isContainer: false,
    containerConfig: null,
  },
  {
    name: "Media Player",
    template: `<div class="media-player">
  <div class="media-title">{{attr (param "entity") "media_title"}}</div>
  <div class="media-artist">{{attr (param "entity") "media_artist"}}</div>
  <div class="media-state">{{state (param "entity")}}</div>
</div>`,
    styles: `.media-player { padding: 16px; }
.media-title { font-size: 1.3em; font-weight: 500; color: var(--db-font-color, #fff); }
.media-artist { color: var(--db-font-color-secondary, #aaa); margin-top: 4px; }
.media-state { margin-top: 8px; font-size: 0.85em; color: var(--db-accent-color, #4fc3f7); text-transform: capitalize; }`,
    parameterDefs: [],
    entitySelectorDefs: [
      { name: "entity", label: "Media Player Entity", mode: "single", allowedDomains: ["media_player"] },
    ],
    isContainer: false,
    containerConfig: null,
  },
  {
    name: "Entity List",
    template: `<div class="entity-list">
  {{#if (param "title")}}<div class="entity-list-title">{{param "title"}}</div>{{/if}}
  {{#eachEntity "entities"}}
  <div class="entity-list-row">
    {{#if (param "showIcon")}}<div class="entity-list-icon">{{mdiIcon (iconFor this.domain) size="20"}}</div>{{/if}}
    {{#if (param "showFriendlyName")}}<div class="entity-list-name">{{this.attributes.friendly_name}}</div>{{/if}}
    <div class="entity-list-spacer"></div>
    {{#if (param "showState")}}<div class="entity-list-state">{{this.state}}{{#if (param "showUnit")}} {{this.attributes.unit_of_measurement}}{{/if}}</div>{{/if}}
    {{#if (param "showLastChanged")}}<div class="entity-list-time">{{relativeTime this.last_changed}}</div>{{/if}}
  </div>
  {{/eachEntity}}
  {{#eachEntity "entityPattern"}}
  <div class="entity-list-row">
    {{#if (param "showIcon")}}<div class="entity-list-icon">{{mdiIcon (iconFor this.domain) size="20"}}</div>{{/if}}
    {{#if (param "showFriendlyName")}}<div class="entity-list-name">{{this.attributes.friendly_name}}</div>{{/if}}
    <div class="entity-list-spacer"></div>
    {{#if (param "showState")}}<div class="entity-list-state">{{this.state}}{{#if (param "showUnit")}} {{this.attributes.unit_of_measurement}}{{/if}}</div>{{/if}}
    {{#if (param "showLastChanged")}}<div class="entity-list-time">{{relativeTime this.last_changed}}</div>{{/if}}
  </div>
  {{/eachEntity}}
</div>`,
    styles: `.entity-list { padding: 8px 0; }
.entity-list-title { font-size: 1.1em; font-weight: 500; color: var(--db-font-color, #fff); padding: 4px 12px 12px; }
.entity-list-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.entity-list-row:last-child { border-bottom: none; }
.entity-list-icon { color: var(--db-accent-color, #4fc3f7); display: flex; align-items: center; }
.entity-list-name { font-size: 0.9em; color: var(--db-font-color, #fff); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.entity-list-spacer { flex: 1; }
.entity-list-state { font-size: 0.9em; color: var(--db-font-color, #fff); font-weight: 500; white-space: nowrap; }
.entity-list-time { font-size: 0.75em; color: var(--db-font-color-secondary, #aaa); white-space: nowrap; }`,
    parameterDefs: [
      { name: "title", label: "Title", type: "string", default: "" },
      { name: "showIcon", label: "Show Icon", type: "boolean", default: true },
      { name: "showFriendlyName", label: "Show Name", type: "boolean", default: true },
      { name: "showState", label: "Show State", type: "boolean", default: true },
      { name: "showUnit", label: "Show Unit", type: "boolean", default: true },
      { name: "showLastChanged", label: "Show Last Changed", type: "boolean", default: false },
    ],
    entitySelectorDefs: [
      { name: "entities", label: "Entities", mode: "multiple" },
      { name: "entityPattern", label: "Entity Pattern", mode: "glob" },
    ],
    isContainer: false,
    containerConfig: null,
  },
  {
    name: "Light Switch",
    template: `<div class="light-switch" id="light-switch-{{param "entity"}}">
  {{#stateEquals (param "entity") "on"}}
    <div class="light-switch-icon on">{{mdiIcon "mdi:lightbulb" size="36" color="var(--db-accent-color, #4fc3f7)"}}</div>
  {{else}}
    <div class="light-switch-icon off">{{mdiIcon "mdi:lightbulb-outline" size="36" color="var(--db-font-color-secondary, #666)"}}</div>
  {{/stateEquals}}
  <div class="light-switch-label">{{param "label"}}</div>
  {{#if (param "showState")}}
    <div class="light-switch-state">{{state (param "entity")}}</div>
  {{/if}}
</div>
<script>
(function() {
  var entityId = '{{param "entity"}}';
  var domain = entityId.split('.')[0];
  var el = document.getElementById('light-switch-' + entityId);
  if (el && window.__ha) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', function() {
      window.__ha.callService(domain, 'toggle', { entity_id: entityId });
    });
  }
})();
</script>`,
    styles: `.light-switch { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 16px; gap: 8px; user-select: none; -webkit-tap-highlight-color: transparent; }
.light-switch:active { opacity: 0.7; }
.light-switch-icon { transition: all 0.2s; }
.light-switch-icon.on { filter: drop-shadow(0 0 8px var(--db-accent-color, #4fc3f7)); }
.light-switch-label { font-size: 0.9em; color: var(--db-font-color, #fff); text-align: center; }
.light-switch-state { font-size: 0.8em; color: var(--db-font-color-secondary, #aaa); text-transform: capitalize; }`,
    parameterDefs: [
      { name: "label", label: "Label", type: "string", default: "Light" },
      { name: "showState", label: "Show State", type: "boolean", default: true },
    ],
    entitySelectorDefs: [
      { name: "entity", label: "Entity", mode: "single", allowedDomains: ["light", "switch"] },
    ],
    isContainer: false,
    containerConfig: null,
  },
  {
    name: "Tabs Container",
    template: `<div class="tabs-container"><!-- children rendered by display runtime --></div>`,
    styles: `.tabs-container { width: 100%; height: 100%; }`,
    parameterDefs: [],
    entitySelectorDefs: [],
    isContainer: true,
    containerConfig: { type: "tabs" },
  },
  {
    name: "Auto-Rotate Container",
    template: `<div class="rotate-container"><!-- children rendered by display runtime --></div>`,
    styles: `.rotate-container { width: 100%; height: 100%; }`,
    parameterDefs: [],
    entitySelectorDefs: [],
    isContainer: true,
    containerConfig: { type: "auto-rotate", rotateInterval: 10 },
  },
];

export async function seedPrebuiltComponents() {
  for (const comp of prebuiltComponents) {
    const existing = await db
      .select()
      .from(components)
      .where(eq(components.name, comp.name));

    if (existing.length === 0) {
      await db.insert(components).values({
        ...comp,
        isPrebuilt: true,
      });
      console.log(`Seeded prebuilt component: ${comp.name}`);
    } else if (existing[0].isPrebuilt) {
      await db
        .update(components)
        .set({
          template: comp.template,
          styles: comp.styles,
          parameterDefs: comp.parameterDefs,
          entitySelectorDefs: comp.entitySelectorDefs,
        })
        .where(eq(components.id, existing[0].id));
    }
  }
}
