import type { PrebuiltComponent } from "./types.js";

export const brightnessSlider: PrebuiltComponent = {
  name: "Brightness Slider",
  template: `<div class="brightness-slider"
  data-entity="{{param "entity"}}"
  data-initial-state="{{state (param "entity")}}"
  data-initial-brightness="{{attr (param "entity") "brightness"}}"
  data-show-icon="{{param "showIcon"}}"
  data-script-once>
  <div class="brightness-slider-header">
    {{#if (param "showIcon")}}
      {{#stateEquals (param "entity") "on"}}
        <span class="brightness-slider-icon on">{{mdiIcon "mdi:lightbulb-on" size="24" color="var(--db-accent-color, #4fc3f7)"}}</span>
      {{else}}
        <span class="brightness-slider-icon off">{{mdiIcon "mdi:lightbulb-outline" size="24" color="var(--db-font-color-secondary, #666)"}}</span>
      {{/stateEquals}}
    {{/if}}
    <span class="brightness-slider-label">{{#if (param "label")}}{{param "label"}}{{else}}{{attr (param "entity") "friendly_name"}}{{/if}}</span>
    <span class="brightness-slider-value">Off</span>
  </div>
  <input type="range" class="brightness-slider-range" min="0" max="100" step="1" value="0" />
</div>
<script>
(function() {
  var root = comp.querySelector('.brightness-slider');
  if (!root) return;
  var entityId = root.getAttribute('data-entity');
  var slider = root.querySelector('.brightness-slider-range');
  var valueEl = root.querySelector('.brightness-slider-value');
  var iconEl = root.querySelector('.brightness-slider-icon');
  if (!slider) return;

  var dragging = false;
  var sendTimer = null;
  var suppressUntil = 0;

  function pctFromEntity(ent) {
    if (!ent || ent.state !== 'on') return 0;
    var b = ent.attributes && ent.attributes.brightness;
    if (b == null) return 100;
    return Math.max(0, Math.min(100, Math.round((parseFloat(b) / 255) * 100)));
  }

  function applyVisual(pct, isOn) {
    slider.value = String(pct);
    if (valueEl) valueEl.textContent = isOn ? pct + '%' : 'Off';
    if (iconEl) {
      iconEl.classList.toggle('on', !!isOn);
      iconEl.classList.toggle('off', !isOn);
    }
  }

  // Seed from template data attributes (initial state known at render time)
  var initState = root.getAttribute('data-initial-state');
  var initBright = parseFloat(root.getAttribute('data-initial-brightness'));
  var initOn = initState === 'on';
  var initPct = initOn ? (isNaN(initBright) ? 100 : Math.max(0, Math.min(100, Math.round(initBright / 255 * 100)))) : 0;
  applyVisual(initPct, initOn);

  function sendValue(pct) {
    if (!window.__ha) return;
    if (pct <= 0) {
      window.__ha.callService('light', 'turn_off', { entity_id: entityId });
    } else {
      window.__ha.callService('light', 'turn_on', { entity_id: entityId, brightness_pct: pct });
    }
    // Suppress external updates briefly to avoid value snap-back before HA echoes
    suppressUntil = Date.now() + 1500;
  }

  slider.addEventListener('pointerdown', function() { dragging = true; });
  slider.addEventListener('pointerup', function() { dragging = false; });
  slider.addEventListener('pointercancel', function() { dragging = false; });
  slider.addEventListener('touchend', function() { dragging = false; });

  slider.addEventListener('input', function() {
    var pct = parseInt(slider.value, 10) || 0;
    if (valueEl) valueEl.textContent = pct > 0 ? pct + '%' : 'Off';
    if (sendTimer) clearTimeout(sendTimer);
    sendTimer = setTimeout(function() { sendValue(pct); }, 150);
  });
  slider.addEventListener('change', function() {
    if (sendTimer) { clearTimeout(sendTimer); sendTimer = null; }
    sendValue(parseInt(slider.value, 10) || 0);
  });

  // Called by ComponentRenderer on every entity state update
  root.__updateMap = function(entities) {
    if (dragging) return;
    if (Date.now() < suppressUntil) return;
    var ent = entities && entities[entityId];
    var isOn = !!ent && ent.state === 'on';
    applyVisual(pctFromEntity(ent), isOn);
  };
})();
</script>`,
  styles: `.brightness-slider { padding: 14px 16px; user-select: none; }
.brightness-slider-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.brightness-slider-icon { display: flex; align-items: center; transition: filter 0.2s; }
.brightness-slider-icon.on { filter: drop-shadow(0 0 6px var(--db-accent-color, #4fc3f7)); }
.brightness-slider-label { flex: 1; font-size: 0.95em; color: var(--db-font-color, #fff); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.brightness-slider-value { font-size: 0.85em; color: var(--db-font-color-secondary, #aaa); min-width: 44px; text-align: right; }
.brightness-slider-range { width: 100%; -webkit-appearance: none; appearance: none; height: 6px; border-radius: 3px; background: var(--db-font-color-secondary, #555); outline: none; cursor: pointer; }
.brightness-slider-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border-radius: 50%; background: var(--db-accent-color, #4fc3f7); cursor: pointer; border: 2px solid var(--db-component-bg, #222); box-shadow: 0 1px 3px rgba(0,0,0,0.4); }
.brightness-slider-range::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: var(--db-accent-color, #4fc3f7); cursor: pointer; border: 2px solid var(--db-component-bg, #222); }`,
  parameterDefs: [
    { name: "label", label: "Label", type: "string", default: "" },
    { name: "showIcon", label: "Show Icon", type: "boolean", default: true },
  ],
  entitySelectorDefs: [
    { name: "entity", label: "Light", mode: "single", allowedDomains: ["light"] },
  ],
  isContainer: false,
  containerConfig: null,
};
