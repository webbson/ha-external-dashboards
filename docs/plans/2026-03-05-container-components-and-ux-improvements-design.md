# Container Components & UX Improvements Design

## Features

### 1. Functional Container Components (Tabs & Auto-Rotate)

**Schema:** Add `tabLabel` (text, nullable) and `tabIcon` (text, nullable) columns to `component_instances`. These apply when `parentInstanceId` is set.

**Admin UI — Nesting:**
- Container instances in VisualLayoutGrid show a distinct bordered section with type label
- "+" button inside container opens ComponentPickerModal (containers filtered out — no nesting)
- Child instances listed in order with tab label + icon
- Clicking a child opens ComponentConfigModal with extra "Tab Label" and "Tab Icon" fields
- New reusable `MdiIconSelector` component (searchable dropdown with icon previews, uses `@mdi/js`)

**Display Runtime:**
- ComponentRenderer detects container components and renders dedicated container components instead of Handlebars
- `TabsContainer`: Tab bar with label + MDI icon per child, renders active child's ComponentRenderer. Styled with dashboard standard variables. First tab active by default.
- `AutoRotateContainer`: Renders one child at a time, cycles on timer from `containerConfig.rotateInterval` (default 10s). No visible controls.
- RegionRenderer already filters `parentInstanceId === null` — no changes needed

**Component list:** Hide containers where `isContainer && isPrebuilt` from ComponentList. Still visible in ComponentPickerModal for dashboard placement.

### 2. Copy Component Button

- "Copy" action in ComponentList alongside Edit/Delete
- New `POST /api/components/:id/copy` endpoint
- Duplicates component with name `"{name} (Copy)"`, strips `isPrebuilt`
- Navigates to new component's editor

### 3. New Component Base Template

Pre-populate new components with:
- Template: `<div class="component">{{!-- your content here --}}</div>`
- Styles: `:host` block using standard variables + `.component` with padding

### 4. Component Editor Preview with Dashboard Styling

- ComponentEditor fetches `GET /api/dashboards` on mount
- Auto-selects first dashboard, passes `standardVariables` + `globalStyles` to LivePreview
- Dropdown above preview to switch dashboards
- Falls back to defaults if no dashboards exist
