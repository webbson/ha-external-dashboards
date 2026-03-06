# Prebuilt Components & Dialog System Design

Date: 2026-03-06

## Overview

Add three new prebuilt components (Entity List, Light Switch, Light Card), a global service call API (`window.__ha`), an interactive dialog system with a Light Control dialog, a template helper reference panel in the admin UI, and improved Monaco autocomplete for Handlebars.

## 1. Global Service Call API (`window.__ha`)

Expose `window.__ha` from `DisplayApp.tsx`:

- `window.__ha.callService(domain, service, data)` — calls HA service via WS
- `window.__ha.openDialog(type, props)` — opens a built-in interactive dialog
- `window.__ha.closeDialog()` — closes the active dialog

Constraints:
- Only registered when `dashboard.interactiveMode === true`
- Returns a promise (resolves on WS ack, rejects on error)
- Cleaned up on unmount (set to `undefined`)
- Server-side WS proxy already validates interactive mode and rate-limits (10/sec) — this is defense-in-depth

## 2. Dialog System

`DisplayApp.tsx` manages a `dialogState: { type: string, props: Record<string, unknown> } | null`.

- `window.__ha.openDialog(type, props)` sets the dialog state
- `window.__ha.closeDialog()` clears it
- A `<DialogOverlay>` component renders the active dialog as a React overlay (backdrop + centered panel)
- Dialog components receive: entity state, `callService`, and the dialog props
- Clicking the backdrop closes the dialog
- Extensible — adding future dialog types means adding a new React component to the registry

### Light Control Dialog (`light-control`)

Full-featured light control panel:
- Brightness slider (only if entity supports it, checks `brightness` attribute)
- Color temperature slider (if `color_temp` in `supported_color_modes`)
- Color picker (if `hs` or `rgb` in `supported_color_modes`)
- Mode selector (if `effect_list` attribute exists)
- Only shows controls the light entity actually supports

## 3. Entity List Component

**Type:** Handlebars prebuilt

**Entity selectors:**
- `entities` (mode: `multiple`) — user picks specific entities
- `entityPattern` (mode: `glob`) — auto-resolve matching entities

**Parameters:**
- `title` (string, default: "") — optional header
- `showIcon` (boolean, default: true)
- `showState` (boolean, default: true)
- `showUnit` (boolean, default: true)
- `showLastChanged` (boolean, default: false)
- `showFriendlyName` (boolean, default: true)

**New Handlebars helper:** `{{#eachEntity "selectorName"}}` — iterates over bound entities, providing `this.entity_id`, `this.state`, `this.attributes`, `this.domain` in each iteration.

**Rendered HTML:** Styled vertical list. Each row is a flex row with optional icon (via `mdiIcon` + `iconFor`), friendly name, state value + unit, and relative time. Respects theme variables.

## 4. Light Switch Component (Basic)

**Type:** Handlebars prebuilt

**Entity selector:** `entity` (mode: `single`, allowedDomains: `["light", "switch"]`)

**Parameters:**
- `label` (string, default: "Light")
- `showState` (boolean, default: true)

**Template:** Icon (bulb for light, toggle for switch) that changes color based on state (accent color when on, secondary when off), label, and optional state text. Clickable element calls `window.__ha.callService(domain, "toggle", { entity_id })` via inline `<script>`.

Simple component that teaches users the interactive pattern.

## 5. Light Card Component

**Type:** Handlebars prebuilt

**Entity selector:** `entity` (mode: `single`, allowedDomains: `["light"]`)

**Parameters:**
- `label` (string, default: "") — override friendly name
- `showBrightness` (boolean, default: true)

**Template:** Card showing light bulb icon (colored by state), friendly name or label override, state + brightness percentage. Tapping opens `window.__ha.openDialog("light-control", { entityId })` via inline `<script>`.

Heavy lifting (brightness, color, modes) lives in the dialog.

## 6. Template Helper Reference Panel

**Location:** Collapsible drawer in the Component Editor, alongside the Monaco editor.

**Content organized by category:**
- Entity helpers: `state`, `attr`, `stateEquals`, `stateGt`, `stateLt`, `eachEntity`
- Parameter helpers: `param`, `style`
- Display helpers: `mdiIcon`, `iconFor`, `formatNumber`, `relativeTime`
- Comparison helpers: `eq`, `gt`, `lt`
- Interactive: `window.__ha.callService()`, `window.__ha.openDialog()`

Each entry: signature, description, copy-pasteable example snippet.

**Monaco improvements:** Register a Handlebars completion provider that suggests helper names + signatures when typing `{{`.

## 7. Changes Summary

| Area | Changes |
|------|---------|
| Server prebuilt | 3 new components: Entity List, Light Switch, Light Card |
| Display runtime | `window.__ha` global, `DialogOverlay`, `LightControlDialog` React component |
| Display template | New `eachEntity` Handlebars helper |
| Admin UI | Template Helper Reference panel, Monaco Handlebars completion provider |

**Not changing:**
- Component table schema (everything stays Handlebars)
- Existing prebuilt components
- WS proxy (already handles `call_service`)
