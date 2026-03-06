# Prebuilt Components & Dialog System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Entity List, Light Switch, and Light Card prebuilt components, a `window.__ha` global API for service calls and dialogs, a Light Control dialog, and improved template helper reference + Monaco autocomplete.

**Architecture:** All components remain Handlebars templates. Interactive features (service calls, dialogs) are exposed via `window.__ha` global on the display runtime. Dialogs are React components rendered by `DisplayApp` as overlays, triggered from template `<script>` tags. The admin UI gets an updated helper reference panel and basic Monaco completion for Handlebars helpers.

**Tech Stack:** TypeScript, React 19, Handlebars, Fastify WebSocket, Ant Design, Monaco Editor

---

### Task 1: `window.__ha` Global API

**Files:**
- Modify: `packages/display/src/DisplayApp.tsx`
- Modify: `packages/display/src/ws/DisplayClient.ts`

**Step 1: Add TypeScript type declaration for `window.__ha`**

Add to `DisplayApp.tsx` (top of file, before component):

```typescript
interface HAGlobal {
  callService: (domain: string, service: string, data: Record<string, unknown>) => void;
  openDialog: (type: string, props: Record<string, unknown>) => void;
  closeDialog: () => void;
}

declare global {
  interface Window {
    __ha?: HAGlobal;
  }
}
```

**Step 2: Register `window.__ha` in the WebSocket useEffect**

In `DisplayApp.tsx`, inside the `useEffect` that creates the `DisplayClient` (around line 185), after `clientRef.current = client;`, add:

```typescript
// Only expose interactive API if dashboard has interactive mode enabled
if (config.dashboard.interactiveMode) {
  window.__ha = {
    callService: (domain: string, service: string, data: Record<string, unknown>) => {
      client.callService(domain, service, data);
    },
    openDialog: (type: string, props: Record<string, unknown>) => {
      setDialogState({ type, props });
    },
    closeDialog: () => {
      setDialogState(null);
    },
  };
}
```

In the cleanup function of that same `useEffect`, add:

```typescript
window.__ha = undefined;
```

**Step 3: Add dialog state to DisplayApp**

Add state near the other `useState` calls (around line 79):

```typescript
const [dialogState, setDialogState] = useState<{ type: string; props: Record<string, unknown> } | null>(null);
```

**Step 4: Build the project and verify no type errors**

Run: `cd packages/display && pnpm build`
Expected: Build succeeds with no errors

**Step 5: Commit**

```
feat: add window.__ha global API for interactive components
```

---

### Task 2: Dialog Overlay System

**Files:**
- Create: `packages/display/src/runtime/DialogOverlay.tsx`
- Create: `packages/display/src/runtime/dialogs/LightControlDialog.tsx`
- Modify: `packages/display/src/DisplayApp.tsx`

**Step 1: Create DialogOverlay component**

Create `packages/display/src/runtime/DialogOverlay.tsx`:

```tsx
import type { EntityState } from "../template/engine.js";
import { LightControlDialog } from "./dialogs/LightControlDialog.js";

interface DialogOverlayProps {
  dialogState: { type: string; props: Record<string, unknown> } | null;
  onClose: () => void;
  entities: Record<string, EntityState>;
  callService: (domain: string, service: string, data: Record<string, unknown>) => void;
}

const dialogRegistry: Record<
  string,
  React.ComponentType<{
    props: Record<string, unknown>;
    entities: Record<string, EntityState>;
    callService: (domain: string, service: string, data: Record<string, unknown>) => void;
    onClose: () => void;
  }>
> = {
  "light-control": LightControlDialog,
};

export function DialogOverlay({ dialogState, onClose, entities, callService }: DialogOverlayProps) {
  if (!dialogState) return null;

  const DialogComponent = dialogRegistry[dialogState.type];
  if (!DialogComponent) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--db-component-bg, #1a1a2e)",
          borderRadius: "var(--db-border-radius, 12px)",
          padding: 24,
          minWidth: 320,
          maxWidth: 400,
          maxHeight: "80vh",
          overflow: "auto",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <DialogComponent
          props={dialogState.props}
          entities={entities}
          callService={callService}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
```

**Step 2: Create LightControlDialog component**

