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
    styles: `:host { background: var(--db-component-bg, transparent); border: var(--db-border-style, none); border-radius: var(--db-border-radius, 0px); padding: var(--db-component-padding, 0px); font-family: var(--db-font-family, inherit); font-size: var(--db-font-size, 16px); }
.clock { text-align: center; padding: 20px; }
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
    styles: `:host { background: var(--db-component-bg, transparent); border: var(--db-border-style, none); border-radius: var(--db-border-radius, 0px); padding: var(--db-component-padding, 0px); font-family: var(--db-font-family, inherit); font-size: var(--db-font-size, 16px); }
.entity-value { padding: 16px; text-align: center; }
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
    styles: `:host { background: var(--db-component-bg, transparent); border: var(--db-border-style, none); border-radius: var(--db-border-radius, 0px); padding: var(--db-component-padding, 0px); font-family: var(--db-font-family, inherit); font-size: var(--db-font-size, 16px); }
.weather-card { padding: 20px; }
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
    styles: `:host { background: var(--db-component-bg, transparent); border: var(--db-border-style, none); border-radius: var(--db-border-radius, 0px); padding: var(--db-component-padding, 0px); font-family: var(--db-font-family, inherit); font-size: var(--db-font-size, 16px); }
.media-player { padding: 16px; }
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
    name: "Image Slideshow",
    template: `<div class="slideshow" id="slideshow-{{param "id"}}">
  <img class="slideshow-img" src="" alt="Slideshow" />
</div>
<script>
(function() {
  var urls = '{{param "urls"}}'.split(',').map(s => s.trim()).filter(Boolean);
  var idx = 0;
  var el = document.querySelector('#slideshow-{{param "id"}} .slideshow-img');
  if (el && urls.length) {
    el.src = urls[0];
    if (urls.length > 1) setInterval(function() { idx = (idx + 1) % urls.length; el.src = urls[idx]; }, (parseInt('{{param "interval"}}') || 5) * 1000);
  }
})();
</script>`,
    styles: `:host { border: var(--db-border-style, none); border-radius: var(--db-border-radius, 0px); padding: var(--db-component-padding, 0px); overflow: hidden; }
.slideshow { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.slideshow-img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: var(--db-border-radius, 0px); }`,
    parameterDefs: [
      { name: "id", label: "Unique ID", type: "string", default: "ss1" },
      { name: "urls", label: "Image URLs (comma-separated)", type: "string", default: "" },
      { name: "interval", label: "Interval (seconds)", type: "number", default: 5 },
    ],
    entitySelectorDefs: [],
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
