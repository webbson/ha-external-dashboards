# Dashboard Tab Bar Theming & Icon Support

## Overview

Add theme styling for the dashboard tab bar and icon support for dashboard layout tabs.

## Data Model Changes

### `dashboardLayouts` table — new column

- `icon: text | null` — MDI icon name (e.g., `mdi:home-outline`)
- Validation: at least one of `icon` or `label` must be non-null

### `themes.standardVariables` — 5 new properties

| Variable | CSS Custom Property | Default |
|---|---|---|
| `tabBarBg` | `--db-tab-bar-bg` | `transparent` |
| `tabBarColor` | `--db-tab-bar-color` | `rgba(255,255,255,0.6)` |
| `tabBarActiveColor` | `--db-tab-bar-active-color` | `#ffffff` |
| `tabBarActiveBg` | `--db-tab-bar-active-bg` | `rgba(255,255,255,0.15)` |
| `tabBarFontSize` | `--db-tab-bar-font-size` | `14px` |

## Admin Changes

### LayoutTabModal

- Add `MdiIconSelector` for icon selection
- Make label optional but validate at least one of icon/label is provided
- Show validation error if both are empty

### DashboardEditor

- Pass `icon` through modal state, save alongside `label` to API

### ThemeEditor

- Add "Tab Bar" section to standard variables editor with the 5 new fields

## Display Changes

### DashboardRenderer

- Apply theme CSS variables to tab bar
- `tabBarBg` on the bar container
- `tabBarColor` / `tabBarActiveColor` / `tabBarActiveBg` on individual tabs
- Active tab styled as filled pill using `tabBarActiveBg`
- Render icon (via `@mdi/react` + `getIconPath()`) when present, label when present, or both
- Icon size matches `tabBarFontSize`

## API Changes

### PUT `/api/dashboards/:id/layouts`

- Accept `icon` field in each layout entry alongside `label`
- Validate at least one of icon/label per entry (Zod)

### GET `/api/display/:slug`

- Ensure `icon` field is included in dashboard layout response (already returns all fields)

## Migration

New Drizzle migration adding `icon` column to `dashboard_layouts` table. Existing rows remain valid since they already have labels.