Create `packages/display/src/runtime/dialogs/LightControlDialog.tsx`:

```tsx
import { useCallback, useMemo } from "react";
import type { EntityState } from "../../template/engine.js";

interface LightControlDialogProps {
  props: Record<string, unknown>;
  entities: Record<string, EntityState>;
  callService: (domain: string, service: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

export function LightControlDialog({ props, entities, callService, onClose }: LightControlDialogProps) {
  const entityId = props.entityId as string;
  const entity = entities[entityId];

  const isOn = entity?.state === "on";
  const brightness = entity?.attributes?.brightness as number | undefined;
  const colorTemp = entity?.attributes?.color_temp as number | undefined;
  const minMireds = entity?.attributes?.min_mireds as number | undefined;
  const maxMireds = entity?.attributes?.max_mireds as number | undefined;
  const hsColor = entity?.attributes?.hs_color as [number, number] | undefined;
  const effectList = entity?.attributes?.effect_list as string[] | undefined;
  const currentEffect = entity?.attributes?.effect as string | undefined;
  const supportedColorModes = entity?.attributes?.supported_color_modes as string[] | undefined;

  const supportsColorTemp = supportedColorModes?.includes("color_temp");
  const supportsColor = supportedColorModes?.some((m) => ["hs", "rgb", "rgbw", "rgbww", "xy"].includes(m));
  const supportsBrightness = supportsColorTemp || supportsColor || supportedColorModes?.includes("brightness");

  const friendlyName = (entity?.attributes?.friendly_name as string) || entityId;

  const handleToggle = useCallback(() => {
    callService("light", "toggle", { entity_id: entityId });
  }, [callService, entityId]);

  const handleBrightness = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.round((parseInt(e.target.value) / 100) * 255);
      callService("light", "turn_on", { entity_id: entityId, brightness: value });
    },
    [callService, entityId]
  );

  const handleColorTemp = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      callService("light", "turn_on", { entity_id: entityId, color_temp: parseInt(e.target.value) });
    },
    [callService, entityId]
  );

  const handleColor = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const hex = e.target.value;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      callService("light", "turn_on", { entity_id: entityId, rgb_color: [r, g, b] });
    },
    [callService, entityId]
  );

  const handleEffect = useCallback(
    (effect: string) => {
      callService("light", "turn_on", { entity_id: entityId, effect });
    },
    [callService, entityId]
  );

  const brightnessPercent = brightness != null ? Math.round((brightness / 255) * 100) : 0;

  const currentHexColor = useMemo(() => {
    if (!hsColor) return "#ffffff";
    const [h, s] = hsColor;
    // Simple HSV to RGB (value = 1)
    const sNorm = s / 100;
    const c = sNorm;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = 1 - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }, [hsColor]);

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: "var(--db-font-color-secondary, #aaa)",
    marginBottom: 6,
    marginTop: 16,
  };

  const sliderStyle: React.CSSProperties = {
    width: "100%",
    accentColor: "var(--db-accent-color, #4fc3f7)",
    cursor: "pointer",
  };

  if (!entity) {
    return <div style={{ color: "var(--db-font-color-secondary, #aaa)" }}>Entity not found: {entityId}</div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: "var(--db-font-color, #fff)" }}>{friendlyName}</div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--db-font-color-secondary, #aaa)",
            fontSize: 20,
            cursor: "pointer",
            padding: "0 4px",
          }}
        >
          &times;
        </button>
      </div>

      {/* Toggle */}
      <button
        onClick={handleToggle}
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.1)",
          background: isOn ? "var(--db-accent-color, #4fc3f7)" : "rgba(255,255,255,0.08)",
          color: isOn ? "#000" : "var(--db-font-color, #fff)",
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          transition: "background 0.2s",
        }}
      >
        {isOn ? "Turn Off" : "Turn On"}
      </button>

      {/* Brightness */}
      {supportsBrightness && isOn && (
        <div>
          <div style={labelStyle}>Brightness — {brightnessPercent}%</div>
          <input
            type="range"
            min={1}
            max={100}
            value={brightnessPercent}
            onChange={handleBrightness}
            style={sliderStyle}
          />
        </div>
      )}

      {/* Color Temperature */}
      {supportsColorTemp && isOn && minMireds != null && maxMireds != null && (
        <div>
          <div style={labelStyle}>Color Temperature</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--db-font-color-secondary, #aaa)" }}>Warm</span>
            <input
              type="range"
              min={minMireds}
              max={maxMireds}
              value={colorTemp ?? minMireds}
              onChange={handleColorTemp}
              style={sliderStyle}
            />
            <span style={{ fontSize: 11, color: "var(--db-font-color-secondary, #aaa)" }}>Cool</span>
          </div>
        </div>
      )}

      {/* Color */}
      {supportsColor && isOn && (
        <div>
          <div style={labelStyle}>Color</div>
          <input
            type="color"
            value={currentHexColor}
            onChange={handleColor}
            style={{ width: "100%", height: 40, border: "none", borderRadius: 6, cursor: "pointer", background: "transparent" }}
          />
        </div>
      )}

      {/* Effects */}
      {effectList && effectList.length > 0 && isOn && (
        <div>
          <div style={labelStyle}>Effect</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {effectList.map((effect) => (
              <button
                key={effect}
                onClick={() => handleEffect(effect)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: effect === currentEffect ? "var(--db-accent-color, #4fc3f7)" : "rgba(255,255,255,0.08)",
                  color: effect === currentEffect ? "#000" : "var(--db-font-color, #fff)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {effect}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Wire DialogOverlay into DisplayApp**

In `DisplayApp.tsx`, add imports at the top:

```typescript
import { DialogOverlay } from "./runtime/DialogOverlay.js";
```

In the return JSX (around line 325), after the `<PopupOverlay>`, add:

```tsx
<DialogOverlay
  dialogState={dialogState}
  onClose={() => setDialogState(null)}
  entities={entities}
  callService={(domain, service, data) => clientRef.current?.callService(domain, service, data)}
