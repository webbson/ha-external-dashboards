import type { PrebuiltComponent } from "./types.js";

export const serviceButton: PrebuiltComponent = {
  name: "Service Button",
  template: `<button type="button" class="svc-btn svc-btn-{{param "variant"}}"
  data-domain="{{param "domain"}}"
  data-service="{{param "service"}}"
  data-service-data='{{param "serviceData"}}'>
  {{#if (param "icon")}}<span class="svc-btn-icon">{{mdiIcon (param "icon") size="20"}}</span>{{/if}}
  <span class="svc-btn-label">{{param "label"}}</span>
  <span class="svc-btn-flash" aria-hidden="true">✓</span>
</button>
<script>
(function() {
  var btn = comp.querySelector('.svc-btn');
  if (!btn || btn.dataset.listenerAttached === 'true') return;
  btn.dataset.listenerAttached = 'true';

  var domain = btn.getAttribute('data-domain');
  var service = btn.getAttribute('data-service');
  var rawData = btn.getAttribute('data-service-data') || '{}';
  var serviceData = {};
  try {
    var parsed = JSON.parse(rawData);
    if (parsed && typeof parsed === 'object') serviceData = parsed;
  } catch (e) {
    console.warn('[Service Button] invalid JSON serviceData:', e);
  }

  btn.addEventListener('click', function() {
    if (!domain || !service) return;
    if (window.__ha) {
      window.__ha.callService(domain, service, serviceData);
      // Fire-and-forget — show flash immediately to acknowledge send
      btn.classList.add('svc-btn-sent');
      setTimeout(function() { btn.classList.remove('svc-btn-sent'); }, 900);
    }
  });
})();
</script>`,
  styles: `.svc-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; box-sizing: border-box; padding: 10px 16px; border-radius: 6px; font-size: 0.95em; font-weight: 500; cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent; position: relative; border: 1px solid transparent; transition: background 0.15s, transform 0.1s, opacity 0.15s; }
.svc-btn:active { transform: scale(0.98); }
.svc-btn-icon { display: inline-flex; align-items: center; }
.svc-btn-label { line-height: 1.2; }

.svc-btn-primary { background: var(--db-accent-color, #4fc3f7); color: #fff; }
.svc-btn-primary:hover { filter: brightness(1.1); }

.svc-btn-default { background: transparent; color: var(--db-font-color, #fff); border-color: var(--db-font-color-secondary, #555); }
.svc-btn-default:hover { background: rgba(255,255,255,0.08); }

.svc-btn-danger { background: #e53935; color: #fff; }
.svc-btn-danger:hover { filter: brightness(1.1); }

.svc-btn-flash { position: absolute; right: 10px; opacity: 0; transform: scale(0.5); transition: opacity 0.2s, transform 0.2s; color: currentColor; font-weight: 700; pointer-events: none; }
.svc-btn-sent .svc-btn-flash { opacity: 1; transform: scale(1); }
.svc-btn-sent .svc-btn-label { opacity: 0.6; }`,
  parameterDefs: [
    { name: "label", label: "Label", type: "string", default: "Run" },
    { name: "domain", label: "Domain", type: "string", default: "" },
    { name: "service", label: "Service", type: "string", default: "" },
    { name: "serviceData", label: "Service Data (JSON)", type: "textarea", default: "{}" },
    { name: "icon", label: "Icon", type: "icon", default: "" },
    {
      name: "variant", label: "Variant", type: "select", default: "primary",
      options: [
        { label: "Primary", value: "primary" },
        { label: "Default", value: "default" },
        { label: "Danger", value: "danger" },
      ],
    },
  ],
  entitySelectorDefs: [],
  isContainer: false,
  containerConfig: null,
};
