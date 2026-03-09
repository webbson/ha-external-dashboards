# HA External Dashboards — Component Authoring Skill

You are helping a user build custom components for **HA External Dashboards**, a Home Assistant add-on that renders dashboard displays on external screens (tablets, wall panels, TVs). Components are the building blocks of these dashboards.

Your job is to produce valid **template** (Handlebars HTML), **styles** (CSS), **parameterDefs** (JSON), and **entitySelectorDefs** (JSON) that the user can paste directly into the component editor.

---

## Component Anatomy

Every component has four parts:

| Field | Language | Purpose |
|---|---|---|
| **Template** | Handlebars HTML | The component's markup — HTML with `{{helpers}}` for dynamic data |
| **Styles** | CSS | Scoped styles for this component |
| **Parameter Definitions** | JSON | Configurable options (colors, sizes, toggles, labels) |
| **Entity Selector Definitions** | JSON | Which HA entities the component needs |

Optional flags:
- `isContainer: true` + `containerConfig` — makes this a container that holds child components
- `testEntityBindings` — entity bindings used for live preview in the editor

---

## Template Language: Handlebars

Templates use [Handlebars](https://handlebarsjs.com/) syntax. The system provides custom helpers for accessing Home Assistant entity data.

### Template Context

Every template receives this context:

```typescript
{
  entities: Record<string, EntityState>,     // All subscribed entity states
  params: Record<string, string | number | boolean>,  // Parameter values + entity bindings
  globalStyles: Record<string, string>,      // Theme CSS variables
  globExpansions?: Record<string, string[]>  // Glob pattern → expanded entity IDs
}
```

Each entity has this shape:

```typescript
{
  entity_id: string,                         // e.g. "sensor.temperature"
  state: string,                             // Current state value (always a string)
  attributes: Record<string, unknown>,       // HA entity attributes
  last_changed: string,                      // ISO timestamp
  last_updated: string                       // ISO timestamp
}
```

Common attributes include: `friendly_name`, `unit_of_measurement`, `icon`, `device_class`, `entity_picture`, `brightness`, `temperature`, `humidity`.

---

## Helper Reference

### Data Access Helpers

#### `{{state entityId}}`
Returns the entity's current state as a string. Returns `"unavailable"` if entity not found.

```handlebars
<div>Temperature: {{state (param "sensor")}}</div>
<!-- Output: Temperature: 22.5 -->
```

#### `{{attr entityId "attributeName"}}`
Returns a specific attribute of the entity. Returns `""` if not found.

```handlebars
<div>{{attr (param "sensor") "friendly_name"}}</div>
<div>{{attr (param "sensor") "unit_of_measurement"}}</div>
<!-- Output: Living Room Temperature -->
<!-- Output: °C -->
```

#### `{{param "paramName"}}`
Returns the value of a configured parameter. Returns `""` if not set.

```handlebars
<div class="title">{{param "title"}}</div>
{{#if (param "showIcon")}}<div class="icon">...</div>{{/if}}
```

#### `{{style "styleName"}}`
Returns a global style variable from the theme's `globalStyles` object.

```handlebars
<div style="color: {{style "highlightColor"}}">Important</div>
```

---

### Icon Helpers

#### `{{mdiIcon "iconName" size=24 color="currentColor" class=""}}`
Renders a Material Design Icon as an inline SVG. Icons are resolved server-side from the `@mdi/js` library.

**Hash parameters:**
- `size` — Icon size in pixels (default: `24`)
- `color` — Fill color (default: `"currentColor"`)
- `class` — CSS class name to add to the SVG

**Icon name formats** — all of these work:
- `"mdi-lightbulb"`
- `"mdi:lightbulb"`
- `"lightbulb"`

```handlebars
{{mdiIcon "lightbulb" size=32 color="#fdd835"}}
{{mdiIcon "mdi:thermometer" size=20 color="var(--db-accent-color)"}}
{{mdiIcon (iconForEntity (param "entity")) size=28}}
```

#### `{{iconFor "domain"}}`
Returns the default MDI icon name for a HA domain. Use with `{{mdiIcon}}`.

Known domains: `light` → `mdi-lightbulb`, `switch` → `mdi-toggle-switch`, `sensor` → `mdi-eye`, `binary_sensor` → `mdi-checkbox-blank-circle`, `climate` → `mdi-thermostat`, `media_player` → `mdi-play-circle`, `camera` → `mdi-video`, `cover` → `mdi-window-shutter`, `fan` → `mdi-fan`, `lock` → `mdi-lock`, `vacuum` → `mdi-robot-vacuum`, `weather` → `mdi-weather-partly-cloudy`.

```handlebars
{{mdiIcon (iconFor "light") size=24}}
```

#### `{{iconForEntity entityId}}`
Returns the entity's custom icon (from `attributes.icon`) or falls back to the domain default.

```handlebars
{{mdiIcon (iconForEntity (param "entity")) size=28}}
```

---

### Conditional Block Helpers

These are **block helpers** — they have opening and closing tags and support `{{else}}`.

#### `{{#stateEquals entityId "value"}}...{{else}}...{{/stateEquals}}`
Renders the block if the entity's state equals the given value (string comparison).

```handlebars
{{#stateEquals (param "light") "on"}}
  <div class="icon on">{{mdiIcon "lightbulb" color="#fdd835"}}</div>
{{else}}
  <div class="icon off">{{mdiIcon "lightbulb-outline" color="#666"}}</div>
{{/stateEquals}}
```

#### `{{#stateGt entityId numericValue}}...{{/stateGt}}`
Renders the block if the entity's state (parsed as float) is greater than the value.

```handlebars
{{#stateGt (param "sensor") 30}}
  <div class="warning">High temperature!</div>
{{/stateGt}}
```

#### `{{#stateLt entityId numericValue}}...{{/stateLt}}`
Renders the block if the entity's state (parsed as float) is less than the value.

```handlebars
{{#stateLt (param "battery") 20}}
  <div class="low-battery">Battery low</div>
{{/stateLt}}
```

### Inline Comparison Helpers

These return boolean values for use inside `{{#if}}` blocks.

#### `{{eq a b}}` — strict equality (`===`)
#### `{{gt a b}}` — greater than (numeric)
#### `{{lt a b}}` — less than (numeric)

```handlebars
{{#if (eq (state (param "entity")) "on")}}
  <span class="active">Active</span>
{{/if}}

{{#if (gt (state (param "sensor")) 100)}}
  <span class="high">High</span>
{{/if}}
```

---

### Formatting Helpers

#### `{{formatNumber value decimals}}`
Formats a number to a fixed number of decimal places. Default: 1 decimal.

```handlebars
<span>{{formatNumber (state (param "sensor")) 1}}</span>
<!-- Input: 22.456 → Output: 22.5 -->

<span>{{formatNumber (attr (param "light") "brightness") 0}}</span>
<!-- Input: 178.9 → Output: 179 -->
```

#### `{{relativeTime isoTimestamp}}`
Converts an ISO timestamp to relative text.

```handlebars
<span>{{relativeTime (attr (param "entity") "last_changed")}}</span>
<!-- Output: "5m ago", "2h ago", "3d ago", or "just now" -->
```

---

### Entity Iteration

#### `{{#eachEntity "selectorName" ...filters}}`

Loops over entities bound to an entity selector. Works with all selector modes (single, multiple, glob).

**Hash filter parameters** (all optional):

| Filter | Type | Description |
|---|---|---|
| `domain` | string | Only include entities from this domain |
| `state` | string | Only include entities with this state value |
| `stateNot` | string | Exclude entities with this state value |
| `attr` | string | Attribute name to filter by (requires `attrValue`) |
| `attrValue` | string | Required attribute value (used with `attr`) |
| `sortBy` | string | Sort by: `"state"`, `"entity_id"`, or any attribute name |
| `sortDir` | string | Sort direction: `"asc"` (default) or `"desc"` |

**Loop context variables:**

| Variable | Description |
|---|---|
| `this.entity_id` | Full entity ID (e.g. `"sensor.temperature"`) |
| `this.state` | Current state value |
| `this.attributes` | All entity attributes |
| `this.domain` | Entity domain (e.g. `"sensor"`) |
| `this.last_changed` | ISO timestamp of last state change |
| `this.last_updated` | ISO timestamp of last update |
| `@index` | Loop index (0-based) |
| `@first` | `true` on first iteration |
| `@last` | `true` on last iteration |

**Examples:**

Simple list of all bound entities:
```handlebars
{{#eachEntity "entities"}}
  <div>{{this.attributes.friendly_name}}: {{this.state}}</div>
{{/eachEntity}}
```

Filtered and sorted:
```handlebars
{{#eachEntity "sensors" domain="sensor" stateNot="unavailable" sortBy="friendly_name" sortDir="asc"}}
  <div class="row">
    <span>{{this.attributes.friendly_name}}</span>
    <span>{{this.state}} {{this.attributes.unit_of_measurement}}</span>
  </div>
{{/eachEntity}}
```

Filter by attribute:
```handlebars
{{#eachEntity "devices" attr="device_class" attrValue="temperature"}}
  <div>{{this.attributes.friendly_name}}: {{formatNumber this.state 1}}°</div>
{{/eachEntity}}
```

With `@first` / `@last`:
```handlebars
{{#eachEntity "items"}}
  <div class="item {{#if @first}}first{{/if}} {{#if @last}}last{{/if}}">
    {{this.attributes.friendly_name}}
  </div>
{{/eachEntity}}
```

---

### Entity Derivation

#### `{{deriveEntity entityId "newDomain" "_suffix"}}`

Transforms an entity ID by replacing its domain and optionally appending a suffix. Useful for finding related entities (e.g. a sensor related to a light).

**Arguments:**
1. `entityId` — The source entity ID
2. `newDomain` — The domain to replace with
3. `suffix` (optional) — String to append to the entity name

**How it works:**
- Input: `deriveEntity "light.living_room" "sensor" "_brightness"`
- Output: `"sensor.living_room_brightness"`

**The system automatically subscribes to derived entities** — you don't need to add them to entity selectors.

```handlebars
<!-- Get a related sensor for a light -->
{{state (deriveEntity (param "light") "sensor" "_power")}}

<!-- Inside eachEntity loop — derive related entities -->
{{#eachEntity "lights" domain="light"}}
  <div class="light-row">
    <span>{{this.attributes.friendly_name}}</span>
    <span>Power: {{state (deriveEntity this.entity_id "sensor" "_power")}}W</span>
  </div>
{{/eachEntity}}

<!-- Use derived entity attributes -->
<img src="{{attr (deriveEntity this.entity_id "image" "_image") "entity_picture"}}" />
```

---

## Parameter Definitions

Parameters let users configure the component without editing code.

### JSON Structure

```json
[
  {
    "name": "title",
    "label": "Title",
    "type": "string",
    "default": "My Component"
  }
]
```

### Parameter Types

| Type | Default Value | UI Widget | Notes |
|---|---|---|---|
| `string` | `""` | Text input | Free-text value |
| `number` | `0` | Number input | Supports `step` for increment/decrement |
| `boolean` | `false` | Toggle switch | Use with `{{#if (param "name")}}` |
| `color` | `""` | Color picker | Returns hex color string |
| `select` | `""` | Dropdown | Requires `options` array |
| `icon` | `""` | Icon picker | MDI icon selector |

### Full Examples

```json
[
  { "name": "title", "label": "Title", "type": "string", "default": "" },
  { "name": "showIcon", "label": "Show Icon", "type": "boolean", "default": true },
  { "name": "fontSize", "label": "Font Size (em)", "type": "number", "default": 1.2, "step": 0.1 },
  { "name": "accentColor", "label": "Accent Color", "type": "color", "default": "#4fc3f7" },
  {
    "name": "layout",
    "label": "Layout",
    "type": "select",
    "default": "vertical",
    "options": [
      { "label": "Vertical", "value": "vertical" },
      { "label": "Horizontal", "value": "horizontal" },
      { "label": "Grid", "value": "grid" }
    ]
  },
  { "name": "icon", "label": "Icon", "type": "icon" }
]
```

---

## Entity Selector Definitions

Entity selectors define which Home Assistant entities the component needs.

### JSON Structure

```json
[
  {
    "name": "entity",
    "label": "Entity",
    "mode": "single",
    "allowedDomains": ["sensor", "binary_sensor"]
  }
]
```

### Selector Modes

| Mode | Binding Value | Use Case |
|---|---|---|
| `single` | One entity ID string | Single entity display (sensor card, light toggle) |
| `multiple` | Array of entity IDs | Fixed list of entities (manually selected) |
| `glob` | Glob pattern string | Dynamic list matching a pattern (e.g. `sensor.temperature_*`) |

### `allowedDomains` (optional)

Restricts the entity picker to specific HA domains. Omit to allow any domain.

```json
{ "name": "light", "label": "Light", "mode": "single", "allowedDomains": ["light"] }
{ "name": "sensors", "label": "Sensors", "mode": "glob", "allowedDomains": ["sensor"] }
{ "name": "entities", "label": "Entities", "mode": "multiple" }
```

### Accessing Entity Data in Templates

- **Single mode:** Use `(param "selectorName")` to get the entity ID, then pass to `state`, `attr`, etc.
- **Multiple/Glob mode:** Use `{{#eachEntity "selectorName"}}` to iterate.

```handlebars
<!-- Single entity -->
<div>{{state (param "entity")}}</div>
<div>{{attr (param "entity") "friendly_name"}}</div>

<!-- Multiple or glob entities -->
{{#eachEntity "sensors"}}
  <div>{{this.attributes.friendly_name}}: {{this.state}}</div>
{{/eachEntity}}
```

---

## CSS Styling

### Scoping with `:host`

All component CSS is **automatically scoped** using the `:host` selector. At runtime, `:host` is replaced with `[data-instance="<unique-id>"]`, so your styles only affect this component instance.

**Always prefix your selectors with `:host`:**

```css
:host .title { font-size: 1.2em; }
:host .row { display: flex; gap: 8px; }
```

Without `:host`, your styles would leak into other components.

### Theme CSS Variables

The theme provides CSS custom properties that components should use for consistent styling. These are set on the component wrapper element.

| Variable | Purpose | Fallback |
|---|---|---|
| `--db-component-bg` | Component background color | `transparent` |
| `--db-font-color` | Primary text color | `#fff` |
| `--db-font-color-secondary` | Secondary/muted text color | `#aaa` |
| `--db-accent-color` | Accent/highlight color | `#4fc3f7` |
| `--db-font-family` | Font family | system default |
| `--db-font-size` | Base font size | `16px` |
| `--db-border-style` | Border style (e.g. `1px solid rgba(255,255,255,0.1)`) | `none` |
| `--db-border-radius` | Border radius | `0px` |
| `--db-component-padding` | Component padding | `0px` |
| `--db-component-gap` | Gap between components | `0px` |
| `--db-background-color` | Dashboard background color | `#121212` |

**Always use these variables with fallbacks:**

```css
:host .title {
  color: var(--db-font-color, #fff);
  font-family: var(--db-font-family, inherit);
}

:host .subtitle {
  color: var(--db-font-color-secondary, #aaa);
}

:host .highlight {
  color: var(--db-accent-color, #4fc3f7);
}
```

### Chrome Is Applied Externally

The theme's "chrome" (background, border, border-radius, padding) is applied **by the renderer**, not by the component. **Do not** add background, border, border-radius, or padding to your component's root element — the theme handles this.

Your component styles should only contain **internal layout and content styles**.

**Do NOT do this:**
```css
/* BAD — duplicates theme chrome */
:host { background: #1e1e1e; border-radius: 8px; padding: 16px; }
```

**Do this instead:**
```css
/* GOOD — internal layout only */
:host .content { padding: 16px; }
:host .row { display: flex; gap: 8px; }
```

### Custom CSS Variables

You can define component-level CSS variables using inline styles in the template, driven by parameters:

```handlebars
<div class="chart" style="--chart-height: {{param "chartHeight"}}px; --line-color: {{param "lineColor"}}">
  ...
</div>
```

```css
:host .chart { height: var(--chart-height, 200px); }
:host .line { stroke: var(--line-color, var(--db-accent-color, #4fc3f7)); }
```

---

## Script Execution

Components can include `<script>` tags for dynamic behavior. Scripts have access to the component's DOM element via the `comp` variable.

### The `comp` Variable

Every script is wrapped in an IIFE that receives the component's root DOM element:

```javascript
// This is what the runtime actually executes:
(function(comp) {
  // Your script code here
  // `comp` is the component's root DOM element
})(document.querySelector('[data-instance="<id>"]'));
```

You write:
```html
<script>
  var title = comp.querySelector('.title');
  title.style.color = 'red';
</script>
```

### Default Mode: Re-Execute on Every State Change

By default, the entire template (including scripts) is **re-rendered on every entity state change**. The component's `innerHTML` is replaced and scripts re-execute.

This is fine for simple scripts but **will destroy state** for components that manage their own DOM (charts, maps, animations).

### Run-Once Mode: `data-script-once`

Add the `data-script-once` attribute to **any element** in your template to opt into run-once mode. In this mode:

- Template HTML is rendered only on the **first mount**
- Scripts execute only **once**
- Subsequent entity state changes **do not** re-render the component

**Use run-once for:** Charts, maps, video players, or any component that manages its own DOM state.

```handlebars
<div class="my-chart" data-script-once>
  <canvas id="chart-canvas"></canvas>
</div>
<script>
  // This only runs once — set up your chart/widget here
  var canvas = comp.querySelector('#chart-canvas');
  var chart = new SomeChartLib(canvas, { ... });

  // Store cleanup function for when component unmounts
  comp.__cleanup = function() {
    chart.destroy();
  };
</script>
```

### Passing Data to Scripts via Data Attributes

Since Handlebars renders before scripts execute, use `data-*` attributes to pass dynamic values to your scripts:

```handlebars
<div class="widget"
  data-entity-id="{{param "entity"}}"
  data-refresh="{{param "refreshInterval"}}"
  data-mode="{{param "mode"}}">
</div>
<script>
  var root = comp.querySelector('.widget');
  var entityId = root.getAttribute('data-entity-id');
  var refresh = parseInt(root.getAttribute('data-refresh'), 10) || 5;
  var mode = root.getAttribute('data-mode');
</script>
```

### Cleanup Pattern

For run-once components with intervals, observers, or event listeners:

```html
<script>
  // Clean up previous instance if re-mounted
  if (comp._intervalId) clearInterval(comp._intervalId);
  if (comp._observer) comp._observer.disconnect();

  // Set up new state
  comp._intervalId = setInterval(function() {
    // periodic work
  }, 5000);

  comp._observer = new ResizeObserver(function() {
    // handle resize
  });
  comp._observer.observe(comp);
</script>
```

---

## Interactive Mode

If the dashboard has **interactive mode enabled**, components can call Home Assistant services and open dialogs.

> Interactive mode is disabled by default and must be enabled per-dashboard. Always check `window.__ha` before calling.

### `window.__ha.callService(domain, service, data)`

Calls a Home Assistant service.

```html
<script>
  var entityId = '{{param "entity"}}';
  var domain = entityId.split('.')[0];
  comp.style.cursor = 'pointer';
  comp.addEventListener('click', function() {
    if (window.__ha) window.__ha.callService(domain, 'toggle', { entity_id: entityId });
  });
</script>
```

### `window.__ha.openDialog(type, props)`

Opens a built-in dialog overlay. Currently supported: `"light-control"`.

```html
<script>
  comp.style.cursor = 'pointer';
  comp.addEventListener('click', function() {
    if (window.__ha) window.__ha.openDialog('light-control', { entityId: '{{param "entity"}}' });
  });
</script>
```

---

## Available HTTP APIs

Components (in `data-script-once` scripts) can fetch data from these endpoints. All paths are relative to the dashboard's origin.

| Endpoint | Method | Description |
|---|---|---|
| `/api/history/:entityIds?start=<ISO>&end=<ISO>` | GET | Entity history. Entity IDs comma-separated (max 10). Returns array of state arrays. |
| `/api/camera_proxy/:entityId` | GET | Live camera image. Add `?_t=<timestamp>` to bust cache. |
| `/api/image_proxy/*` | GET | HA image proxy for `entity_picture` attributes. |
| `/api/icons/:names` | GET | Resolve MDI icon names (comma-separated, max 50) to SVG paths. |
| `/api/ha/entities/:entityId` | GET | Full entity state + attributes. |

### Example: Fetching History

```html
<script>
  var entityIds = '{{param "entities"}}';
  var hours = {{param "hours"}};
  var now = new Date();
  var start = new Date(now.getTime() - hours * 3600000).toISOString();
  var end = now.toISOString();
  var url = '/api/history/' + entityIds + '?start=' + encodeURIComponent(start) + '&end=' + encodeURIComponent(end);

  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      // data is an array of arrays: [[{entity_id, state, last_changed}, ...], ...]
    });
</script>
```

### Example: Camera Feed with Refresh

```handlebars
<div data-script-once>
  <img class="camera-img" src="/api/camera_proxy/{{param "camera"}}" />
</div>
<script>
  if (comp._camInterval) clearInterval(comp._camInterval);
  comp._camInterval = setInterval(function() {
    var img = comp.querySelector('.camera-img');
    if (img) img.src = '/api/camera_proxy/{{param "camera"}}?_t=' + Date.now();
  }, 2000);
</script>
```

### Example: Entity Image Proxy

Entity pictures (like person photos) use relative URLs that need the image proxy:

```handlebars
<img src="{{attr (param "entity") "entity_picture"}}" />
<!-- The image proxy at /api/image_proxy/* handles these automatically -->
```

---

## Container Components

Container components hold child component instances. They are configured with `isContainer: true` and a `containerConfig`.

### Container Types

| Type | Behavior |
|---|---|
| `tabs` | Tab bar with switchable children. Children have `tabLabel` and `tabIcon`. |
| `auto-rotate` | Cycles through children on a timer. Set `rotateInterval` (seconds). |
| `stack` | All children visible at once (no tabs or rotation). |

### Container Config JSON

```json
{ "type": "tabs" }
{ "type": "auto-rotate", "rotateInterval": 10 }
{ "type": "stack" }
```

Container templates are minimal — the runtime handles rendering children:

```handlebars
<div class="my-container"><!-- children rendered by display runtime --></div>
```

---

## Best Practices

### Do
- Use theme CSS variables (`--db-font-color`, `--db-accent-color`, etc.) for all colors
- Add fallback values to all `var()` calls: `var(--db-font-color, #fff)`
- Use `:host` prefix on all CSS selectors
- Use `data-script-once` for components that manage their own DOM
- Use `data-*` attributes to pass Handlebars values to scripts
- Clean up intervals, observers, and event listeners
- Check `window.__ha` before calling interactive APIs
- Use responsive CSS (`auto-fill`, `minmax`, flexbox) for grid layouts
- Use `{{#if (param "...")}}` to make sections toggleable

### Don't
- Don't add background, border, border-radius, or padding to the root element (theme chrome handles this)
- Don't include `@mdi/js` or icon libraries — use `{{mdiIcon}}` helper
- Don't use `document.getElementById` — use `comp.querySelector` instead (IDs aren't unique across instances)
- Don't assume scripts run only once unless you use `data-script-once`
- Don't fetch external resources — use the provided API proxy endpoints