/>
```

**Step 4: Build and verify**

Run: `cd packages/display && pnpm build`
Expected: Build succeeds

**Step 5: Commit**

```
feat: add dialog overlay system with light control dialog
```

---

### Task 3: `eachEntity` Handlebars Helper

**Files:**
- Modify: `packages/display/src/template/engine.ts`
- Modify: `packages/server/src/template/helpers.ts`

The helper must be registered in both locations (display client-side and server-side for preview).

**Step 1: Add `eachEntity` helper to display engine**

In `packages/display/src/template/engine.ts`, add after the existing helpers (around line 150, before `const templateCache`):

```typescript
Handlebars.registerHelper("eachEntity", function (this: unknown, selectorName: string, options: Handlebars.HelperOptions) {
  const ctx = options.data?.root as TemplateContext;
  const binding = ctx?.params?.[selectorName];
  if (!binding) return "";

  const entityIds = Array.isArray(binding) ? binding : [binding];
  let result = "";

  for (let i = 0; i < entityIds.length; i++) {
    const entityId = String(entityIds[i]);
    const entity = ctx?.entities?.[entityId];
    const domain = entityId.split(".")[0];
    const data = {
      entity_id: entityId,
      state: entity?.state ?? "unavailable",
      attributes: entity?.attributes ?? {},
      domain,
      last_changed: entity?.last_changed ?? "",
      last_updated: entity?.last_updated ?? "",
    };
    result += options.fn(data, {
      data: { ...options.data, index: i, first: i === 0, last: i === entityIds.length - 1 },
    });
  }

  return result;
});
```

**Step 2: Add the same helper to server-side helpers**

In `packages/server/src/template/helpers.ts`, add the identical registration after the existing helpers (around line 121, before the end of file):

```typescript
Handlebars.registerHelper("eachEntity", function (this: unknown, selectorName: string, options: Handlebars.HelperOptions) {
  const ctx = options.data?.root as TemplateContext;
  const binding = ctx?.params?.[selectorName];
  if (!binding) return "";

  const entityIds = Array.isArray(binding) ? binding : [binding];
  let result = "";

  for (let i = 0; i < entityIds.length; i++) {
    const entityId = String(entityIds[i]);
    const entity = ctx?.entities?.[entityId];
    const domain = entityId.split(".")[0];
    const data = {
      entity_id: entityId,
      state: entity?.state ?? "unavailable",
      attributes: entity?.attributes ?? {},
      domain,
      last_changed: (entity as Record<string, unknown>)?.last_changed ?? "",
      last_updated: (entity as Record<string, unknown>)?.last_updated ?? "",
    };
    result += options.fn(data, {
      data: { ...options.data, index: i, first: i === 0, last: i === entityIds.length - 1 },
    });
  }

  return result;
});
```

**Step 3: Build both packages**

Run: `pnpm build`
Expected: All packages build successfully

**Step 4: Commit**

```
feat: add eachEntity Handlebars helper for iterating entity bindings
```

---

### Task 4: Entity List Prebuilt Component

**Files:**
- Modify: `packages/server/src/prebuilt/index.ts`

**Step 1: Add Entity List to the prebuiltComponents array**

In `packages/server/src/prebuilt/index.ts`, add to the `prebuiltComponents` array (before the Tabs Container entry, around line 104):

```typescript
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
```

**Step 2: Build server**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```
feat: add Entity List prebuilt component
```

---

### Task 5: Light Switch Prebuilt Component

**Files:**
- Modify: `packages/server/src/prebuilt/index.ts`

**Step 1: Add Light Switch to the prebuiltComponents array**

Add after the Entity List entry:

```typescript
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
```

**Step 2: Build**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```
feat: add Light Switch prebuilt component
```

---

### Task 6: Light Card Prebuilt Component

**Files:**
- Modify: `packages/server/src/prebuilt/index.ts`

**Step 1: Add Light Card to the prebuiltComponents array**

Add after the Light Switch entry:

```typescript
  {
    name: "Light Card",
    template: `<div class="light-card" id="light-card-{{param "entity"}}">
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
(function() {
  var entityId = '{{param "entity"}}';
  var el = document.getElementById('light-card-' + entityId);
  if (el && window.__ha) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', function() {
      window.__ha.openDialog('light-control', { entityId: entityId });
    });
  }
})();
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
```

**Step 2: Build**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```
feat: add Light Card prebuilt component with dialog trigger
```

---

### Task 7: Update Template Helper Reference

**Files:**
- Modify: `packages/admin/src/components/editors/TemplateHelperReference.tsx`

**Step 1: Add new helpers and interactive patterns to the reference**

In `packages/admin/src/components/editors/TemplateHelperReference.tsx`:

Add to the `helpers` array (after the `eq / gt / lt` entry, around line 92):

```typescript
  {
    name: "eachEntity",
    description: "Iterate over entities from a multiple/glob entity selector. Provides this.entity_id, this.state, this.attributes, this.domain.",
    snippets: [
      '{{#eachEntity "entities"}}{{this.attributes.friendly_name}}: {{this.state}}{{/eachEntity}}',
    ],
  },
```

Add to the `patterns` array (after the existing entries, around line 139):

```typescript
  {
    name: "Interactive: Toggle a light/switch",
    description:
      'Call HA services from templates using window.__ha.callService(). Requires interactive mode enabled on the dashboard.',
    code: `<div id="my-toggle">Toggle Light</div>
<script>
(function() {
  var entityId = '{{param "entity"}}';
  var el = document.getElementById('my-toggle');
  if (el && window.__ha) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', function() {
      window.__ha.callService(entityId.split('.')[0], 'toggle', { entity_id: entityId });
    });
  }
})();
</script>`,
  },
  {
    name: "Interactive: Open a dialog",
    description:
      'Open built-in interactive dialogs. Available types: light-control. Requires interactive mode.',
    code: `<div id="my-card">Open Light Controls</div>
