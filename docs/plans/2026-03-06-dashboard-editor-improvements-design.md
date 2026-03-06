# Dashboard Editor Improvements Design

**Date:** 2026-03-06

## Overview

Improve the Dashboard editing interface with two changes:
1. Settings tab uses a 3-column grid layout with conditional field visibility
2. Layouts and Components tabs merge into a single "Layouts" tab with an editable tab bar

## Settings Tab — 3-Column Grid

Use Ant Design `Row`/`Col` with `span={8}` (3 equal columns). Fields flow left-to-right:

- **Row 1:** Name | Slug | Access Mode
- **Row 2 (conditional):** Password *(password mode)* — or — Header Name + Header Value *(header mode)*
- **Row 3:** Theme | Max Width | Padding
- **Row 4:** Interactive Mode | Layout Switch Mode | Rotate Interval *(only if auto-rotate)*

Hidden fields simply don't render; rows with fewer items have empty trailing columns.

## Merged "Layouts" Tab

Replaces both the old Layouts and Components tabs.

### Tab Bar
- One tab per `dashboard_layout`, label = `dl.label || layout.name || "Layout N"`
- Small `EditOutlined` icon beside each tab label → opens Layout Tab Modal
- `tabBarExtraContent` renders a `+` button → opens same modal in add mode

### Tab Content
- `VisualLayoutGrid` — unchanged from current Components tab behavior
- Empty state when no layouts exist (shouldn't happen since add modal auto-creates first)

### Layout Tab Modal
- **Layout selector** — Select from `allLayouts`
- **Tab label** — Input (optional override)
- **Remove button** — Danger button, hidden when it's the last remaining tab
- On add: defaults to first available layout, appends to end of `dashLayouts`
- On remove: API handles cascade delete of component instances

## Unchanged
- Save/Cancel buttons at bottom
- Warning alert for public + interactive mode
- ComponentPickerModal and ComponentConfigModal