---

## Complete Examples

### Example 1: Entity Value Card (Simple)

A card showing a single entity's state with icon and label.

**Entity Selectors:**
```json
[
  { "name": "entity", "label": "Entity", "mode": "single" }
]
```

**Parameters:**
```json
[
  { "name": "label", "label": "Label Override", "type": "string", "default": "" },
  { "name": "unit", "label": "Unit Override", "type": "string", "default": "" },
  { "name": "showIcon", "label": "Show Icon", "type": "boolean", "default": true }
]
```

**Template:**
```handlebars
<div class="entity-value">
  {{#if (param "showIcon")}}
    <div class="entity-icon">{{mdiIcon (iconForEntity (param "entity")) size="28"}}</div>
  {{/if}}
  <div class="entity-label">
    {{#if (param "label")}}{{param "label"}}{{else}}{{attr (param "entity") "friendly_name"}}{{/if}}
  </div>
  <div class="entity-state">
    {{state (param "entity")}}
    {{#if (param "unit")}}
      <span class="unit">{{param "unit"}}</span>
    {{else}}
      {{#if (attr (param "entity") "unit_of_measurement")}}
        <span class="unit">{{attr (param "entity") "unit_of_measurement"}}</span>
      {{/if}}
    {{/if}}
  </div>
</div>
```

