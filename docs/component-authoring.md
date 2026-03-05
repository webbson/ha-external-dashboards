# Component Authoring Guide

Components are the building blocks of dashboards. Each component has a **Handlebars template**, **CSS styles**, **parameter definitions**, and **entity selector definitions**.

## Template Syntax

Templates use [Handlebars](https://handlebarsjs.com/) with custom helpers for Home Assistant data.

### Accessing Entity Data

```handlebars
<!-- Get entity state -->
{{state "sensor.temperature"}}

<!-- Get entity attribute -->
{{attr "sensor.temperature" "unit_of_measurement"}}

<!-- Using entity from a parameter (dynamic binding) -->
{{state (param "entity")}}
{{attr (param "entity") "friendly_name"}}
```

### Accessing Parameters

```handlebars
{{param "label"}}
{{param "color"}}
```

### Accessing Global Styles

Dashboard-level style variables:

```handlebars
{{style "text-color"}}
{{style "card-bg"}}
```

Use in inline styles or reference as CSS custom properties in your stylesheet.

### Conditional Rendering

```handlebars
<!-- Block helper: show content if entity state equals value -->
{{#stateEquals "light.living_room" "on"}}
  <div class="light-on">Light is on</div>
{{else}}
  <div class="light-off">Light is off</div>
{{/stateEquals}}

<!-- Numeric comparisons -->
{{#stateGt "sensor.temperature" 25}}
  <span class="hot">Too hot!</span>
{{/stateGt}}

{{#stateLt "sensor.temperature" 15}}
  <span class="cold">Too cold!</span>
{{/stateLt}}
```

### Formatting Helpers

```handlebars
<!-- Format number with decimal places -->
{{formatNumber (state "sensor.temperature") 1}}
<!-- Output: 21.5 -->

<!-- Relative time from ISO timestamp -->
{{relativeTime (attr "sensor.motion" "last_changed")}}
<!-- Output: 5m ago -->

<!-- Icon class for entity domain -->
{{iconFor "light"}}
<!-- Output: mdi-lightbulb -->
```

### Comparison Helpers

For use in `{{#if}}` blocks:

```handlebars
{{#if (eq (state "light.bedroom") "on")}}
  ON
{{/if}}

{{#if (gt (state "sensor.temp") 30)}}
  <span class="warning">High</span>
{{/if}}
```

## Styles

Component CSS is scoped using `data-instance` attributes. Use `:host` as a selector prefix and it will be rewritten to target the specific instance:

```css
/* These apply only to this component instance */
:host .card {
  background: var(--card-bg, rgba(255, 255, 255, 0.05));
  border-radius: 12px;
  padding: 16px;
}

:host .value {
  font-size: 2em;
  color: var(--text-color, #fff);
}
```

### Using Global Style Variables

Dashboards define global style variables (key-value pairs). Reference them as CSS custom properties:

```css
.card {
  background: var(--card-bg);
  color: var(--text-color);
}
```

## Parameter Definitions

Parameters allow users to customize a component when placing it on a dashboard.

| Type | Description | Example |
|------|-------------|---------|
| `string` | Text input | Label, title, unit |
| `number` | Numeric input | Font size, interval |
| `boolean` | Toggle switch | Show/hide elements |
| `color` | Color picker | Accent color |
| `select` | Dropdown with options | Theme variant |

Define parameters in the **Visual** tab of the component editor. Access them in templates with `{{param "name"}}`.

## Entity Selector Definitions

Entity selectors let users bind HA entities when placing a component.

| Mode | Description | Value Type |
|------|-------------|------------|
| `single` | Pick one entity | `string` (entity_id) |
| `multiple` | Pick multiple entities | `string[]` |
| `glob` | Wildcard pattern (e.g., `sensor.temp_*`) | `string` |
| `area` | Select by HA area | `string[]` |
| `tag` | Select by tag | `string[]` |

### Domain Filtering

Each entity selector can optionally restrict which HA domains are selectable via `allowedDomains`. For example, a weather card's entity selector can set `allowedDomains: ["weather"]` so only weather entities appear in the picker. When empty or unset, all entities are available.

Set this in the **Visual** tab of the component editor using the domain multi-select next to each entity selector definition.

### Test Entities

The component editor supports **test entity bindings** — select real HA entities to use in the live preview while building your template. Test entities are saved with the component and pre-populated on next edit. They do not affect dashboard instances.

Set test entities in the "Test Entities" card below the hybrid editor in the component editor.

## Container Components

Container components hold other component instances as children. Three types:

- **Tabs** — Children shown in switchable tabs
- **Auto-rotate** — Children cycle on a timer
- **Stack** — Children stacked vertically

Mark a component as a container in the editor and set the container type. The display runtime handles child rendering — your template just needs a wrapper div.

## Examples

### Simple Sensor Card

```handlebars
<div class="sensor-card">
  <div class="icon">{{iconFor (param "domain")}}</div>
  <div class="name">{{param "label"}}</div>
  <div class="value">
    {{formatNumber (state (param "entity")) 1}}
    {{param "unit"}}
  </div>
  <div class="updated">{{relativeTime (attr (param "entity") "last_updated")}}</div>
</div>
```

### Light Toggle (Interactive Mode)

```handlebars
<div class="light-control">
  <div class="name">{{attr (param "entity") "friendly_name"}}</div>
  {{#stateEquals (param "entity") "on"}}
    <div class="status on">ON</div>
  {{else}}
    <div class="status off">OFF</div>
  {{/stateEquals}}
</div>
```

When interactive mode is enabled on the dashboard, you can add click handlers that call `window.callService()` (provided by the display runtime).

### Multi-Entity List

```handlebars
<div class="entity-list">
  <h3>{{param "title"}}</h3>
  <!-- Use multiple entity selector, entities available by binding name -->
</div>
```