<script>
(function() {
  var entityId = '{{param "entity"}}';
  var el = document.getElementById('my-card');
  if (el && window.__ha) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', function() {
      window.__ha.openDialog('light-control', { entityId: entityId });
    });
  }
})();
</script>`,
  },
```

**Step 2: Build admin**

Run: `cd packages/admin && pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```
feat: add interactive helpers and eachEntity to template reference
```

---

### Task 8: Monaco Handlebars Autocomplete

**Files:**
- Modify: `packages/admin/src/components/editors/CodeEditor.tsx`

**Step 1: Add Monaco completion provider for Handlebars helpers**

Modify `packages/admin/src/components/editors/CodeEditor.tsx` to register a completion provider when the editor mounts:

```tsx
import Editor, { type Monaco } from "@monaco-editor/react";
import { useRef } from "react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: "handlebars" | "css";
  height?: string;
}

const handlebarsHelpers = [
  { label: "state", insertText: 'state (param "${1:entity}")', detail: "Get entity state value" },
  { label: "attr", insertText: 'attr (param "${1:entity}") "${2:attribute}"', detail: "Get entity attribute" },
  { label: "param", insertText: 'param "${1:name}"', detail: "Get parameter value" },
  { label: "style", insertText: 'style "${1:name}"', detail: "Get global style value" },
  { label: "mdiIcon", insertText: 'mdiIcon "${1:mdi:icon}" size="${2:24}"', detail: "Render MDI icon as SVG" },
  { label: "iconFor", insertText: 'iconFor "${1:domain}"', detail: "Default icon for HA domain" },
  { label: "stateEquals", insertText: '#stateEquals (param "${1:entity}") "${2:value}"}}\n  $3\n{{/stateEquals', detail: "Conditional on state equality" },
  { label: "stateGt", insertText: '#stateGt (param "${1:entity}") ${2:value}}}\n  $3\n{{/stateGt', detail: "Conditional on state > value" },
  { label: "stateLt", insertText: '#stateLt (param "${1:entity}") ${2:value}}}\n  $3\n{{/stateLt', detail: "Conditional on state < value" },
  { label: "eachEntity", insertText: '#eachEntity "${1:selectorName}"}}\n  {{this.attributes.friendly_name}}: {{this.state}}\n{{/eachEntity', detail: "Iterate bound entities" },
  { label: "formatNumber", insertText: 'formatNumber (state (param "${1:entity}")) ${2:1}', detail: "Format number with decimals" },
  { label: "relativeTime", insertText: 'relativeTime (attr (param "${1:entity}") "last_changed")', detail: "Relative time display" },
  { label: "eq", insertText: 'eq (param "${1:name}") "${2:value}"', detail: "Equality comparison" },
  { label: "if", insertText: '#if ${1:condition}}}\n  $2\n{{/if', detail: "Conditional block" },
  { label: "each", insertText: '#each (param "${1:name}")}}\n  {{this}}\n{{/each', detail: "Iterate array" },
];