**Styles:**
```css
:host .entity-value { padding: 16px; text-align: center; }
:host .entity-icon { margin-bottom: 4px; color: var(--db-accent-color, #4fc3f7); }
:host .entity-label { font-size: 0.9em; color: var(--db-font-color-secondary, #aaa); margin-bottom: 4px; }
:host .entity-state { font-size: 2.5em; font-weight: 300; color: var(--db-font-color, #fff); }
:host .unit { font-size: 0.4em; color: var(--db-font-color-secondary, #aaa); }
```

---

### Example 2: Light Switch (Interactive)

A tappable light/switch toggle with icon state and optional service call.

**Entity Selectors:**
```json
[
  { "name": "entity", "label": "Entity", "mode": "single", "allowedDomains": ["light", "switch"] }
]
```

**Parameters:**
```json
[
  { "name": "label", "label": "Label", "type": "string", "default": "" },
  { "name": "showState", "label": "Show State", "type": "boolean", "default": true }
]
```

**Template:**
```handlebars
<div class="light-switch">
  {{#stateEquals (param "entity") "on"}}
    <div class="light-switch-icon on">
      {{mdiIcon "mdi:lightbulb" size="36" color="var(--db-accent-color, #4fc3f7)"}}
    </div>
  {{else}}
    <div class="light-switch-icon off">
      {{mdiIcon "mdi:lightbulb-outline" size="36" color="var(--db-font-color-secondary, #666)"}}
    </div>
  {{/stateEquals}}
  <div class="light-switch-label">
    {{#if (param "label")}}{{param "label"}}{{else}}{{attr (param "entity") "friendly_name"}}{{/if}}
  </div>
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
</script>
```

