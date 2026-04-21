import type { PrebuiltComponent } from "./types.js";

export const thermostat: PrebuiltComponent = {
  name: "Thermostat",
  template: `<div class="thermostat"
  data-entity="{{param "entity"}}"
  data-step="{{param "step"}}"
  data-min="{{attr (param "entity") "min_temp"}}"
  data-max="{{attr (param "entity") "max_temp"}}"
  data-script-once>
  <div class="thermostat-header">
    <span class="thermostat-name">{{#if (param "label")}}{{param "label"}}{{else}}{{attr (param "entity") "friendly_name"}}{{/if}}</span>
    <span class="thermostat-mode">{{state (param "entity")}}</span>
  </div>
  <div class="thermostat-body">
    <div class="thermostat-current">
      <span class="thermostat-current-label">Current</span>
      <span class="thermostat-current-value"><span class="js-current">{{attr (param "entity") "current_temperature"}}</span><span class="thermostat-unit">{{param "unit"}}</span></span>
    </div>
    <div class="thermostat-controls">
      <button type="button" class="thermostat-btn js-minus" aria-label="Decrease">−</button>
      <div class="thermostat-target">
        <span class="js-target">{{attr (param "entity") "temperature"}}</span><span class="thermostat-unit">{{param "unit"}}</span>
      </div>
      <button type="button" class="thermostat-btn js-plus" aria-label="Increase">+</button>
    </div>
  </div>
</div>
<script>
(function() {
  var root = comp.querySelector('.thermostat');
  if (!root) return;
  var entityId = root.getAttribute('data-entity');
  var step = parseFloat(root.getAttribute('data-step')) || 0.5;
  var minTemp = parseFloat(root.getAttribute('data-min'));
  var maxTemp = parseFloat(root.getAttribute('data-max'));
  var currentEl = root.querySelector('.js-current');
  var targetEl = root.querySelector('.js-target');
  var modeEl = root.querySelector('.thermostat-mode');
  var plusBtn = root.querySelector('.js-plus');
  var minusBtn = root.querySelector('.js-minus');

  var pendingTarget = null;
  var sendTimer = null;
  var suppressUntil = 0;

  function parseTarget() {
    var v = parseFloat(targetEl.textContent);
    return isNaN(v) ? null : v;
  }

  function clamp(v) {
    if (!isNaN(minTemp) && v < minTemp) v = minTemp;
    if (!isNaN(maxTemp) && v > maxTemp) v = maxTemp;
    return Math.round(v * 10) / 10;
  }

  function setTargetDisplay(v) {
    targetEl.textContent = (v != null && !isNaN(v)) ? String(v) : '—';
  }

  function scheduleSend() {
    if (sendTimer) clearTimeout(sendTimer);
    sendTimer = setTimeout(function() {
      if (pendingTarget == null) return;
      if (window.__ha) {
        window.__ha.callService('climate', 'set_temperature', { entity_id: entityId, temperature: pendingTarget });
      }
      suppressUntil = Date.now() + 2500;
      pendingTarget = null;
      sendTimer = null;
    }, 500);
  }

  function bump(delta) {
    var cur = pendingTarget != null ? pendingTarget : parseTarget();
    if (cur == null) return;
    var next = clamp(cur + delta);
    pendingTarget = next;
    setTargetDisplay(next);
    scheduleSend();
  }

  if (plusBtn) plusBtn.addEventListener('click', function() { bump(step); });
  if (minusBtn) minusBtn.addEventListener('click', function() { bump(-step); });

  root.__updateMap = function(entities) {
    if (Date.now() < suppressUntil) return;
    var ent = entities && entities[entityId];
    if (!ent) return;
    if (modeEl) modeEl.textContent = ent.state || '';
    var attrs = ent.attributes || {};
    if (currentEl && attrs.current_temperature != null) currentEl.textContent = String(attrs.current_temperature);
    if (targetEl && pendingTarget == null && attrs.temperature != null) setTargetDisplay(attrs.temperature);
  };
})();
</script>`,
  styles: `.thermostat { padding: 16px; user-select: none; -webkit-tap-highlight-color: transparent; }
.thermostat-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
.thermostat-name { font-size: 0.95em; color: var(--db-font-color, #fff); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.thermostat-mode { font-size: 0.8em; color: var(--db-font-color-secondary, #aaa); text-transform: capitalize; }
.thermostat-body { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.thermostat-current { display: flex; flex-direction: column; gap: 2px; }
.thermostat-current-label { font-size: 0.75em; color: var(--db-font-color-secondary, #aaa); text-transform: uppercase; letter-spacing: 0.5px; }
.thermostat-current-value { font-size: 1.4em; color: var(--db-font-color, #fff); font-weight: 300; }
.thermostat-controls { display: flex; align-items: center; gap: 10px; }
.thermostat-btn { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--db-font-color-secondary, #555); background: transparent; color: var(--db-font-color, #fff); font-size: 1.3em; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s, transform 0.1s; }
.thermostat-btn:hover { background: var(--db-accent-color, #4fc3f7); border-color: var(--db-accent-color, #4fc3f7); }
.thermostat-btn:active { transform: scale(0.92); }
.thermostat-target { font-size: 1.8em; font-weight: 300; color: var(--db-font-color, #fff); min-width: 60px; text-align: center; }
.thermostat-unit { font-size: 0.55em; color: var(--db-font-color-secondary, #aaa); margin-left: 2px; }`,
  parameterDefs: [
    { name: "label", label: "Label", type: "string", default: "" },
    { name: "unit", label: "Unit", type: "string", default: "°" },
    { name: "step", label: "Step (°)", type: "number", default: 0.5 },
  ],
  entitySelectorDefs: [
    { name: "entity", label: "Climate", mode: "single", allowedDomains: ["climate"] },
  ],
  isContainer: false,
  containerConfig: null,
};
