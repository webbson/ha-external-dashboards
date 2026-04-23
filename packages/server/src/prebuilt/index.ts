import { db } from "../db/connection.js";
import { components } from "../db/schema.js";
import { eq } from "drizzle-orm";
import type { PrebuiltComponent } from "./types.js";
import { brightnessSlider } from "./brightness-slider.js";
import { thermostat } from "./thermostat.js";
import { serviceButton } from "./service-button.js";
import { miniHistory } from "./mini-history.js";
import { sceneSelector } from "./scene-selector.js";

const prebuiltComponents: PrebuiltComponent[] = [
  {
    name: "Clock",
    template: `<div class="clock" data-time-format="{{param "timeFormat"}}" data-date-format="{{param "dateFormat"}}" style="--clock-time-size: {{param "timeSize"}}em; --clock-date-size: {{param "dateSize"}}em;">
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
.clock-time { font-size: var(--clock-time-size, 4em); font-weight: 200; color: var(--db-font-color, #fff); }
.clock-date { font-size: var(--clock-date-size, 1.2em); color: var(--db-font-color-secondary, #aaa); margin-top: 8px; }`,
    parameterDefs: [
      { name: "showDate", label: "Show Date", type: "boolean", default: true },
      { name: "timeSize", label: "Time font size (em)", type: "number", default: 4 },
      { name: "dateSize", label: "Date font size (em)", type: "number", default: 1.2 },
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
    data-chart-height="{{param "chartHeight"}}"
    data-data-source="{{param "dataSource"}}"
    data-statistics-period="{{param "statisticsPeriod"}}"
    data-statistics-value="{{param "statisticsValue"}}"
    data-threshold-value="{{param "thresholdValue"}}"
    data-threshold-color="{{param "thresholdColor"}}"
    data-threshold-label="{{param "thresholdLabel"}}">
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
  var dataSource = attrs.dataSource || 'history';
  var statisticsPeriod = attrs.statisticsPeriod || 'hour';
  var statisticsValue = attrs.statisticsValue || 'mean';
  var thresholdValue = parseFloat(attrs.thresholdValue);
  var thresholdColor = attrs.thresholdColor || '#ff4444';
  var thresholdLabel = attrs.thresholdLabel || '';
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

    if (dataSource === 'statistics') {
      var url = '/api/statistics/' + entityIds.join(',') +
        '?start=' + encodeURIComponent(start) +
        '&end=' + encodeURIComponent(end) +
        '&period=' + statisticsPeriod;
      fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          renderStatistics(data);
        })
        .catch(function() {});
    } else {
      var url = '/api/history/' + entityIds.join(',') + '?start=' + encodeURIComponent(start) + '&end=' + encodeURIComponent(end);
      fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!Array.isArray(data)) return;
          renderCharts(data);
        })
        .catch(function() {});
    }
  }

  function renderStatistics(data) {
    // data is object: { [entityId]: [{start, mean, min, max, sum, state}] }
    if (!data || typeof data !== 'object') return;
    var seriesArr = entityIds.map(function(id) {
      var entries = data[id] || [];
      return {
        id: id,
        ts: entries.map(function(e) { return Math.floor(new Date(e.start).getTime() / 1000); }),
        vals: entries.map(function(e) { return e[statisticsValue] != null ? parseFloat(e[statisticsValue]) : null; }),
      };
    }).filter(function(s) { return s.ts.length > 0; });

    if (seriesArr.length === 0) {
      container.innerHTML = '<div style="color:var(--db-font-color-secondary,#aaa);padding:20px;text-align:center;">No statistics data available</div>';
      return;
    }

    // Render using the same path as history (seriesArr already built)
    renderSeriesData(seriesArr);
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

    renderSeriesData(seriesData);
  }

  function renderSeriesData(seriesData) {
    // Destroy old charts
    charts.forEach(function(c) { try { c.destroy(); } catch(e) {} });
    charts = [];
    container.innerHTML = '';

    var isSparkline = chartMode === 'sparkline';
    var isBar = chartMode === 'bar';
    var isArea = chartMode === 'area';
    var isStepped = chartMode === 'stepped';
    var isStacked = displayMode === 'stacked';

    try {
      if (isStacked) {
        container.classList.add('graph-card-stacked');
        seriesData.forEach(function(sd, idx) {
          var wrap = document.createElement('div');
          wrap.className = 'graph-card-stacked-item';
          container.appendChild(wrap);
          var chart = buildChart(wrap, [sd], [getColor(idx)], isSparkline, isBar, isArea, isStepped, sd.id);
          charts.push(chart);
        });
      } else {
        container.classList.remove('graph-card-stacked');
        var colors = seriesData.map(function(_, idx) { return getColor(idx); });
        var chart = buildChart(container, seriesData, colors, isSparkline, isBar, isArea, isStepped, null);
        charts.push(chart);
      }
    } catch(e) {
      console.error('[Graph Card] chart creation error:', e);
      container.innerHTML = '<div style="color:#f44;padding:20px;">Chart error: ' + e.message + '</div>';
    }
  }

  function buildChart(target, seriesArr, colors, sparkline, bar, isArea, isStepped, label) {
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
      // Line / sparkline / area / stepped: align series to unified timestamps
      var alignedData = [xVals];
      uplotSeries = [{}];
      seriesArr.forEach(function(sd, idx) {
        var valMap = {};
        sd.ts.forEach(function(t, i) { valMap[t] = sd.vals[i]; });
        var aligned = xVals.map(function(t) { return valMap[t] !== undefined ? valMap[t] : null; });
        alignedData.push(aligned);
        var seriesOpts = {
          label: label || sd.id.split('.').pop(),
          stroke: colors[idx],
          fill: isArea ? hexToRgba(colors[idx], fillOpacity > 0.1 ? fillOpacity : 0.3) : 'transparent',
          width: lineWidth,
        };
        if (isStepped && window.uPlot.paths && window.uPlot.paths.stepped) {
          seriesOpts.paths = window.uPlot.paths.stepped({ align: 1 });
        }
        uplotSeries.push(seriesOpts);
      });

      // Add threshold series if configured
      if (!isNaN(thresholdValue) && xVals.length > 0) {
        var threshY = xVals.map(function() { return thresholdValue; });
        alignedData.push(threshY);
        uplotSeries.push({
          label: thresholdLabel || 'Threshold',
          stroke: thresholdColor,
          width: 1,
          dash: [4, 4],
          fill: 'transparent',
        });
      }

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
          { label: "Area Chart", value: "area" },
          { label: "Stepped Line", value: "stepped" },
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
      {
        name: "dataSource", label: "Data Source", type: "select", default: "history",
        options: [{ label: "History", value: "history" }, { label: "Statistics", value: "statistics" }],
      },
      {
        name: "statisticsPeriod", label: "Statistics Period", type: "select", default: "hour",
        options: [{ label: "Hourly", value: "hour" }, { label: "Daily", value: "day" }],
      },
      {
        name: "statisticsValue", label: "Statistics Value", type: "select", default: "mean",
        options: [
          { label: "Mean", value: "mean" },
          { label: "Min", value: "min" },
          { label: "Max", value: "max" },
          { label: "Sum", value: "sum" },
        ],
      },
      { name: "thresholdValue", label: "Threshold Value", type: "number", default: "" as any },
      { name: "thresholdColor", label: "Threshold Color", type: "color", default: "#ff4444" },
      { name: "thresholdLabel", label: "Threshold Label", type: "string", default: "" },
    ],
    entitySelectorDefs: [
      { name: "entities", label: "Entities", mode: "multiple" },
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
  {
    name: "Input Number",
    template: `<div class="input-number">
  <div class="input-number-label">{{#if (param "label")}}{{param "label"}}{{else}}{{attr (param "entity") "friendly_name"}}{{/if}}</div>
  <div class="input-number-slider-row input-number-{{param "orientation"}}">
    <input type="range"
      class="input-number-slider"
      min="{{attr (param "entity") "min"}}"
      max="{{attr (param "entity") "max"}}"
      step="{{attr (param "entity") "step"}}"
      value="{{state (param "entity")}}"
      data-entity="{{param "entity"}}"
    />
    {{#if (param "showValue")}}
    <div class="input-number-value">{{state (param "entity")}}{{#if (param "showUnit")}} {{attr (param "entity") "unit_of_measurement"}}{{/if}}</div>
    {{/if}}
  </div>
</div>
<script>
(function() {
  var entityId = '{{param "entity"}}';
  var showUnit = '{{param "showUnit"}}' === 'true';
  var unit = '{{attr (param "entity") "unit_of_measurement"}}';
  var slider = comp.querySelector('input[type=range]');
  var valueEl = comp.querySelector('.input-number-value');
  if (!slider) return;
  if (!comp.dataset.listenerAttached) {
    comp.dataset.listenerAttached = 'true';
    slider.addEventListener('input', function() {
      if (valueEl) valueEl.textContent = this.value + (showUnit && unit ? ' ' + unit : '');
    });
    slider.addEventListener('change', function() {
      if (window.__ha) window.__ha.callService('input_number', 'set_value', { entity_id: entityId, value: Number(this.value) });
    });
  }
})();
</script>`,
    styles: `.input-number { padding: 16px; user-select: none; }
.input-number-label { font-size: 0.9em; color: var(--db-font-color-secondary, #aaa); margin-bottom: 10px; }
.input-number-slider-row { display: flex; align-items: center; gap: 12px; }
.input-number-horizontal { flex-direction: row; }
.input-number-vertical { flex-direction: column; }
.input-number-slider { flex: 1; -webkit-appearance: none; appearance: none; height: 4px; border-radius: 2px; background: var(--db-font-color-secondary, #555); outline: none; cursor: pointer; }
.input-number-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--db-accent-color, #4fc3f7); cursor: pointer; }
.input-number-slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: var(--db-accent-color, #4fc3f7); border: none; cursor: pointer; }
.input-number-value { font-size: 1.1em; color: var(--db-font-color, #fff); min-width: 48px; text-align: right; white-space: nowrap; }`,
    parameterDefs: [
      { name: "label", label: "Label", type: "string", default: "" },
      { name: "showValue", label: "Show Value", type: "boolean", default: true },
      { name: "showUnit", label: "Show Unit", type: "boolean", default: true },
      {
        name: "orientation", label: "Orientation", type: "select", default: "horizontal",
        options: [
          { label: "Horizontal", value: "horizontal" },
          { label: "Vertical", value: "vertical" },
        ],
      },
    ],
    entitySelectorDefs: [
      { name: "entity", label: "Entity", mode: "single", allowedDomains: ["input_number"] },
    ],
    isContainer: false,
    containerConfig: null,
  },
  {
    name: "Input Select",
    template: `<div class="input-select" data-options="{{attr (param "entity") "options"}}">
  {{#if (param "showLabel")}}
  <div class="input-select-label">{{#if (param "label")}}{{param "label"}}{{else}}{{attr (param "entity") "friendly_name"}}{{/if}}</div>
  {{/if}}
  <select class="input-select-dropdown" data-entity="{{param "entity"}}">
  </select>
</div>
<script>
(function() {
  var entityId = '{{param "entity"}}';
  var currentState = '{{state (param "entity")}}';
  var root = comp.querySelector('.input-select');
  var select = comp.querySelector('.input-select-dropdown');
  if (!select || !root) return;
  var rawOptions = root.getAttribute('data-options') || '[]';
  var options = [];
  try { options = JSON.parse(rawOptions); } catch(e) {}
  select.innerHTML = '';
  options.forEach(function(opt) {
    var el = document.createElement('option');
    el.value = opt;
    el.textContent = opt;
    if (opt === currentState) el.selected = true;
    select.appendChild(el);
  });
  if (!comp.dataset.listenerAttached) {
    comp.dataset.listenerAttached = 'true';
    select.addEventListener('change', function() {
      if (window.__ha) window.__ha.callService('input_select', 'select_option', { entity_id: entityId, option: this.value });
    });
  }
})();
</script>`,
    styles: `.input-select { padding: 16px; }
.input-select-label { font-size: 0.9em; color: var(--db-font-color-secondary, #aaa); margin-bottom: 8px; }
.input-select-dropdown { width: 100%; padding: 8px 12px; background: rgba(255,255,255,0.08); color: var(--db-font-color, #fff); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; font-size: 1em; outline: none; cursor: pointer; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23aaa' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; }
.input-select-dropdown:focus { border-color: var(--db-accent-color, #4fc3f7); }
.input-select-dropdown option { background: var(--db-bg-color, #1e1e2e); color: var(--db-font-color, #fff); }`,
    parameterDefs: [
      { name: "label", label: "Label", type: "string", default: "" },
      { name: "showLabel", label: "Show Label", type: "boolean", default: true },
    ],
    entitySelectorDefs: [
      { name: "entity", label: "Entity", mode: "single", allowedDomains: ["input_select"] },
    ],
    isContainer: false,
    containerConfig: null,
  },
  {
    name: "Input Boolean",
    template: `<div class="input-boolean input-boolean-{{param "size"}}" data-entity="{{param "entity"}}" style="--ib-on-color:{{param "onColor"}};--ib-off-color:{{param "offColor"}};">
  {{#if (param "showIcon")}}
  {{#stateEquals (param "entity") "on"}}
    <div class="input-boolean-icon on">{{mdiIcon "mdi:toggle-switch" size="28" color="var(--ib-on-color, #22c55e)"}}</div>
  {{else}}
    <div class="input-boolean-icon off">{{mdiIcon "mdi:toggle-switch-off-outline" size="28" color="var(--ib-off-color, #6b7280)"}}</div>
  {{/stateEquals}}
  {{/if}}
  <div class="input-boolean-label">{{#if (param "label")}}{{param "label"}}{{else}}{{attr (param "entity") "friendly_name"}}{{/if}}</div>
  <div class="input-boolean-toggle {{#stateEquals (param "entity") "on"}}active{{/stateEquals}}">
    <div class="input-boolean-thumb"></div>
  </div>
</div>
<script>
(function() {
  if (comp.dataset.listenerAttached) return;
  comp.dataset.listenerAttached = 'true';
  var entityId = '{{param "entity"}}';
  comp.style.cursor = 'pointer';
  comp.addEventListener('click', function() {
    if (window.__ha) window.__ha.callService('input_boolean', 'toggle', { entity_id: entityId });
  });
})();
</script>`,
    styles: `.input-boolean { display: flex; align-items: center; padding: 14px 16px; gap: 12px; user-select: none; -webkit-tap-highlight-color: transparent; }
.input-boolean:active { opacity: 0.7; }
.input-boolean-icon { display: flex; align-items: center; }
.input-boolean-label { flex: 1; font-size: 0.95em; color: var(--db-font-color, #fff); }
.input-boolean-toggle { position: relative; border-radius: 999px; background: var(--ib-off-color, #6b7280); transition: background 0.2s; flex-shrink: 0; }
.input-boolean-toggle.active { background: var(--ib-on-color, #22c55e); }
.input-boolean-thumb { position: absolute; top: 50%; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.4); transform: translateY(-50%); transition: left 0.2s; }

/* Sizes */
.input-boolean-small .input-boolean-toggle { width: 32px; height: 18px; }
.input-boolean-small .input-boolean-thumb { width: 14px; height: 14px; left: 2px; }
.input-boolean-small .input-boolean-toggle.active .input-boolean-thumb { left: 16px; }

.input-boolean-medium .input-boolean-toggle { width: 48px; height: 26px; }
.input-boolean-medium .input-boolean-thumb { width: 20px; height: 20px; left: 3px; }
.input-boolean-medium .input-boolean-toggle.active .input-boolean-thumb { left: 25px; }

.input-boolean-large .input-boolean-toggle { width: 64px; height: 34px; }
.input-boolean-large .input-boolean-thumb { width: 26px; height: 26px; left: 4px; }
.input-boolean-large .input-boolean-toggle.active .input-boolean-thumb { left: 34px; }`,
    parameterDefs: [
      { name: "label", label: "Label", type: "string", default: "" },
      { name: "showIcon", label: "Show Icon", type: "boolean", default: true },
      { name: "onColor", label: "On Color", type: "color", default: "#22c55e" },
      { name: "offColor", label: "Off Color", type: "color", default: "#6b7280" },
      {
        name: "size", label: "Size", type: "select", default: "medium",
        options: [
          { label: "Small", value: "small" },
          { label: "Medium", value: "medium" },
          { label: "Large", value: "large" },
        ],
      },
    ],
    entitySelectorDefs: [
      { name: "entity", label: "Entity", mode: "single", allowedDomains: ["input_boolean"] },
    ],
    isContainer: false,
    containerConfig: null,
  },
  {
    name: "Scene / Script Button",
    template: `<div class="scene-button scene-button-{{param "buttonStyle"}}" style="--sb-color:{{param "color"}};" data-entity="{{param "entity"}}">
  {{#stateEquals (param "entity") "on"}}
    <span class="scene-button-running">●</span>
  {{/stateEquals}}
  <span class="scene-button-icon">{{mdiIcon (param "icon") size="22" color="var(--sb-icon-color)"}}</span>
  <span class="scene-button-label">{{#if (param "label")}}{{param "label"}}{{else}}{{attr (param "entity") "friendly_name"}}{{/if}}</span>
</div>
<script>
(function() {
  if (comp.dataset.listenerAttached) return;
  comp.dataset.listenerAttached = 'true';
  var entityId = '{{param "entity"}}';
  var domain = entityId.split('.')[0];
  var confirmAction = '{{param "confirmAction"}}' === 'true';
  var confirmTimeout = null;

  function triggerAction() {
    var svc = 'turn_on';
    if (window.__ha) window.__ha.callService(domain, svc, { entity_id: entityId });
  }

  function resetButton() {
    if (confirmTimeout) { clearTimeout(confirmTimeout); confirmTimeout = null; }
    var confirmEl = comp.querySelector('.scene-button-confirm');
    if (confirmEl) confirmEl.remove();
    var icon = comp.querySelector('.scene-button-icon');
    var label = comp.querySelector('.scene-button-label');
    if (icon) icon.style.display = '';
    if (label) label.style.display = '';
  }

  comp.style.cursor = 'pointer';
  comp.addEventListener('click', function(e) {
    if (e.target.classList.contains('scene-button-yes')) {
      resetButton();
      triggerAction();
      return;
    }
    if (e.target.classList.contains('scene-button-no')) {
      resetButton();
      return;
    }
    if (comp.querySelector('.scene-button-confirm')) return;
    if (!confirmAction) {
      triggerAction();
      return;
    }
    var icon = comp.querySelector('.scene-button-icon');
    var label = comp.querySelector('.scene-button-label');
    if (icon) icon.style.display = 'none';
    if (label) label.style.display = 'none';
    var confirmEl = document.createElement('span');
    confirmEl.className = 'scene-button-confirm';
    confirmEl.innerHTML = '<span class="scene-button-confirm-text">Confirm?</span><button class="scene-button-yes">✓</button><button class="scene-button-no">✗</button>';
    comp.appendChild(confirmEl);
    confirmTimeout = setTimeout(resetButton, 3000);
  });
})();
</script>`,
    styles: `.scene-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; border-radius: 8px; font-size: 1em; user-select: none; -webkit-tap-highlight-color: transparent; width: 100%; box-sizing: border-box; position: relative; }
.scene-button:active { opacity: 0.75; transform: scale(0.97); }

/* Filled */
.scene-button-filled { background: var(--sb-color, #4a9eff); color: #fff; --sb-icon-color: #fff; }

/* Outlined */
.scene-button-outlined { background: transparent; color: var(--sb-color, #4a9eff); border: 2px solid var(--sb-color, #4a9eff); --sb-icon-color: var(--sb-color, #4a9eff); }

/* Text */
.scene-button-text { background: transparent; color: var(--sb-color, #4a9eff); --sb-icon-color: var(--sb-color, #4a9eff); }

.scene-button-label { font-weight: 500; }
.scene-button-running { position: absolute; top: 6px; right: 8px; font-size: 0.6em; color: var(--sb-color, #4a9eff); animation: sb-pulse 1s ease-in-out infinite; }
@keyframes sb-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.2; } }

.scene-button-confirm { display: flex; align-items: center; gap: 6px; }
.scene-button-confirm-text { font-size: 0.9em; }
.scene-button-yes, .scene-button-no { background: rgba(255,255,255,0.15); border: none; color: inherit; border-radius: 4px; padding: 2px 8px; cursor: pointer; font-size: 1em; }
.scene-button-yes:hover { background: rgba(255,255,255,0.3); }
.scene-button-no:hover { background: rgba(255,255,255,0.3); }`,
    parameterDefs: [
      { name: "label", label: "Label", type: "string", default: "" },
      { name: "icon", label: "Icon", type: "icon", default: "mdi:play" },
      {
        name: "buttonStyle", label: "Button Style", type: "select", default: "filled",
        options: [
          { label: "Filled", value: "filled" },
          { label: "Outlined", value: "outlined" },
          { label: "Text", value: "text" },
        ],
      },
      { name: "color", label: "Color", type: "color", default: "#4a9eff" },
      { name: "confirmAction", label: "Confirm Before Action", type: "boolean", default: false },
    ],
    entitySelectorDefs: [
      { name: "entity", label: "Entity", mode: "single", allowedDomains: ["scene", "script"] },
    ],
    isContainer: false,
    containerConfig: null,
  },
  {
    name: "Markdown",
    template: `<div class="markdown-card" style="padding:{{param "padding"}}px;font-size:{{param "fontSize"}}px;text-align:{{param "textAlign"}};">{{{markdownToHtml (param "content")}}}</div>`,
    styles: `.markdown-card { width: 100%; height: 100%; overflow: auto; box-sizing: border-box; color: var(--db-font-color, #e0e0e0); font-family: var(--db-font-family, inherit); line-height: 1.6; }
.markdown-card h1, .markdown-card h2, .markdown-card h3 { margin-top: 0.5em; margin-bottom: 0.25em; color: var(--db-font-color, #e0e0e0); }
.markdown-card p { margin: 0 0 0.5em; }
.markdown-card strong { font-weight: 600; }
.markdown-card a { color: var(--db-accent-color, #4a9eff); }
.markdown-card ul, .markdown-card ol { padding-left: 1.5em; margin: 0 0 0.5em; }
.markdown-card code { background: rgba(255,255,255,0.1); padding: 0.1em 0.3em; border-radius: 3px; font-family: monospace; font-size: 0.9em; }
.markdown-card pre { background: rgba(255,255,255,0.08); padding: 0.75em; border-radius: 4px; overflow-x: auto; margin: 0 0 0.5em; }
.markdown-card pre code { background: none; padding: 0; }
.markdown-card blockquote { border-left: 3px solid var(--db-accent-color, #4a9eff); margin: 0 0 0.5em; padding-left: 0.75em; color: var(--db-font-color-secondary, #aaa); }`,
    parameterDefs: [
      { name: "content", label: "Content (Markdown + Handlebars)", type: "textarea", default: "## Hello\n\nShow entity values inline:\n- Temperature: **{{state \"sensor.temperature\"}}**\n- Status: **{{state \"input_boolean.example\"}}**\n\nUse `{{state \"entity.id\"}}` for state, `{{attr \"entity.id\" \"friendly_name\"}}` for attributes." },
      { name: "padding", label: "Padding (px)", type: "number", default: 16 },
      { name: "fontSize", label: "Font Size (px)", type: "number", default: 14 },
      {
        name: "textAlign", label: "Text Align", type: "select", default: "left",
        options: [
          { label: "Left", value: "left" },
          { label: "Center", value: "center" },
          { label: "Right", value: "right" },
        ],
      },
    ],
    entitySelectorDefs: [],
    isContainer: false,
    containerConfig: null,
  },
  {
    name: "Map",
    template: `<div class="map-card" data-script-once
     data-entities="{{param "entities"}}"
     data-mapheight="{{param "mapHeight"}}"
     data-defaultzoom="{{param "defaultZoom"}}"
     data-autofit="{{param "autoFit"}}"
     data-showaccuracy="{{param "showAccuracy"}}"
     data-showlabels="{{param "showLabels"}}"
     data-colorhome="{{param "colorHome"}}"
     data-coloraway="{{param "colorAway"}}"
     data-colorother="{{param "colorOther"}}"
     data-avatarsize="{{param "avatarSize"}}">
  <div class="map-container" style="width:100%;height:{{param "mapHeight"}}px;"></div>
</div>
<script>
(function() {
  var mapCard = comp.querySelector('.map-card');
  var entityIds = (mapCard.dataset.entities || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean);
  var defaultZoom = parseInt(mapCard.dataset.defaultzoom) || 12;
  var autoFit = mapCard.dataset.autofit !== 'false';
  var showAccuracy = mapCard.dataset.showaccuracy !== 'false';
  var showLabels = mapCard.dataset.showlabels !== 'false';
  var colorHome = mapCard.dataset.colorhome || '#22c55e';
  var colorAway = mapCard.dataset.coloraway || '#ef4444';
  var colorOther = mapCard.dataset.colorother || '#f59e0b';
  var avatarSize = parseInt(mapCard.dataset.avatarsize) || 40;

  function getColor(state) {
    if (state === 'home') return colorHome;
    if (state === 'not_home') return colorAway;
    return colorOther;
  }

  function createMarkerEl(entityState) {
    var color = getColor(entityState.state);
    var size = avatarSize;
    var el = document.createElement('div');
    el.style.cssText = [
      'width:' + size + 'px',
      'height:' + size + 'px',
      'border-radius:50%',
      'overflow:hidden',
      'border:3px solid ' + color,
      'box-shadow:0 2px 6px rgba(0,0,0,0.4)',
      'cursor:default',
      'position:relative',
    ].join(';');

    var pic = entityState.attributes && entityState.attributes.entity_picture;
    if (pic) {
      var src = pic.startsWith('/') ? '/api/image_proxy' + pic : pic;
      var img = document.createElement('img');
      img.src = src;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      img.onerror = function() {
        el.removeChild(img);
        el.style.background = color;
      };
      el.appendChild(img);
    } else {
      el.style.background = color;
    }

    return el;
  }

  var initRetries = 0;
  function initMap() {
    var maplib = window.maplibregl;
    if (!maplib) {
      initRetries++;
      if (initRetries > 20) {
        var container = comp.querySelector('.map-container');
        if (container) container.textContent = 'Map failed to load.';
        return;
      }
      setTimeout(initMap, 150);
      return;
    }

    var container = comp.querySelector('.map-container');
    var map = new maplib.Map({
      container: container,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      zoom: defaultZoom,
      center: [0, 51],
    });

    comp.__mapInstance = map;
    var markers = {};
    var labelMarkers = {};
    var accuracyMarkers = {};

    function updateMarkers(entityStates) {
      entityIds.forEach(function(id) {
        var state = entityStates[id];
        if (!state) return;

        var lat = state.attributes && parseFloat(state.attributes.latitude);
        var lng = state.attributes && parseFloat(state.attributes.longitude);
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

        var color = getColor(state.state);

        if (markers[id]) {
          markers[id].setLngLat([lng, lat]);
          if (labelMarkers[id]) labelMarkers[id].setLngLat([lng, lat]);
          if (accuracyMarkers[id]) accuracyMarkers[id].setLngLat([lng, lat]);
          var el = markers[id].getElement();
          el.style.borderColor = color;
          if (!el.querySelector('img')) el.style.background = color;
        } else {
          var el = createMarkerEl(state);
          markers[id] = new maplib.Marker({ element: el, anchor: 'center' })
            .setLngLat([lng, lat])
            .addTo(map);

          if (showLabels) {
            var name = (state.attributes && state.attributes.friendly_name) || id.split('.').pop();
            var labelEl = document.createElement('div');
            labelEl.textContent = name;
            labelEl.style.cssText = 'color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.8);font-size:11px;font-weight:500;pointer-events:none;white-space:nowrap;margin-top:' + (avatarSize / 2 + 4) + 'px;';
            labelMarkers[id] = new maplib.Marker({ element: labelEl, anchor: 'top' })
              .setLngLat([lng, lat])
              .addTo(map);
          }

          if (showAccuracy && state.attributes && state.attributes.gps_accuracy) {
            var acc = parseFloat(state.attributes.gps_accuracy);
            if (!isNaN(acc)) {
              var ringSize = Math.min(Math.max(acc, 20), 200);
              var ringEl = document.createElement('div');
              ringEl.style.cssText = [
                'width:' + ringSize + 'px',
                'height:' + ringSize + 'px',
                'border-radius:50%',
                'border:2px solid ' + color,
                'opacity:0.5',
                'pointer-events:none',
              ].join(';');
              accuracyMarkers[id] = new maplib.Marker({ element: ringEl, anchor: 'center' })
                .setLngLat([lng, lat])
                .addTo(map);
            }
          }
        }

        if (labelMarkers[id]) labelMarkers[id].setLngLat([lng, lat]);
        if (accuracyMarkers[id]) accuracyMarkers[id].setLngLat([lng, lat]);
      });

      if (autoFit && Object.keys(markers).length > 0) {
        var lnglats = Object.values(markers).map(function(m) { return m.getLngLat(); });
        if (lnglats.length === 1) {
          map.flyTo({ center: lnglats[0], zoom: defaultZoom, duration: 500 });
        } else {
          var bounds = new maplib.LngLatBounds();
          lnglats.forEach(function(ll) { bounds.extend(ll); });
          map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 500 });
        }
      }
    }

    comp.__updateMap = function(entityStates) {
      updateMarkers(entityStates);
    };

    comp.__mapCleanup = function() {
      map.remove();
      comp.__updateMap = null;
    };
  }

  initMap();
})();
</script>`,
    styles: `.map-card { width: 100%; height: 100%; overflow: hidden; }
.map-container { width: 100%; }
.maplibregl-canvas { border-radius: var(--db-border-radius, 0); }`,
    parameterDefs: [
      { name: "mapHeight", label: "Map Height (px)", type: "number", default: 400 },
      { name: "defaultZoom", label: "Default Zoom", type: "number", default: 12 },
      { name: "autoFit", label: "Auto-fit to markers", type: "boolean", default: true },
      { name: "showAccuracy", label: "Show Accuracy Circle", type: "boolean", default: true },
      { name: "showLabels", label: "Show Entity Labels", type: "boolean", default: true },
      { name: "colorHome", label: "Home Color", type: "color", default: "#22c55e" },
      { name: "colorAway", label: "Away Color", type: "color", default: "#ef4444" },
      { name: "colorOther", label: "Other Color", type: "color", default: "#f59e0b" },
      { name: "avatarSize", label: "Avatar Size (px)", type: "number", default: 40 },
    ],
    entitySelectorDefs: [
      {
        name: "entities",
        label: "Entities (person, device_tracker)",
        mode: "multiple",
        allowedDomains: ["person", "device_tracker"],
      },
    ],
    isContainer: false,
    containerConfig: null,
  },
  brightnessSlider,
  thermostat,
  serviceButton,
  miniHistory,
  sceneSelector,
  {
    name: "Image Card",
    template: `<div class="image-card" style="padding: {{param "padding"}}px; max-width: {{param "maxWidth"}}; margin: auto"><img src="/assets/{{param "asset"}}" style="object-fit: {{param "fit"}}" alt="{{param "alt"}}" /></div>`,
    styles: `.image-card { width: 100%; height: 100%; display: flex; align-items: stretch; box-sizing: border-box; }
.image-card img { width: 100%; height: 100%; border-radius: var(--radius, 0); }`,
    parameterDefs: [
      { name: "asset", label: "Image asset", type: "asset", default: "" },
      {
        name: "fit",
        label: "Fit",
        type: "select",
        default: "cover",
        options: [
          { label: "Cover", value: "cover" },
          { label: "Contain", value: "contain" },
          { label: "Fill", value: "fill" },
          { label: "None", value: "none" },
        ],
      },
      { name: "padding", label: "Padding (px)", type: "number", default: 0 },
      { name: "maxWidth", label: "Max width (e.g. 400px, 50%)", type: "string", default: "none" },
      { name: "alt", label: "Alt text", type: "string", default: "" },
    ],
    entitySelectorDefs: [],
    isContainer: false,
    containerConfig: null,
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
          testEntityBindings: comp.testEntityBindings ?? null,
        })
        .where(eq(components.id, existing[0].id));
    }
  }
}
