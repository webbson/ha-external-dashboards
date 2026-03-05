# Visual Layout Editor & Component Editor Enhancements

## Problem

The current dashboard editor uses a table-based interface for placing components into layout regions. Users must select a dashboard layout from a dropdown, then add component instances as table rows, expanding each to configure entity bindings and parameters. There is no visual representation of the layout, making it difficult to understand spatial arrangement. The component editor also lacks entity type filtering and persistent test entities for previewing.

## Design

### 1. Visual Layout Editor (Dashboard Editor - Components Tab)

Replace the "Components" tab with an interactive CSS grid editor.

**Layout selector:** Tab bar above the grid, one tab per dashboard layout (shows label or layout name). Replaces the current dropdown.

**Grid display:** Renders the layout's `gridTemplate` CSS so regions match real dashboard proportions.

**Empty regions:** Dashed border, "+" icon, region label. Click opens component picker modal.

**Populated regions:** Component cards stacked vertically by sortOrder. Each card shows the component name and summary (bound entity IDs). Click a card to open config modal. Small "+" button at bottom of region to add another component.

**Drag-to-reorder:** Within a region, drag cards to reorder (updates sortOrder). Cross-region drag also supported (updates regionId). Uses `@dnd-kit/core` + `@dnd-kit/sortable`.

### 2. Component Picker Modal

Opens when clicking "+" on a region.

**Content:** Grid of component cards with names. Search/filter bar at top. Flat list, no categories.

**Flow:** Select a component to create a new `componentInstance` with default parameter values and empty entity bindings, then immediately open the config modal.

### 3. Component Config Modal

Opens when clicking a component card or after adding a new component.

**Layout:**
- Title: Component name + region label
- Entity bindings section: One entity selector per `entitySelectorDef`, filtered by `allowedDomains`
- Parameter values section: Type-specific inputs per `parameterDef`, pre-filled with defaults
- Visibility rules section: Collapsible, existing rule editor
- Live preview: Right side (or bottom on narrow screens), rendered via `/api/preview/render`, updates on entity/parameter changes
- Save/Cancel buttons, Delete button (bottom-left with confirmation)

### 4. Entity Type Filtering (Component Editor)

**EntitySelectorDef changes:** Add optional `allowedDomains: string[]` field. In the visual editor, each entity selector def gets a multi-select for HA entity domains (e.g. `media_player`, `light`, `sensor`). Domain list derived from `/api/ha/entities` by extracting unique prefixes. Empty means all entities selectable (backwards compatible).

**Filtering applies in:** Component editor test entity pickers and dashboard editor config modal entity selectors.

### 5. Test Entity Bindings (Component Editor)

**New field:** `testEntityBindings: Record<string, string | string[]>` on the `components` table (JSON column, nullable).

**UI:** Below each entity selector def in the component editor, a "Test Entity" picker appears (filtered by `allowedDomains`). Selected test entities persist on save and feed into LivePreview. Pre-populated on next edit.

### 6. Prebuilt Component Updates

Update seeded components with appropriate `allowedDomains`:

| Component | Entity Selector | allowedDomains |
|-----------|----------------|----------------|
| Entity Value | entity | _(none - any entity)_ |
| Weather Card | entity | `["weather"]` |
| Media Player | entity | `["media_player"]` |
| Clock | _(none)_ | N/A |
| Image Slideshow | _(none)_ | N/A |
| Tabs Container | _(none)_ | N/A |
| Auto-Rotate Container | _(none)_ | N/A |

## Schema Changes

**EntitySelectorDef type** (shared package):
```typescript
interface EntitySelectorDef {
  name: string;
  label: string;
  mode: "single" | "multiple" | "glob" | "area" | "tag";
  allowedDomains?: string[];  // NEW
}
```

**components table** (migration):
```sql
ALTER TABLE components ADD COLUMN test_entity_bindings TEXT;  -- JSON, nullable
```

## New Dependency

`@dnd-kit/core` + `@dnd-kit/sortable` (admin package only)

## Scope

**In scope:**
- Dashboard editor: visual grid, component picker modal, config modal with live preview, drag reorder
- Component editor: allowedDomains multi-select, test entity pickers, persist test bindings
- Server: migration, Zod validation updates, prebuilt component seed updates
- Entity selector: domain filtering support

**Out of scope:**
- Display UI changes
- WebSocket proxy changes
- Layout editor changes
- Settings/Layouts tabs of dashboard editor
- Drag components between layouts