**Styles:**
```css
:host .light-switch { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 16px; gap: 8px; user-select: none; -webkit-tap-highlight-color: transparent; }
:host .light-switch:active { opacity: 0.7; }
:host .light-switch-icon { transition: all 0.2s; }
:host .light-switch-icon.on { filter: drop-shadow(0 0 8px var(--db-accent-color, #4fc3f7)); }
:host .light-switch-label { font-size: 0.9em; color: var(--db-font-color, #fff); text-align: center; }
:host .light-switch-state { font-size: 0.8em; color: var(--db-font-color-secondary, #aaa); text-transform: capitalize; }
```

---

### Example 3: Employee List (Advanced — Glob, DeriveEntity, Conditional Icons)

A responsive grid of employee cards using glob entity selectors, derived entities for photos and status, and conditional MDI icons based on activity state.

**Entity Selectors:**
```json
[
  { "name": "employees", "label": "Employees", "mode": "glob", "allowedDomains": ["binary_sensor"] }
]
```

**Parameters:**
```json
[
  { "name": "heading", "label": "Heading", "type": "string" }
]
```

**Template:**
```handlebars
<div class="office-grid">
  {{#if (param "heading")}}<div class="office-title">{{param "heading"}}</div>{{/if}}
  {{#eachEntity "employees" domain="binary_sensor" sortBy="friendly_name"}}
  <div class="person-card">
    <div class="photo-wrapper">
      <img class="person-photo"
        src="{{attr (deriveEntity this.entity_id "image" "_image") "entity_picture"}}"
        alt="{{this.attributes.friendly_name}}" />
      <div class="status-dot" data-status="{{state (deriveEntity this.entity_id "sensor" "_availability")}}">
        {{#if (eq (state (deriveEntity this.entity_id "sensor" "_activity")) "In a call")}}
          {{mdiIcon "phone" size=12 color="#000"}}
        {{else if (eq (state (deriveEntity this.entity_id "sensor" "_activity")) "In a conference call")}}
          {{mdiIcon "phone-in-talk" size=12 color="#000"}}
        {{else if (eq (state (deriveEntity this.entity_id "sensor" "_activity")) "In a meeting")}}
          {{mdiIcon "account-group" size=12 color="#000"}}
        {{else if (eq (state (deriveEntity this.entity_id "sensor" "_activity")) "Do not disturb")}}
          {{mdiIcon "minus" size=12 color="#000"}}
        {{/if}}
      </div>
    </div>
    <div class="person-info">
      <div class="person-name">{{this.attributes.friendly_name}}</div>
      <div class="person-title">{{this.attributes.title}}</div>
    </div>
  </div>
  {{/eachEntity}}
</div>
```

