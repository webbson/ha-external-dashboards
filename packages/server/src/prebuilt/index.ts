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
    step?: number;
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
    template: `<div class="clock" data-time-format="{{param "timeFormat"}}" data-date-format="{{param "dateFormat"}}">
  <div class="clock-time" id="clock-time"></div>
  {{#if (param "showDate")}}<div class="clock-date" id="clock-date"></div>{{/if}}
</div>
<script>
(function tick() {
  var now = new Date();
  var el = document.getElementById('clock-time');
  var dl = document.getElementById('clock-date');
  var root = el && el.closest('.clock');
  var tf = (root && root.getAttribute('data-time-format')) || '12h';
  var df = (root && root.getAttribute('data-date-format')) || 'long';
  if (el) el.textContent = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12: tf !== '24h'});
  if (dl) {
    var dateOpts = df === 'short' ? {weekday:'short', month:'short', day:'numeric'}
      : df === 'numeric' ? {month:'numeric', day:'numeric', year:'numeric'}
      : {weekday:'long', month:'long', day:'numeric'};
    dl.textContent = now.toLocaleDateString([], dateOpts);
  }
  setTimeout(tick, 1000);
})();
</script>`,
    styles: `.clock { text-align: center; padding: 20px; }
.clock-time { font-size: 4em; font-weight: 200; color: var(--db-font-color, #fff); }
.clock-date { font-size: 1.2em; color: var(--db-font-color-secondary, #aaa); margin-top: 8px; }`,
    parameterDefs: [
      { name: "showDate", label: "Show Date", type: "boolean", default: true },
      {
        name: "timeFormat", label: "Time Format", type: "select", default: "12h",
        options: [
          { label: "12-hour", value: "12h" },
          { label: "24-hour", value: "24h" },
        ],
      },
      {
        name: "dateFormat", label: "Date Format", type: "select", default: "long",
        options: [
          { label: "Long (Monday, March 7)", value: "long" },
          { label: "Short (Mon, Mar 7)", value: "short" },
          { label: "Numeric (3/7/2026)", value: "numeric" },
        ],
      },
    ],
    entitySelectorDefs: [],
    isContainer: false,
    containerConfig: null,
  },
  {
    name: "Entity Value",
    template: `<div class="entity-value">
  {{#if (param "showIcon")}}<div class="entity-icon">{{mdiIcon (iconForEntity (param "entity")) size="28"}}</div>{{/if}}
  <div class="entity-label">{{#if (param "label")}}{{param "label"}}{{else}}{{attr (param "entity") "friendly_name"}}{{/if}}</div>
  <div class="entity-state">{{state (param "entity")}}{{#if (param "unit")}} <span class="unit">{{param "unit"}}</span>{{else}}{{#if (attr (param "entity") "unit_of_measurement")}} <span class="unit">{{attr (param "entity") "unit_of_measurement"}}</span>{{/if}}{{/if}}</div>
</div>`,
    styles: `.entity-value { padding: 16px; text-align: center; }
.entity-icon { margin-bottom: 4px; color: var(--db-accent-color, #4fc3f7); }
.entity-label { font-size: 0.9em; color: var(--db-font-color-secondary, #aaa); margin-bottom: 4px; }
.entity-state { font-size: 2.5em; font-weight: 300; color: var(--db-font-color, #fff); }
.unit { font-size: 0.4em; color: var(--db-font-color-secondary, #aaa); }`,
    parameterDefs: [
      { name: "label", label: "Label", type: "string", default: "" },
      { name: "unit", label: "Unit", type: "string", default: "" },
      { name: "showIcon", label: "Show Icon", type: "boolean", default: true },
    ],
    entitySelectorDefs: [
      { name: "entity", label: "Entity", mode: "single" },
    ],
    isContainer: false,
    containerConfig: null,
  },
  {
    name: "Weather Card",
    template: `<div class="weather-card" data-layout="{{param "layout"}}" style="--wi-icon-size:{{param "iconSize"}}px;--wi-temp-size:{{param "tempSize"}}em;--wi-label-size:{{param "labelSize"}}em;--wi-value-size:{{param "valueSize"}}em">
  <div class="weather-main">
    <div class="weather-icon">
      {{#if (eq (state (param "entity")) "sunny")}}
        <svg class="wi wi-sunny" viewBox="0 0 80 80"><circle class="sun-core" cx="40" cy="40" r="14" /><g class="sun-rays"><line x1="40" y1="8" x2="40" y2="18" /><line x1="40" y1="62" x2="40" y2="72" /><line x1="8" y1="40" x2="18" y2="40" /><line x1="62" y1="40" x2="72" y2="40" /><line x1="17.3" y1="17.3" x2="24.4" y2="24.4" /><line x1="55.6" y1="55.6" x2="62.7" y2="62.7" /><line x1="17.3" y1="62.7" x2="24.4" y2="55.6" /><line x1="55.6" y1="24.4" x2="62.7" y2="17.3" /></g></svg>
      {{else}}{{#if (eq (state (param "entity")) "clear-night")}}
        <svg class="wi wi-night" viewBox="0 0 80 80"><path class="moon" d="M44 18a22 22 0 1 0 18 34A18 18 0 0 1 44 18z" /><circle class="star" cx="58" cy="20" r="1.5" /><circle class="star s2" cx="66" cy="30" r="1" /><circle class="star s3" cx="54" cy="12" r="1.2" /></svg>
      {{else}}{{#if (eq (state (param "entity")) "partlycloudy")}}
        <svg class="wi wi-partlycloudy" viewBox="0 0 80 80"><circle class="sun-core pc-sun" cx="55" cy="24" r="10" /><g class="sun-rays pc-rays"><line x1="55" y1="6" x2="55" y2="12" /><line x1="55" y1="36" x2="55" y2="42" /><line x1="37" y1="24" x2="43" y2="24" /><line x1="67" y1="24" x2="73" y2="24" /><line x1="42.3" y1="11.3" x2="46.3" y2="15.3" /><line x1="63.7" y1="32.7" x2="67.7" y2="36.7" /><line x1="42.3" y1="36.7" x2="46.3" y2="32.7" /><line x1="63.7" y1="15.3" x2="67.7" y2="11.3" /></g><path class="cloud pc-cloud" d="M22 58a12 12 0 0 1 0-24h2a16 16 0 0 1 30 4h2a10 10 0 0 1 0 20z" /></svg>
      {{else}}{{#if (eq (state (param "entity")) "cloudy")}}
        <svg class="wi wi-cloudy" viewBox="0 0 80 80"><path class="cloud" d="M18 58a14 14 0 0 1 0-28h2a18 18 0 0 1 34 5h2a12 12 0 0 1 0 23z" /></svg>
      {{else}}{{#if (eq (state (param "entity")) "rainy")}}
        <svg class="wi wi-rainy" viewBox="0 0 80 80"><path class="cloud" d="M16 44a12 12 0 0 1 0-24h2a16 16 0 0 1 30 4h2a10 10 0 0 1 0 20z" /><line class="drop d1" x1="26" y1="50" x2="22" y2="62" /><line class="drop d2" x1="40" y1="50" x2="36" y2="62" /><line class="drop d3" x1="54" y1="50" x2="50" y2="62" /></svg>
      {{else}}{{#if (eq (state (param "entity")) "pouring")}}
        <svg class="wi wi-pouring" viewBox="0 0 80 80"><path class="cloud" d="M16 40a12 12 0 0 1 0-24h2a16 16 0 0 1 30 4h2a10 10 0 0 1 0 20z" /><line class="drop d1" x1="20" y1="46" x2="14" y2="62" /><line class="drop d2" x1="32" y1="46" x2="26" y2="62" /><line class="drop d3" x1="44" y1="46" x2="38" y2="62" /><line class="drop d4" x1="56" y1="46" x2="50" y2="62" /><line class="drop d5" x1="68" y1="46" x2="62" y2="62" /></svg>
      {{else}}{{#if (eq (state (param "entity")) "snowy")}}
        <svg class="wi wi-snowy" viewBox="0 0 80 80"><path class="cloud" d="M16 44a12 12 0 0 1 0-24h2a16 16 0 0 1 30 4h2a10 10 0 0 1 0 20z" /><circle class="flake f1" cx="26" cy="56" r="2.5" /><circle class="flake f2" cx="40" cy="60" r="2.5" /><circle class="flake f3" cx="54" cy="54" r="2.5" /></svg>
      {{else}}{{#if (eq (state (param "entity")) "fog")}}
        <svg class="wi wi-fog" viewBox="0 0 80 80"><line class="fog-line fg1" x1="12" y1="28" x2="68" y2="28" /><line class="fog-line fg2" x1="18" y1="38" x2="62" y2="38" /><line class="fog-line fg3" x1="12" y1="48" x2="68" y2="48" /><line class="fog-line fg4" x1="20" y1="58" x2="60" y2="58" /></svg>
      {{else}}{{#if (eq (state (param "entity")) "lightning")}}
        <svg class="wi wi-lightning" viewBox="0 0 80 80"><path class="cloud" d="M16 44a12 12 0 0 1 0-24h2a16 16 0 0 1 30 4h2a10 10 0 0 1 0 20z" /><polygon class="bolt" points="38,44 32,58 40,58 36,72 52,52 44,52 48,44" /></svg>
      {{else}}{{#if (eq (state (param "entity")) "lightning-rainy")}}
        <svg class="wi wi-lightning-rainy" viewBox="0 0 80 80"><path class="cloud" d="M16 40a12 12 0 0 1 0-24h2a16 16 0 0 1 30 4h2a10 10 0 0 1 0 20z" /><polygon class="bolt" points="38,40 32,54 40,54 36,68 52,48 44,48 48,40" /><line class="drop d1" x1="22" y1="46" x2="18" y2="58" /><line class="drop d2" x1="58" y1="46" x2="54" y2="58" /></svg>
      {{else}}{{#if (eq (state (param "entity")) "windy")}}
        <svg class="wi wi-windy" viewBox="0 0 80 80"><path class="wind-line w1" d="M10 30 Q30 30 40 24 Q50 18 60 24" /><path class="wind-line w2" d="M8 42 Q28 42 42 42 Q56 42 66 36" /><path class="wind-line w3" d="M14 54 Q34 54 44 48 Q54 42 64 48" /></svg>
      {{else}}{{#if (eq (state (param "entity")) "hail")}}
        <svg class="wi wi-hail" viewBox="0 0 80 80"><path class="cloud" d="M16 44a12 12 0 0 1 0-24h2a16 16 0 0 1 30 4h2a10 10 0 0 1 0 20z" /><circle class="hail-dot h1" cx="26" cy="54" r="3" /><circle class="hail-dot h2" cx="40" cy="58" r="3" /><circle class="hail-dot h3" cx="54" cy="52" r="3" /></svg>
      {{else}}
        <svg class="wi wi-default" viewBox="0 0 80 80"><path class="cloud" d="M18 58a14 14 0 0 1 0-28h2a18 18 0 0 1 34 5h2a12 12 0 0 1 0 23z" /><line class="q1" x1="36" y1="36" x2="36" y2="46" /><circle class="q2" cx="36" cy="50" r="1.5" /></svg>
      {{/if}}{{/if}}{{/if}}{{/if}}{{/if}}{{/if}}{{/if}}{{/if}}{{/if}}{{/if}}{{/if}}{{/if}}
    </div>
    <div class="weather-temp">{{attr (param "entity") "temperature"}}{{attr (param "entity") "temperature_unit"}}</div>
  </div>
  <div class="weather-details">
    {{#if (param "showHumidity")}}
    <div class="weather-detail">
      <span class="detail-label">Humidity</span>
      <span class="detail-value">{{attr (param "entity") "humidity"}}%</span>
    </div>
    {{/if}}
    {{#if (param "showWind")}}
    <div class="weather-detail">
      <span class="detail-label">Wind</span>
      <span class="detail-value"><svg class="wind-arrow" viewBox="0 0 20 20" data-bearing="{{attr (param "entity") "wind_bearing"}}"><path d="M10 2 L14 14 L10 11 L6 14 Z" /></svg>{{attr (param "entity") "wind_speed"}} {{attr (param "entity") "wind_speed_unit"}}</span>
    </div>
    {{/if}}
    {{#if (param "showPressure")}}
    <div class="weather-detail">
      <span class="detail-label">Pressure</span>
      <span class="detail-value">{{attr (param "entity") "pressure"}} {{attr (param "entity") "pressure_unit"}}</span>
    </div>
    {{/if}}
  </div>
</div>
<script>
(function() {
  var arrow = comp.querySelector('.wind-arrow');
  if (arrow) {
    var deg = parseFloat(arrow.getAttribute('data-bearing')) || 0;
    arrow.style.transform = 'rotate(' + deg + 'deg)';
  }
})();
</script>`,
    styles: `.weather-card { padding: 20px; }
.weather-main { text-align: center; margin-bottom: 16px; }
.weather-icon { display: flex; justify-content: center; margin-bottom: 8px; }
.weather-icon svg { width: var(--wi-icon-size, 120px); height: var(--wi-icon-size, 120px); }
.weather-temp { font-size: var(--wi-temp-size, 2em); font-weight: 200; color: var(--db-font-color, #fff); }
.weather-details { display: flex; justify-content: space-around; }
.weather-detail { text-align: center; }
.detail-label { display: block; font-size: var(--wi-label-size, 0.8em); color: var(--db-font-color-secondary, #aaa); }
.detail-value { font-size: var(--wi-value-size, 1.2em); color: var(--db-font-color, #fff); display: flex; align-items: center; justify-content: center; gap: 4px; }
.wind-arrow { width: 18px; height: 18px; fill: var(--db-font-color-secondary, #aaa); transition: transform 0.5s ease; flex-shrink: 0; }

/* Horizontal layout */
.weather-card[data-layout="horizontal"] { display: flex; align-items: center; gap: 20px; }
.weather-card[data-layout="horizontal"] .weather-main { display: flex; align-items: center; gap: 12px; text-align: left; margin-bottom: 0; flex-shrink: 0; }
.weather-card[data-layout="horizontal"] .weather-icon { margin-bottom: 0; }
.weather-card[data-layout="horizontal"] .weather-details { flex: 1; gap: 12px; }
.weather-card[data-layout="horizontal"] .weather-detail { text-align: center; }

/* Sun */
.sun-core { fill: #fdd835; }
.sun-rays line { stroke: #fdd835; stroke-width: 2.5; stroke-linecap: round; }
.wi-sunny .sun-rays { animation: wi-spin 20s linear infinite; transform-origin: 40px 40px; }

/* Night */
.moon { fill: #cfd8dc; }
.star { fill: #fff; animation: wi-twinkle 3s ease-in-out infinite; }
.star.s2 { animation-delay: 1s; }
.star.s3 { animation-delay: 2s; }

/* Partly cloudy */
.pc-sun { fill: #fdd835; }
.pc-rays line { stroke: #fdd835; stroke-width: 2; stroke-linecap: round; }
.pc-rays { animation: wi-spin 20s linear infinite; transform-origin: 55px 24px; }
.pc-cloud { animation: wi-drift 6s ease-in-out infinite; }

/* Cloud */
.cloud { fill: var(--db-font-color-secondary, #b0bec5); }
.wi-cloudy .cloud { animation: wi-drift 6s ease-in-out infinite; }

/* Rain */
.drop { stroke: #4fc3f7; stroke-width: 2; stroke-linecap: round; }
.d1 { animation: wi-rain 1s linear infinite; }
.d2 { animation: wi-rain 1s linear infinite 0.33s; }
.d3 { animation: wi-rain 1s linear infinite 0.66s; }
.d4 { animation: wi-rain 1s linear infinite 0.15s; }
.d5 { animation: wi-rain 1s linear infinite 0.5s; }

/* Snow */
.flake { fill: #e0e0e0; }
.f1 { animation: wi-snow 2s ease-in-out infinite; }
.f2 { animation: wi-snow 2s ease-in-out infinite 0.6s; }
.f3 { animation: wi-snow 2s ease-in-out infinite 1.2s; }

/* Fog */
.fog-line { stroke: var(--db-font-color-secondary, #b0bec5); stroke-width: 3; stroke-linecap: round; }
.fg1 { animation: wi-pulse 3s ease-in-out infinite; }
.fg2 { animation: wi-pulse 3s ease-in-out infinite 0.75s; }
.fg3 { animation: wi-pulse 3s ease-in-out infinite 1.5s; }
.fg4 { animation: wi-pulse 3s ease-in-out infinite 2.25s; }

/* Lightning */
.bolt { fill: #fdd835; animation: wi-flash 2s ease-in-out infinite; }

/* Wind */
.wind-line { fill: none; stroke: var(--db-font-color-secondary, #b0bec5); stroke-width: 2.5; stroke-linecap: round; }
.w1 { animation: wi-blow 3s ease-in-out infinite; }
.w2 { animation: wi-blow 3s ease-in-out infinite 0.5s; }
.w3 { animation: wi-blow 3s ease-in-out infinite 1s; }

/* Hail */
.hail-dot { fill: #b0bec5; stroke: #90a4ae; stroke-width: 1; }
.h1 { animation: wi-bounce 1s ease-in-out infinite; }
.h2 { animation: wi-bounce 1s ease-in-out infinite 0.3s; }
.h3 { animation: wi-bounce 1s ease-in-out infinite 0.6s; }

/* Default */
.q1 { stroke: var(--db-font-color-secondary, #b0bec5); stroke-width: 2.5; stroke-linecap: round; }
.q2 { fill: var(--db-font-color-secondary, #b0bec5); }

/* Keyframes */
@keyframes wi-spin { to { transform: rotate(360deg); } }
@keyframes wi-drift { 0%,100% { transform: translateX(0); } 50% { transform: translateX(4px); } }
@keyframes wi-rain { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(10px); } }
@keyframes wi-snow { 0% { opacity: 1; transform: translate(0, 0); } 50% { transform: translate(3px, 6px); } 100% { opacity: 0; transform: translate(-1px, 12px); } }
@keyframes wi-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
@keyframes wi-flash { 0%,100% { opacity: 1; } 50% { opacity: 0.1; } 70% { opacity: 1; } 80% { opacity: 0.2; } }
@keyframes wi-blow { 0% { transform: translateX(-6px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateX(6px); opacity: 0; } }
@keyframes wi-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(6px); } }
@keyframes wi-twinkle { 0%,100% { opacity: 1; } 50% { opacity: 0.2; } }`,
    parameterDefs: [
      { name: "showWind", label: "Show Wind", type: "boolean", default: true },
      { name: "showPressure", label: "Show Pressure", type: "boolean", default: false },
      { name: "showHumidity", label: "Show Humidity", type: "boolean", default: true },
      { name: "layout", label: "Layout", type: "select", default: "vertical", options: [{ label: "Vertical", value: "vertical" }, { label: "Horizontal", value: "horizontal" }] },
      { name: "iconSize", label: "Icon Size (px)", type: "number", default: 120, step: 10 },
      { name: "tempSize", label: "Temperature Size (em)", type: "number", default: 2, step: 0.1 },
      { name: "labelSize", label: "Detail Label Size (em)", type: "number", default: 0.8, step: 0.1 },
      { name: "valueSize", label: "Detail Value Size (em)", type: "number", default: 1.2, step: 0.1 },
    ],
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
    {{#if (param "showIcon")}}<div class="entity-list-icon">{{#if this.attributes.icon}}{{mdiIcon this.attributes.icon size="20"}}{{else}}{{mdiIcon (iconFor this.domain) size="20"}}{{/if}}</div>{{/if}}
    {{#if (param "showFriendlyName")}}<div class="entity-list-name">{{this.attributes.friendly_name}}</div>{{/if}}
    <div class="entity-list-spacer"></div>
    {{#if (param "showState")}}<div class="entity-list-state">{{this.state}}{{#if (param "showUnit")}} {{this.attributes.unit_of_measurement}}{{/if}}</div>{{/if}}
    {{#if (param "showLastChanged")}}<div class="entity-list-time">{{relativeTime this.last_changed}}</div>{{/if}}
  </div>
  {{/eachEntity}}
  {{#eachEntity "entityPattern"}}
  <div class="entity-list-row">
    {{#if (param "showIcon")}}<div class="entity-list-icon">{{#if this.attributes.icon}}{{mdiIcon this.attributes.icon size="20"}}{{else}}{{mdiIcon (iconFor this.domain) size="20"}}{{/if}}</div>{{/if}}
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
    template: `<div class="light-switch">
  {{#stateEquals (param "entity") "on"}}
    <div class="light-switch-icon on">{{mdiIcon "mdi:lightbulb" size="36" color="var(--db-accent-color, #4fc3f7)"}}</div>
  {{else}}
    <div class="light-switch-icon off">{{mdiIcon "mdi:lightbulb-outline" size="36" color="var(--db-font-color-secondary, #666)"}}</div>
  {{/stateEquals}}
  <div class="light-switch-label">{{#if (param "label")}}{{param "label"}}{{else}}{{attr (param "entity") "friendly_name"}}{{/if}}</div>
  {{#if (param "showState")}}
    <div class="light-switch-state">{{state (param "entity")}}</div>
  {{/if}}
</div>
<script>
var entityId = '{{param "entity"}}';
var domain = entityId.split('.')[0];
comp.style.cursor = 'pointer';
comp.addEventListener('click', function() {
  if (window.__ha) window.__ha.callService(domain, 'toggle', { entity_id: entityId });
});
</script>`,
    styles: `.light-switch { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 16px; gap: 8px; user-select: none; -webkit-tap-highlight-color: transparent; }
.light-switch:active { opacity: 0.7; }
.light-switch-icon { transition: all 0.2s; }
.light-switch-icon.on { filter: drop-shadow(0 0 8px var(--db-accent-color, #4fc3f7)); }
.light-switch-label { font-size: 0.9em; color: var(--db-font-color, #fff); text-align: center; }
.light-switch-state { font-size: 0.8em; color: var(--db-font-color-secondary, #aaa); text-transform: capitalize; }`,
    parameterDefs: [
      { name: "label", label: "Label", type: "string", default: "" },
      { name: "showState", label: "Show State", type: "boolean", default: true },
    ],
    entitySelectorDefs: [
      { name: "entity", label: "Entity", mode: "single", allowedDomains: ["light", "switch"] },
    ],
    isContainer: false,
    containerConfig: null,
  },
  {
    name: "Light Card",
    template: `<div class="light-card">
  <div class="light-card-main">
    {{#stateEquals (param "entity") "on"}}
      <div class="light-card-icon on">{{mdiIcon "mdi:lightbulb" size="40" color="var(--db-accent-color, #4fc3f7)"}}</div>
    {{else}}
      <div class="light-card-icon off">{{mdiIcon "mdi:lightbulb-outline" size="40" color="var(--db-font-color-secondary, #666)"}}</div>
    {{/stateEquals}}
    <div class="light-card-info">
      <div class="light-card-name">{{#if (param "label")}}{{param "label"}}{{else}}{{attr (param "entity") "friendly_name"}}{{/if}}</div>
      <div class="light-card-state">
        {{state (param "entity")}}{{#stateEquals (param "entity") "on"}}{{#if (param "showBrightness")}} &middot; {{attr (param "entity") "brightness"}}{{/if}}{{/stateEquals}}
      </div>
    </div>
  </div>
</div>
<script>
var entityId = '{{param "entity"}}';
comp.style.cursor = 'pointer';
comp.addEventListener('click', function() {
  if (window.__ha) window.__ha.openDialog('light-control', { entityId: entityId });
});
</script>`,
    styles: `.light-card { padding: 16px; user-select: none; -webkit-tap-highlight-color: transparent; }
.light-card:active { opacity: 0.7; }
.light-card-main { display: flex; align-items: center; gap: 14px; }
.light-card-icon { display: flex; align-items: center; transition: all 0.2s; }
.light-card-icon.on { filter: drop-shadow(0 0 10px var(--db-accent-color, #4fc3f7)); }
.light-card-name { font-size: 1em; font-weight: 500; color: var(--db-font-color, #fff); }
.light-card-state { font-size: 0.85em; color: var(--db-font-color-secondary, #aaa); margin-top: 2px; text-transform: capitalize; }`,
    parameterDefs: [
      { name: "label", label: "Label Override", type: "string", default: "" },
      { name: "showBrightness", label: "Show Brightness", type: "boolean", default: true },
    ],
    entitySelectorDefs: [
      { name: "entity", label: "Light Entity", mode: "single", allowedDomains: ["light"] },
    ],
    isContainer: false,
    containerConfig: null,
  },
  {
    name: "Graph Card",
    template: `<div class="graph-card" data-script-once>
  {{#if (param "title")}}<div class="graph-card-title">{{param "title"}}</div>{{/if}}
  <div class="graph-card-charts"
    data-entities="{{param "entities"}}"
    data-hours="{{param "hours"}}"
    data-refresh="{{param "refreshInterval"}}"
    data-chart-mode="{{param "chartMode"}}"
    data-display-mode="{{param "displayMode"}}"
    data-show-legend="{{param "showLegend"}}"
    data-show-grid="{{param "showGrid"}}"
    data-line-width="{{param "lineWidth"}}"
    data-fill-opacity="{{param "fillOpacity"}}"
    data-colors="{{param "colors"}}"
    data-bar-bucket="{{param "barBucketMinutes"}}"
    data-chart-height="{{param "chartHeight"}}">
  </div>
</div>
<script>
(function() {
  var container = comp.querySelector('.graph-card-charts');
  if (!container) return;
  var attrs = container.dataset;

  if (!window.uPlot) {
    container.innerHTML = '<div style="color:#f44;padding:20px;text-align:center;">uPlot not loaded</div>';
    return;
  }

  var entityIds = (attrs.entities || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean);
  if (entityIds.length === 0) {
    container.innerHTML = '<div style="color:var(--db-font-color-secondary,#aaa);padding:20px;text-align:center;">Select entities to display</div>';
    return;
  }

  var hours = parseFloat(attrs.hours) || 24;
  var refreshSec = parseInt(attrs.refresh) || 300;
  var chartMode = attrs.chartMode || 'line';
  var displayMode = attrs.displayMode || 'overlay';
  var showLegend = attrs.showLegend !== 'false';
  var showGrid = attrs.showGrid !== 'false';
  var lineWidth = parseFloat(attrs.lineWidth) || 2;
  var fillOpacity = parseFloat(attrs.fillOpacity) || 0.1;
  var barBucket = (parseInt(attrs.barBucket) || 60) * 60;
  var chartHeight = parseInt(attrs.chartHeight) || 200;
  container.style.height = chartHeight + 'px';

  var userColors = (attrs.colors || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean);
  var defaultPalette = ['#4fc3f7','#ff6384','#36a2eb','#ffce56','#4bc0c0','#9966ff','#ff9f40','#c9cbcf'];

  function getColor(i) {
    return userColors[i] || defaultPalette[i % defaultPalette.length];
  }

  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  var charts = [];
  var observer = null;
  var intervalId = null;

  function fetchAndRender() {
    var now = new Date();
    var start = new Date(now.getTime() - hours * 3600000).toISOString();
    var end = now.toISOString();
    var url = '/api/history/' + entityIds.join(',') + '?start=' + encodeURIComponent(start) + '&end=' + encodeURIComponent(end);

    fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!Array.isArray(data)) return;
        renderCharts(data);
      })
      .catch(function() {});
  }

  function aggregateToBuckets(timestamps, values, bucketSize) {
    if (timestamps.length === 0) return { ts: [], vals: [] };
    var minT = timestamps[0], maxT = timestamps[timestamps.length - 1];
    var bucketStart = Math.floor(minT / bucketSize) * bucketSize;
    var buckets = [], bucketVals = [];
    for (var t = bucketStart; t <= maxT; t += bucketSize) {
      buckets.push(t + bucketSize / 2);
      var sum = 0, count = 0;
      for (var j = 0; j < timestamps.length; j++) {
        if (timestamps[j] >= t && timestamps[j] < t + bucketSize) {
          sum += values[j]; count++;
        }
      }
      bucketVals.push(count > 0 ? sum / count : null);
    }
    return { ts: buckets, vals: bucketVals };
  }

  function renderCharts(data) {
    // Destroy old charts
    charts.forEach(function(c) { try { c.destroy(); } catch(e) {} });
    charts = [];
    container.innerHTML = '';

    // Parse HA history response into per-entity time series
    var seriesData = [];
    for (var i = 0; i < data.length; i++) {
      var states = data[i];
      if (!states || states.length === 0) continue;
      var eid = states[0].entity_id || entityIds[i] || ('entity_' + i);
      var ts = [], vals = [];
      for (var j = 0; j < states.length; j++) {
        var v = parseFloat(states[j].state);
        if (isNaN(v)) continue;
        ts.push(new Date(states[j].last_changed).getTime() / 1000);
        vals.push(v);
      }
      if (ts.length > 0) seriesData.push({ id: eid, ts: ts, vals: vals });
    }

    if (seriesData.length === 0) {
      container.innerHTML = '<div style="color:var(--db-font-color-secondary,#aaa);padding:20px;text-align:center;">No numeric data available</div>';
      return;
    }

    var isSparkline = chartMode === 'sparkline';
    var isBar = chartMode === 'bar';
    var isStacked = displayMode === 'stacked';

    try {
      if (isStacked) {
        container.classList.add('graph-card-stacked');
        seriesData.forEach(function(sd, idx) {
          var wrap = document.createElement('div');
          wrap.className = 'graph-card-stacked-item';
          container.appendChild(wrap);
          var chart = buildChart(wrap, [sd], [getColor(idx)], isSparkline, isBar, sd.id);
          charts.push(chart);
        });
      } else {
        container.classList.remove('graph-card-stacked');
        var colors = seriesData.map(function(_, idx) { return getColor(idx); });
        var chart = buildChart(container, seriesData, colors, isSparkline, isBar, null);
        charts.push(chart);
      }
    } catch(e) {
      console.error('[Graph Card] chart creation error:', e);
      container.innerHTML = '<div style="color:#f44;padding:20px;">Chart error: ' + e.message + '</div>';
    }
  }

  function buildChart(target, seriesArr, colors, sparkline, bar, label) {
    // Merge all timestamps into a unified x-axis
    var allTs = {};
    seriesArr.forEach(function(sd) {
      sd.ts.forEach(function(t) { allTs[t] = true; });
    });
    var xVals = Object.keys(allTs).map(Number).sort(function(a, b) { return a - b; });

    var uplotData, uplotSeries;

    if (bar) {
      // Aggregate into time buckets
      var bucketTs = null;
      var barData = [null];
      uplotSeries = [{}];
      seriesArr.forEach(function(sd, idx) {
        var agg = aggregateToBuckets(sd.ts, sd.vals, barBucket);
        if (!bucketTs) bucketTs = agg.ts;
        barData.push(agg.vals);
        uplotSeries.push({
          label: label || sd.id.split('.').pop(),
          stroke: colors[idx],
          fill: hexToRgba(colors[idx], 0.7),
          paths: window.uPlot.paths.bars({ size: [0.6, 100], gap: 2 }),
        });
      });
      barData[0] = bucketTs || [];
      uplotData = barData;
    } else {
      // Line / sparkline: align series to unified timestamps
      var alignedData = [xVals];
      uplotSeries = [{}];
      seriesArr.forEach(function(sd, idx) {
        var valMap = {};
        sd.ts.forEach(function(t, i) { valMap[t] = sd.vals[i]; });
        var aligned = xVals.map(function(t) { return valMap[t] !== undefined ? valMap[t] : null; });
        alignedData.push(aligned);
        uplotSeries.push({
          label: label || sd.id.split('.').pop(),
          stroke: colors[idx],
          fill: hexToRgba(colors[idx], fillOpacity),
          width: lineWidth,
        });
      });
      uplotData = alignedData;
    }

    var fontColor = getComputedStyle(comp).getPropertyValue('--db-font-color-secondary').trim() || '#aaa';
    var width = comp.clientWidth || target.clientWidth || 300;
    var height = sparkline ? 60 : chartHeight;

    var opts = {
      width: width,
      height: height,
      cursor: sparkline ? { show: false } : { show: true },
      legend: { show: !sparkline && showLegend },
      series: uplotSeries,
      axes: [
        {
          show: !sparkline,
          stroke: fontColor,
          grid: { show: !sparkline && showGrid, stroke: fontColor, width: 0.5 },
          ticks: { show: !sparkline, stroke: fontColor },
          font: '11px sans-serif',
        },
        {
          show: !sparkline,
          stroke: fontColor,
          grid: { show: !sparkline && showGrid, stroke: fontColor, width: 0.5 },
          ticks: { show: !sparkline, stroke: fontColor },
          font: '11px sans-serif',
        },
      ],
    };

    return new window.uPlot(opts, uplotData, target);
  }

  // Initial fetch (defer to next frame so container has layout dimensions)
  requestAnimationFrame(function() { fetchAndRender(); });

  // Periodic refresh
  intervalId = setInterval(fetchAndRender, refreshSec * 1000);

  // Resize observer
  observer = new ResizeObserver(function() {
    var w = comp.clientWidth;
    if (w > 0) {
      charts.forEach(function(c) { c.setSize({ width: w, height: chartHeight }); });
    }
  });
  observer.observe(comp);

  // Store cleanup
  comp.__graphCleanup = function() {
    if (intervalId) clearInterval(intervalId);
    if (observer) observer.disconnect();
    charts.forEach(function(c) { c.destroy(); });
    charts = [];
  };
})();
</script>`,
    styles: `:host { display: flex; flex-direction: column; }
.graph-card { flex-shrink: 0; }
.graph-card-title { font-size: 1.1em; font-weight: 500; color: var(--db-font-color, #fff); padding: 4px 8px 8px; }
.graph-card-charts { flex: 1; min-height: 120px; overflow: hidden; position: relative; }
.graph-card-stacked { display: flex; flex-direction: column; gap: 8px; }
.graph-card-stacked-item { flex: 1; min-height: 60px; }
:host .uplot { font-family: inherit; }
.graph-card .u-legend { font-size: 0.8em; color: var(--db-font-color-secondary, #aaa); padding: 4px 0 0; }
.graph-card .u-legend .u-series th { padding: 1px 6px; }
.graph-card .u-legend .u-marker { width: 8px; height: 8px; border-radius: 50%; }`,
    parameterDefs: [
      { name: "title", label: "Title", type: "string", default: "" },
      { name: "hours", label: "Hours of History", type: "number", default: 24 },
      { name: "refreshInterval", label: "Refresh Interval (seconds)", type: "number", default: 300 },
      {
        name: "chartMode", label: "Chart Mode", type: "select", default: "line",
        options: [
          { label: "Line Chart", value: "line" },
          { label: "Bar Chart", value: "bar" },
          { label: "Sparkline", value: "sparkline" },
        ],
      },
      {
        name: "displayMode", label: "Display Mode", type: "select", default: "overlay",
        options: [
          { label: "Overlay", value: "overlay" },
          { label: "Stacked", value: "stacked" },
        ],
      },
      { name: "showLegend", label: "Show Legend", type: "boolean", default: true },
      { name: "showGrid", label: "Show Grid", type: "boolean", default: true },
      { name: "lineWidth", label: "Line Width", type: "number", default: 2 },
      { name: "fillOpacity", label: "Fill Opacity (0-1)", type: "number", default: 0.1 },
      { name: "colors", label: "Colors (comma-separated hex)", type: "string", default: "" },
      { name: "barBucketMinutes", label: "Bar Bucket Size (minutes)", type: "number", default: 60 },
      { name: "chartHeight", label: "Chart Height (px)", type: "number", default: 200 },
    ],
    entitySelectorDefs: [
      { name: "entities", label: "Entities", mode: "multiple", allowedDomains: ["sensor"] },
    ],
    isContainer: false,
    containerConfig: null,
  },
  {
    name: "Camera",
    template: `<div class="camera" data-script-once data-entity-id="{{param "camera"}}" data-refresh="{{param "refreshInterval"}}" data-show-name="{{param "showName"}}" data-show-state="{{param "showState"}}">
  <img class="camera-img" src="/api/camera_proxy/{{param "camera"}}" style="object-fit: {{param "fitMode"}};" alt="Camera feed" />
  <div class="camera-error" style="display:none;">No camera feed available</div>
  <div class="camera-overlay" style="display:none;"><span class="camera-name"></span><span class="camera-state"></span></div>
</div>
<script>
  var root = comp.querySelector('.camera');
  var entityId = root.getAttribute('data-entity-id');
  var interval = parseInt(root.getAttribute('data-refresh'), 10) || 2;
  var showName = root.getAttribute('data-show-name') === 'true';
  var showState = root.getAttribute('data-show-state') === 'true';
  if (comp._camInterval) clearInterval(comp._camInterval);
  comp._camInterval = setInterval(function() {
    var img = comp.querySelector('.camera-img');
    if (img && entityId) img.setAttribute('src', '/api/camera_proxy/' + entityId + '?_t=' + Date.now());
  }, interval * 1000);
  if (showName && entityId) {
    fetch('/api/ha/entities/' + entityId).then(function(r) { return r.json(); }).then(function(data) {
      var overlay = comp.querySelector('.camera-overlay');
      var nameEl = comp.querySelector('.camera-name');
      var stateEl = comp.querySelector('.camera-state');
      if (nameEl) nameEl.textContent = data.attributes.friendly_name || entityId;
      if (showState && stateEl) stateEl.textContent = data.state || '';
      if (overlay) overlay.style.display = '';
    }).catch(function() {});
  }
</script>`,
    styles: `.camera { position: relative; width: 100%; height: 100%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #000; }
.camera-img { width: 100%; height: 100%; display: block; }
.camera-error { color: var(--db-font-color-secondary, #aaa); font-size: 0.9em; }
.camera-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 6px 10px; background: rgba(0,0,0,0.55); display: flex; align-items: center; gap: 8px; }
.camera-name { color: #fff; font-size: 0.95em; font-weight: 500; }
.camera-state { color: rgba(255,255,255,0.7); font-size: 0.85em; margin-left: auto; }`,
    parameterDefs: [
      {
        name: "refreshInterval", label: "Refresh Interval", type: "select", default: "2",
        options: [
          { label: "1 second", value: "1" },
          { label: "2 seconds", value: "2" },
          { label: "5 seconds", value: "5" },
          { label: "10 seconds", value: "10" },
          { label: "30 seconds", value: "30" },
        ],
      },
      { name: "showName", label: "Show Name", type: "boolean", default: true },
      { name: "showState", label: "Show State", type: "boolean", default: false },
      {
        name: "fitMode", label: "Fit Mode", type: "select", default: "contain",
        options: [
          { label: "Contain", value: "contain" },
          { label: "Cover", value: "cover" },
          { label: "Fill", value: "fill" },
        ],
      },
    ],
    entitySelectorDefs: [
      { name: "camera", label: "Camera Entity", mode: "single", allowedDomains: ["camera"] },
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
