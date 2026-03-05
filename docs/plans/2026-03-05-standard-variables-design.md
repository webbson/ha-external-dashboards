# Standard Dashboard Variables & Background Picker

## Overview

Add a structured set of standard CSS variables to every dashboard, edited via dedicated UI controls in the Global Styles tab. These are injected as CSS custom properties on the dashboard root element AND available via `{{style}}` in Handlebars templates. The existing custom key-value pairs remain below for power users.

## Standard Variables

| Variable | CSS Property | Default | UI Control |
|---|---|---|---|
| Component Background | `--db-component-bg` | `transparent` | Color picker |
| Primary Font Color | `--db-font-color` | `#ffffff` | Color picker |
| Secondary Font Color | `--db-font-color-secondary` | `#aaaaaa` | Color picker |
| Accent Color | `--db-accent-color` | `#1890ff` | Color picker |
| Font Family | `--db-font-family` | `inherit` | Text input |
| Font Size | `--db-font-size` | `16px` | Text input |
| Border Style | `--db-border-style` | `none` | Text input |
| Border Radius | `--db-border-radius` | `0px` | Text input |
| Component Padding | `--db-component-padding` | `0px` | Text input |
| Component Gap | `--db-component-gap` | `0px` | Text input |

## Background Picker

- Radio toggle: **Color** / **Image**
- Color mode: color picker, sets `--db-background-color` (default: `#000000`)
- Image mode: dropdown of image assets with thumbnail preview after selection, sets `--db-background-image`
- Stored as `backgroundType: "color" | "image"`, `backgroundColor`, `backgroundImage` (asset filename)

## Data Model

New `standard_variables` JSON column on the `dashboards` table (alongside existing `global_styles`):

```typescript
interface StandardVariables {
  componentBg: string;
  fontColor: string;
  fontColorSecondary: string;
  accentColor: string;
  fontFamily: string;
  fontSize: string;
  borderStyle: string;
  borderRadius: string;
  componentPadding: string;
  componentGap: string;
  backgroundType: "color" | "image";
  backgroundColor: string;
  backgroundImage: string; // asset filename or empty
}
```

Default values applied when any field is empty/missing, so existing dashboards work without migration.

## CSS Injection

On the display side, standard variables are rendered as CSS custom properties on the root element:

```css
:root {
  --db-component-bg: transparent;
  --db-font-color: #ffffff;
  --db-font-color-secondary: #aaaaaa;
  --db-accent-color: #1890ff;
  --db-font-family: inherit;
  --db-font-size: 16px;
  --db-border-style: none;
  --db-border-radius: 0px;
  --db-component-padding: 0px;
  --db-component-gap: 0px;
}
body {
  background-color: var(--db-background-color);
  /* or when image mode: */
  background-image: url(/assets/bg.jpg);
  background-size: cover;
  background-position: center;
}
```

Standard variables are also available via `{{style "componentBg"}}` in Handlebars templates for backward compatibility.

## Admin UI

The **Global Styles** tab gets two sections:

1. **Standard Variables** (top) — structured form with labeled color pickers and text inputs, plus the background picker with radio toggle
2. **Custom Variables** (below) — existing key-value pair editor, unchanged

### Background Picker UI

- Radio group: Color | Image
- Color mode: Ant Design `ColorPicker`
- Image mode: `Select` dropdown listing image assets by name, with a thumbnail preview shown after selection

### Asset Picker

Select dropdown populated from `/api/assets` filtered to image mime types. After selection, shows a small thumbnail of the chosen image below the dropdown.

## Preview

Both LivePreview (admin) and server-side preview inject the CSS custom properties from standard variables, so the admin preview reflects changes in real time.

## Files to Modify

### Shared
- `packages/shared/src/types.ts` — add `StandardVariables` interface and defaults constant

### Server
- `packages/server/src/db/schema.ts` — add `standardVariables` column to dashboards table
- `drizzle/` — new migration for the column
- `packages/server/src/routes/dashboards.ts` — include `standardVariables` in CRUD
- `packages/server/src/routes/preview.ts` — inject CSS custom properties in preview
- `packages/server/src/routes/display.ts` — include `standardVariables` in display config response

### Admin
- `packages/admin/src/pages/DashboardEditor.tsx` — add Standard Variables section to Global Styles tab
- New component: `packages/admin/src/components/dashboard/StandardVariablesForm.tsx`
- New component: `packages/admin/src/components/dashboard/BackgroundPicker.tsx`
- New component: `packages/admin/src/components/dashboard/AssetImagePicker.tsx`

### Display
- `packages/display/src/DisplayApp.tsx` — inject CSS custom properties from standardVariables
- `packages/display/src/runtime/ComponentRenderer.tsx` — apply `--db-component-gap` to region grids
