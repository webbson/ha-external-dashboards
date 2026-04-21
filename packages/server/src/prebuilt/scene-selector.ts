import type { PrebuiltComponent } from "./types.js";

export const sceneSelector: PrebuiltComponent = {
  name: "Scene Selector",
  template: `<div class="scene-selector" data-layout="{{param "layout"}}">
  {{#if (param "title")}}<div class="scene-selector-title">{{param "title"}}</div>{{/if}}
  <div class="scene-selector-grid">
    {{#eachEntity "scenes"}}
      <button type="button" class="scene-selector-btn" data-entity-id="{{this.entity_id}}">
        <span class="scene-selector-icon">{{#if this.attributes.icon}}{{mdiIcon this.attributes.icon size="20"}}{{else}}{{mdiIcon "mdi:palette" size="20"}}{{/if}}</span>
        <span class="scene-selector-label">{{#if this.attributes.friendly_name}}{{this.attributes.friendly_name}}{{else}}{{this.entity_id}}{{/if}}</span>
      </button>
    {{/eachEntity}}
  </div>
</div>
<script>
(function() {
  var root = comp.querySelector('.scene-selector');
  if (!root || root.dataset.listenerAttached === 'true') return;
  root.dataset.listenerAttached = 'true';

  root.addEventListener('click', function(e) {
    var btn = e.target.closest ? e.target.closest('.scene-selector-btn') : null;
    if (!btn || !root.contains(btn)) return;
    var entityId = btn.getAttribute('data-entity-id');
    if (!entityId) return;
    var domain = entityId.split('.')[0];
    if (!window.__ha) return;
    if (domain === 'script') {
      window.__ha.callService('script', 'turn_on', { entity_id: entityId });
    } else {
      window.__ha.callService('scene', 'turn_on', { entity_id: entityId });
    }
    btn.classList.add('scene-selector-btn-flash');
    setTimeout(function() { btn.classList.remove('scene-selector-btn-flash'); }, 500);
  });
})();
</script>`,
  styles: `.scene-selector { padding: 12px; }
.scene-selector-title { font-size: 1em; font-weight: 500; color: var(--db-font-color, #fff); margin-bottom: 10px; }
.scene-selector-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
.scene-selector[data-layout="list"] .scene-selector-grid { grid-template-columns: 1fr; }
.scene-selector-btn { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 6px; background: rgba(255,255,255,0.06); border: 1px solid transparent; color: var(--db-font-color, #fff); font-size: 0.9em; cursor: pointer; text-align: left; transition: background 0.15s, transform 0.1s, border-color 0.15s; user-select: none; -webkit-tap-highlight-color: transparent; }
.scene-selector-btn:hover { background: rgba(255,255,255,0.12); border-color: var(--db-accent-color, #4fc3f7); }
.scene-selector-btn:active { transform: scale(0.97); }
.scene-selector-btn-flash { background: var(--db-accent-color, #4fc3f7) !important; color: #fff; }
.scene-selector-icon { display: inline-flex; align-items: center; color: var(--db-accent-color, #4fc3f7); flex-shrink: 0; }
.scene-selector-btn-flash .scene-selector-icon { color: #fff; }
.scene-selector-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`,
  parameterDefs: [
    { name: "title", label: "Title", type: "string", default: "" },
    {
      name: "layout", label: "Layout", type: "select", default: "grid",
      options: [
        { label: "Grid", value: "grid" },
        { label: "List", value: "list" },
      ],
    },
  ],
  entitySelectorDefs: [
    { name: "scenes", label: "Scenes", mode: "glob", allowedDomains: ["scene", "script"] },
  ],
  testEntityBindings: {
    scenes: "scene.*",
  },
  isContainer: false,
  containerConfig: null,
};