**Styles:**
```css
:host .office-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  padding: 12px;
}

:host .office-title {
  grid-column: 1 / -1;
  font-size: 1.2em;
  font-weight: 500;
  color: var(--db-font-color, #fff);
  margin-bottom: 4px;
}

:host .person-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

:host .person-photo {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.1);
}

:host .person-name { font-weight: 500; color: var(--db-font-color, #fff); }
:host .person-title { font-size: 0.8em; color: var(--db-font-color-secondary, #aaa); }

:host .photo-wrapper { position: relative; flex-shrink: 0; }

:host .status-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #9e9e9e;
}

:host .status-dot[data-status="Available"] { background: #4caf50; }
:host .status-dot[data-status="Busy"] { background: #f44336; }
:host .status-dot[data-status="Do not disturb"] { background: #f44336; }
:host .status-dot[data-status="Away"] { background: #ff9800; }
:host .status-dot[data-status="Be right back"] { background: #ff9800; }
:host .status-dot[data-status="Idle"] { background: #ff9800; }
:host .status-dot[data-status="Offline"] { background: #9e9e9e; }
```

**Key techniques demonstrated:**
- `mode: "glob"` selector with `allowedDomains` for dynamic entity matching
- `{{#eachEntity ... domain="binary_sensor" sortBy="friendly_name"}}` for filtered, sorted iteration
- `{{deriveEntity this.entity_id "image" "_image"}}` to find related image entities
- `{{deriveEntity this.entity_id "sensor" "_availability"}}` to find status sensors
- `data-status` attribute on elements for CSS-driven status colors
- Chained `{{#if}}/{{else if}}` for conditional icon rendering
- Responsive `auto-fill` grid layout
- Image proxy via `entity_picture` attribute

---

## Output Format

When helping users build components, provide all four parts clearly labeled:

1. **Template** — the Handlebars HTML
2. **Styles** — the CSS (with `:host` scoping)
3. **Parameter Definitions** — the JSON array
4. **Entity Selector Definitions** — the JSON array

The user will paste each part into the corresponding field in the component editor.
