# Layout Editor Region Settings Table

## Problem

The "Detected Regions" area in the Layout editor shows a flat row of unlabeled dropdowns per region. It's hard to tell what each dropdown controls, and the "Chrome -> Component" / "Chrome -> Region" naming doesn't make sense to users.

## Design

Replace the current horizontal dropdown rows with an Ant Design `Table` component.

### Table Columns

| Column | Type | Options | Notes |
|--------|------|---------|-------|
| Region | Text | — | Monospace code-styled, read-only |
| Styling | Select | "Each component" / "Whole region" | Was "Chrome -> Components" / "Chrome -> Region" |
| Direction | Select | "Column down-arrow" / "Row right-arrow" | Unicode arrows after text for visual clarity |
| Justify | Select (clearable) | Start, Center, End, Space Between, Space Around, Space Evenly | |
| Align | Select (clearable) | Stretch, Start, Center, End | |
| Fill | Checkbox | — | Column header has info icon with tooltip: "Components will grow to fill the available space in this region" |

### Implementation Details

- Table uses `size="small"` and `pagination={false}`
- Same data model and save logic — purely a UI change
- Single file change: `packages/admin/src/pages/LayoutEditor.tsx`
- Direction options display arrows: "Column ↓" and "Row →"

## Scope

- No backend changes
- No data model changes
- No new dependencies (uses existing Ant Design Table, Tooltip)