let completionProviderRegistered = false;

function registerHandlebarsCompletion(monaco: Monaco) {
  if (completionProviderRegistered) return;
  completionProviderRegistered = true;

  monaco.languages.registerCompletionItemProvider("html", {
    triggerCharacters: ["{"],
    provideCompletionItems(model, position) {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: Math.max(1, position.column - 3),
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      // Only suggest after {{
      if (!textUntilPosition.includes("{{")) return { suggestions: [] };

      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      return {
        suggestions: handlebarsHelpers.map((h) => ({
          label: h.label,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: h.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: h.detail,
          range,
        })),
      };
    },
  });
}

export function CodeEditor({
  value,
  onChange,
  language,
  height = "400px",
}: CodeEditorProps) {
  return (
    <Editor
      height={height}
      language={language === "handlebars" ? "html" : language}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      theme="vs-dark"
      beforeMount={(monaco) => {
        if (language === "handlebars") {
          registerHandlebarsCompletion(monaco);
        }
      }}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: "on",
        wordWrap: "on",
        automaticLayout: true,
        tabSize: 2,
        quickSuggestions: { strings: true, other: true, comments: false },
      }}
    />
  );
}
```

**Step 2: Build admin**

Run: `cd packages/admin && pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```
feat: add Monaco autocomplete for Handlebars template helpers
```

---

### Task 9: Final Build & Verification

**Files:** None (verification only)

**Step 1: Full rebuild**

Run: `pnpm build`
Expected: All packages build successfully with no errors

**Step 2: Verify prebuilt component count**

Check that `packages/server/src/prebuilt/index.ts` has 9 components total:
- Clock, Entity Value, Weather Card, Media Player, Entity List, Light Switch, Light Card, Tabs Container, Auto-Rotate Container

**Step 3: Commit all remaining changes (if any unstaged)**

Run: `git status` and verify clean working tree

**Step 4: Final commit if needed**

```
chore: final build verification for prebuilt components and dialog system
```
