# Container Components & UX Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make container components (Tabs, Auto-Rotate) fully functional with nesting UI, plus add copy component, base templates for new components, and dashboard-aware preview styling.

**Architecture:** Container instances hold children via `parentInstanceId`. Admin VisualLayoutGrid renders containers with nested "+" buttons. Display runtime swaps Handlebars rendering for dedicated TabsContainer/AutoRotateContainer React components. MDI icon selector is a reusable admin component.

**Tech Stack:** React 19, Ant Design 5, @mdi/js + @mdi/react for icons, Drizzle ORM migrations, Fastify/Zod

---

### Task 1: Schema Migration — Add tabLabel and tabIcon to component_instances

**Files:**
- Modify: `packages/server/src/db/schema.ts:148`
- Create: `drizzle/0004_*.sql` (generated)

**Step 1: Add columns to schema**

In `packages/server/src/db/schema.ts`, after line 148 (`parentInstanceId`), add:

```typescript
  tabLabel: text("tab_label"),
  tabIcon: text("tab_icon"),
```

**Step 2: Generate migration**

Run: `pnpm -w run db:generate`
Expected: New migration SQL file created in `drizzle/`

**Step 3: Verify migration SQL**

Read the generated migration file. It should contain two `ALTER TABLE component_instances ADD COLUMN` statements for `tab_label` and `tab_icon`.

**Step 4: Commit**

```bash
git add packages/server/src/db/schema.ts drizzle/
git commit -m "feat: add tabLabel and tabIcon columns to component_instances"
```

---

### Task 2: Install @mdi/js and @mdi/react

**Step 1: Install packages**

Run: `pnpm --filter admin add @mdi/js @mdi/react`
Run: `pnpm --filter display add @mdi/js @mdi/react`

**Step 2: Commit**

```bash
git add packages/admin/package.json packages/display/package.json pnpm-lock.yaml
git commit -m "chore: add @mdi/js and @mdi/react dependencies"
```

---

### Task 3: MdiIconSelector Reusable Component

**Files:**
- Create: `packages/admin/src/components/selectors/MdiIconSelector.tsx`

**Step 1: Create the component**

This is a searchable dropdown that shows MDI icons with previews. It uses a virtualized list since @mdi/js has thousands of icons.

```tsx
import { useState, useMemo, useCallback } from "react";
import { Input, Popover, Button } from "antd";
import { SearchOutlined, CloseOutlined } from "@ant-design/icons";
import Icon from "@mdi/react";
import * as mdiIcons from "@mdi/js";

interface MdiIconSelectorProps {
  value?: string | null;
  onChange: (iconName: string | null) => void;
}

// Build icon list once: { name: "mdi:home", path: "M10 20v-6h4v6h5v-8h3L12 3..." }
const iconEntries: { name: string; path: string }[] = [];
for (const [key, path] of Object.entries(mdiIcons)) {
  if (!key.startsWith("mdi")) continue;
  // Convert camelCase key like "mdiHome" to "mdi:home"
  const mdiName =
    "mdi:" +
    key
      .slice(3)
      .replace(/([A-Z])/g, "-$1")
      .toLowerCase()
      .replace(/^-/, "");
  iconEntries.push({ name: mdiName, path: path as string });
}

function getIconPath(mdiName: string): string | undefined {
  // Convert "mdi:home-outline" to "mdiHomeOutline"
  const camelKey =
    "mdi" +
    mdiName
      .slice(4)
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("");
  return (mdiIcons as Record<string, string>)[camelKey];
}

const PAGE_SIZE = 80;

export function MdiIconSelector({ value, onChange }: MdiIconSelectorProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    if (!search) return iconEntries.slice(0, visibleCount);
    const q = search.toLowerCase();
    return iconEntries.filter((e) => e.name.includes(q)).slice(0, visibleCount);
  }, [search, visibleCount]);

  const totalFiltered = useMemo(() => {
    if (!search) return iconEntries.length;
    const q = search.toLowerCase();
    return iconEntries.filter((e) => e.name.includes(q)).length;
  }, [search]);

  const handleSelect = useCallback(
    (name: string) => {
      onChange(name);
      setOpen(false);
      setSearch("");
      setVisibleCount(PAGE_SIZE);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange(null);
    setSearch("");
  }, [onChange]);

  const selectedPath = value ? getIconPath(value) : undefined;

  const content = (
    <div style={{ width: 320, maxHeight: 400, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <Input
        prefix={<SearchOutlined />}
        placeholder="Search icons..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setVisibleCount(PAGE_SIZE);
        }}
        allowClear
        style={{ marginBottom: 8 }}
        autoFocus
      />
      <div
        style={{ flex: 1, overflowY: "auto", display: "flex", flexWrap: "wrap", gap: 4 }}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
            setVisibleCount((c) => Math.min(c + PAGE_SIZE, totalFiltered));
          }
        }}
      >
        {filtered.map((entry) => (
          <div
            key={entry.name}
            title={entry.name}
            onClick={() => handleSelect(entry.name)}
            style={{
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              borderRadius: 4,
              border: value === entry.name ? "2px solid #1677ff" : "1px solid transparent",
              background: value === entry.name ? "rgba(22,119,255,0.1)" : "transparent",
            }}
          >
            <Icon path={entry.path} size={0.9} color="#d9d9d9" />
          </div>
        ))}
      </div>
      {visibleCount < totalFiltered && (
        <div style={{ textAlign: "center", padding: 4, fontSize: 12, color: "#888" }}>
          Showing {filtered.length} of {totalFiltered} — scroll for more
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <Popover
        content={content}
        trigger="click"
        open={open}
        onOpenChange={setOpen}
        placement="bottomLeft"
      >
        <Button
          style={{
            width: 48,
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          {selectedPath ? (
            <Icon path={selectedPath} size={1} color="#d9d9d9" />
          ) : (
            <span style={{ color: "#666", fontSize: 12 }}>Icon</span>
          )}
        </Button>
      </Popover>
      {value && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#888" }}>{value}</span>
          <CloseOutlined
            style={{ fontSize: 10, color: "#888", cursor: "pointer" }}
            onClick={handleClear}
          />
        </div>
      )}
    </div>
  );
}

export { getIconPath };
```

**Step 2: Commit**

```bash
git add packages/admin/src/components/selectors/MdiIconSelector.tsx
git commit -m "feat: add reusable MdiIconSelector component"
```

---

### Task 4: Copy Component API Endpoint

**Files:**
- Modify: `packages/server/src/routes/components.ts:87` (before the delete endpoint)

**Step 1: Add copy endpoint**

Insert before the `app.delete` block at line 87 in `packages/server/src/routes/components.ts`:

```typescript
  app.post<{ Params: { id: string } }>(
    "/api/components/:id/copy",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [source] = await db
        .select()
        .from(components)
        .where(eq(components.id, id));
      if (!source) return reply.code(404).send({ error: "Not found" });

      const [row] = await db
        .insert(components)
        .values({
          name: `${source.name} (Copy)`,
          template: source.template,
          styles: source.styles,
          parameterDefs: source.parameterDefs,
          entitySelectorDefs: source.entitySelectorDefs,
          isContainer: source.isContainer,
          containerConfig: source.containerConfig,
          testEntityBindings: source.testEntityBindings,
          isPrebuilt: false,
        })
        .returning();
      return reply.code(201).send(row);
    }
  );
```

**Step 2: Commit**

```bash
git add packages/server/src/routes/components.ts
git commit -m "feat: add POST /api/components/:id/copy endpoint"
```

---

### Task 5: ComponentList — Hide Prebuilt Containers + Copy Button

**Files:**
- Modify: `packages/admin/src/pages/ComponentList.tsx`
- Modify: `packages/admin/src/api.ts` (if `api.post` doesn't exist, check the api helper)

**Step 1: Add copy handler and filter prebuilt containers**

In `ComponentList.tsx`:

1. Filter the components array to exclude items where `isContainer === true && isPrebuilt === true` before rendering in the table.

2. Add a "Copy" button in the Actions column (alongside Edit and Delete). On click, POST to `/api/components/${id}/copy`, then navigate to the new component's editor.

The filter goes in the `dataSource` prop of the Table:

```tsx
dataSource={components.filter((c) => !(c.isContainer && c.isPrebuilt))}
```

The copy handler:

```typescript
const handleCopy = async (id: number) => {
  const copied = await api.post<Component>(`/api/components/${id}/copy`, {});
  message.success("Component copied");
  navigate(`/components/${copied.id}`);
};
```

Add a Copy button in the actions column (before Delete):

```tsx
<Button size="small" onClick={() => handleCopy(record.id)}>
  Copy
</Button>
```

**Step 2: Commit**

```bash
git add packages/admin/src/pages/ComponentList.tsx
git commit -m "feat: hide prebuilt containers from list, add copy button"
```

---

### Task 6: New Component Base Template

**Files:**
- Modify: `packages/admin/src/pages/ComponentEditor.tsx`

**Step 1: Set default template and styles for new components**

In `ComponentEditor.tsx`, find where the form initialValues or state are set for new components. Add default values for template and styles.

Default template:
```handlebars
<div class="component">
  {{!-- your content here --}}
</div>
```

Default styles:
```css
:host {
  background: var(--db-component-bg, transparent);
  border: var(--db-border-style, none);
  border-radius: var(--db-border-radius, 0px);
  padding: var(--db-component-padding, 0px);
  font-family: var(--db-font-family, inherit);
  font-size: var(--db-font-size, 16px);
  color: var(--db-font-color, #fff);
}

.component {
  padding: 16px;
}
```

These defaults should be set as the initial state when `isNew` is true. Look at how HybridEditor receives template/styles and set them as initial state values.

**Step 2: Commit**

```bash
git add packages/admin/src/pages/ComponentEditor.tsx
git commit -m "feat: pre-populate new components with base template and styles"
```

---

### Task 7: Component Editor Preview — Dashboard Styling

**Files:**
- Modify: `packages/admin/src/pages/ComponentEditor.tsx`

**Step 1: Fetch dashboards and add selector**

Add state and effect to fetch dashboards on mount:

```typescript
interface DashboardSummary {
  id: number;
  name: string;
  globalStyles: Record<string, string>;
  standardVariables?: Record<string, string>;
}

const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
const [selectedDashboardId, setSelectedDashboardId] = useState<number | null>(null);

useEffect(() => {
  api.get<DashboardSummary[]>("/api/dashboards").then((list) => {
    setDashboards(list);
    if (list.length > 0) setSelectedDashboardId(list[0].id);
  });
}, []);
```

Compute the active dashboard's styles:

```typescript
const activeDashboard = dashboards.find((d) => d.id === selectedDashboardId);
const previewGlobalStyles = activeDashboard?.globalStyles ?? {};
const previewStandardVariables = activeDashboard?.standardVariables ?? {};
```

Add a Select dropdown above the LivePreview:

```tsx
{dashboards.length > 0 && (
  <Select
    value={selectedDashboardId}
    onChange={setSelectedDashboardId}
    options={dashboards.map((d) => ({ value: d.id, label: d.name }))}
    style={{ width: 200, marginBottom: 8 }}
    placeholder="Preview with dashboard styles"
  />
)}
```

Pass to LivePreview:

```tsx
<LivePreview
  template={template}
  styles={styles}
  entityBindings={testEntityBindings ?? {}}
  parameterValues={{}}
  globalStyles={previewGlobalStyles}
  standardVariables={previewStandardVariables}
/>
```

**Step 2: Commit**

```bash
git add packages/admin/src/pages/ComponentEditor.tsx
git commit -m "feat: component editor preview uses dashboard styling with selector"
```

---

### Task 8: Update Instance API — Add tabLabel and tabIcon to Zod schemas

**Files:**
- Modify: `packages/server/src/routes/dashboards.ts:195-214` (create instance schema)
- Modify: `packages/server/src/routes/dashboards.ts:228-246` (update instance schema)

**Step 1: Add tabLabel and tabIcon to create instance schema**

In the POST `/api/dashboard-layouts/:dlId/instances` handler, add to the Zod schema:

```typescript
tabLabel: z.string().nullable().default(null),
tabIcon: z.string().nullable().default(null),
```

**Step 2: Add tabLabel and tabIcon to update instance schema**

In the PUT `/api/instances/:instanceId` handler, add to the Zod schema:

```typescript
tabLabel: z.string().nullable(),
tabIcon: z.string().nullable(),
```

**Step 3: Commit**

```bash
git add packages/server/src/routes/dashboards.ts
git commit -m "feat: add tabLabel and tabIcon to instance API schemas"
```

---

### Task 9: VisualLayoutGrid — Container Nesting UI

**Files:**
- Modify: `packages/admin/src/components/dashboard/VisualLayoutGrid.tsx`

This is the biggest admin UI change. The VisualLayoutGrid needs to:

1. Accept full component definitions (with `isContainer` flag) instead of just `{ id, name }`
2. For container instances, render a bordered section with the container type label
3. Show child instances nested inside the container
4. Show a "+" button inside the container to add children
5. Emit new callbacks: `onAddToContainer(containerInstanceId: number)` and distinguish child clicks

**Step 1: Update interfaces**

Update `ComponentDef` interface:

```typescript
interface ComponentDef {
  id: number;
  name: string;
  isContainer: boolean;
  containerConfig?: { type: string; rotateInterval?: number } | null;
}
```

Update `ComponentInstance` to include parentInstanceId, tabLabel, tabIcon:

```typescript
interface ComponentInstance {
  id: number;
  componentId: number;
  regionId: string;
  sortOrder: number;
  entityBindings: Record<string, string | string[]>;
  parentInstanceId: number | null;
  tabLabel: string | null;
  tabIcon: string | null;
}
```

Add to props:

```typescript
interface VisualLayoutGridProps {
  // ...existing props...
  onAddToContainer: (containerInstanceId: number) => void;
}
```

**Step 2: Update instancesByRegion to only include top-level instances**

```typescript
map[region.id] = instances
  .filter((i) => i.regionId === region.id && i.parentInstanceId === null)
  .sort((a, b) => a.sortOrder - b.sortOrder);
```

**Step 3: Create a helper to get children of a container**

```typescript
const childrenOf = useCallback(
  (parentId: number) =>
    instances
      .filter((i) => i.parentInstanceId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  [instances]
);
```

**Step 4: Update SortableCard to render container nesting**

When the instance's component `isContainer === true`, render it with a bordered container look showing:
- Container type label ("Tabs" or "Auto-Rotate") at the top
- List of child instances inside, each showing their tab label + icon
- A "+" button to add children

```tsx
function SortableCard({
  instance,
  componentName,
  component,
  children: childInstances,
  componentMap,
  onClick,
  onChildClick,
  onAddChild,
}: {
  instance: ComponentInstance;
  componentName: string;
  component: ComponentDef;
  children: ComponentInstance[];
  componentMap: Record<number, ComponentDef>;
  onClick: () => void;
  onChildClick: (inst: ComponentInstance) => void;
  onAddChild: () => void;
}) {
  // ...existing sortable setup...

  if (component.isContainer) {
    return (
      <div ref={setNodeRef} style={{ ...style, marginBottom: 6 }}>
        <div
          style={{
            border: "2px solid rgba(114, 46, 209, 0.4)",
            borderRadius: 8,
            background: "rgba(114, 46, 209, 0.08)",
            padding: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span {...attributes} {...listeners} style={{ cursor: "grab", color: "#666" }} onClick={(e) => e.stopPropagation()}>
              <HolderOutlined />
            </span>
            <span style={{ fontWeight: 500, fontSize: 13, color: "#b380d9" }}>{componentName}</span>
            <span style={{ fontSize: 11, color: "#888", marginLeft: "auto" }}>
              {component.containerConfig?.type ?? "container"}
            </span>
          </div>

          {childInstances.map((child) => (
            <div
              key={child.id}
              onClick={() => onChildClick(child)}
              style={{
                padding: "6px 10px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 4,
                marginBottom: 4,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
              }}
            >
              <span>{child.tabLabel || componentMap[child.componentId]?.name || "Child"}</span>
            </div>
          ))}

          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={(e) => { e.stopPropagation(); onAddChild(); }}
            block
            style={{ marginTop: 4 }}
          >
            Add Child
          </Button>
        </div>
      </div>
    );
  }

  // ...existing non-container rendering...
}
```

**Step 5: Update the region rendering loop**

Pass `childrenOf`, `componentMap`, `onAddToContainer`, and `onInstanceClick` through:

```tsx
{regionInstances.map((inst) => (
  <SortableCard
    key={inst.id}
    instance={inst}
    componentName={componentMap[inst.componentId]?.name ?? "Unknown"}
    component={componentMap[inst.componentId]}
    children={childrenOf(inst.id)}
    componentMap={componentMap}
    onClick={() => onInstanceClick(inst)}
    onChildClick={(child) => onInstanceClick(child)}
    onAddChild={() => onAddToContainer(inst.id)}
  />
))}
```

**Step 6: Commit**

```bash
git add packages/admin/src/components/dashboard/VisualLayoutGrid.tsx
git commit -m "feat: visual layout grid supports container nesting with children"
```

---

### Task 10: DashboardEditor — Wire Up Container Add Flow

**Files:**
- Modify: `packages/admin/src/pages/DashboardEditor.tsx`

**Step 1: Add container parent state**

Add state to track when adding a child to a container:

```typescript
const [pickerContainerInstanceId, setPickerContainerInstanceId] = useState<number | null>(null);
```

**Step 2: Update handlePickerSelect to handle container children**

```typescript
const handlePickerSelect = async (componentId: number) => {
  if (!activeDlId) return;

  if (pickerContainerInstanceId !== null) {
    // Adding child to container
    const siblings = instances.filter(
      (i) => i.parentInstanceId === pickerContainerInstanceId
    );
    const inst = await api.post<ComponentInstance>(
      `/api/dashboard-layouts/${activeDlId}/instances`,
      {
        componentId,
        regionId: instances.find((i) => i.id === pickerContainerInstanceId)?.regionId ?? "",
        sortOrder: siblings.length,
        parentInstanceId: pickerContainerInstanceId,
      }
    );
    setInstances([...instances, inst]);
    setPickerContainerInstanceId(null);
    setConfigInstance(inst);
  } else if (pickerRegionId) {
    // Adding to region (existing logic)
    const regionInstances = instances.filter(
      (i) => i.regionId === pickerRegionId && i.parentInstanceId === null
    );
    const inst = await api.post<ComponentInstance>(
      `/api/dashboard-layouts/${activeDlId}/instances`,
      {
        componentId,
        regionId: pickerRegionId,
        sortOrder: regionInstances.length,
      }
    );
    setInstances([...instances, inst]);
    setPickerRegionId(null);
    setConfigInstance(inst);
  }
};
```

**Step 3: Update ComponentPickerModal usage**

Pass a flag to filter out containers when adding children:

```tsx
<ComponentPickerModal
  open={pickerRegionId !== null || pickerContainerInstanceId !== null}
  components={
    pickerContainerInstanceId !== null
      ? allComponents.filter((c) => !c.isContainer)
      : allComponents
  }
  onSelect={handlePickerSelect}
  onCancel={() => {
    setPickerRegionId(null);
    setPickerContainerInstanceId(null);
  }}
/>
```

**Step 4: Update ComponentInstance interface to include new fields**

Add to the `ComponentInstance` interface in DashboardEditor:

```typescript
interface ComponentInstance {
  // ...existing fields...
  parentInstanceId: number | null;
  tabLabel: string | null;
  tabIcon: string | null;
}
```

**Step 5: Pass onAddToContainer to VisualLayoutGrid**

```tsx
<VisualLayoutGrid
  // ...existing props...
  onAddToContainer={(containerInstanceId) => {
    setPickerContainerInstanceId(containerInstanceId);
  }}
/>
```

**Step 6: Commit**

```bash
git add packages/admin/src/pages/DashboardEditor.tsx
git commit -m "feat: dashboard editor supports adding children to containers"
```

---

### Task 11: ComponentConfigModal — Tab Label and Icon Fields

**Files:**
- Modify: `packages/admin/src/components/dashboard/ComponentConfigModal.tsx`

**Step 1: Add tabLabel and tabIcon fields**

When the instance has a `parentInstanceId` (it's a child of a container), show Tab Label and Tab Icon fields at the top of the modal.

Add to the instance interface:

```typescript
parentInstanceId: number | null;
tabLabel: string | null;
tabIcon: string | null;
```

Add state for tabLabel and tabIcon:

```typescript
const [tabLabel, setTabLabel] = useState<string>("");
const [tabIcon, setTabIcon] = useState<string | null>(null);
```

Initialize from instance:

```typescript
// In the existing initialization effect
setTabLabel(instance?.tabLabel ?? "");
setTabIcon(instance?.tabIcon ?? null);
```

Show fields when parentInstanceId is set:

```tsx
{instance?.parentInstanceId !== null && (
  <div style={{ marginBottom: 16, padding: 12, background: "rgba(114, 46, 209, 0.08)", borderRadius: 8 }}>
    <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>Tab Settings</Typography.Text>
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Tab Label</label>
      <Input value={tabLabel} onChange={(e) => setTabLabel(e.target.value)} placeholder="Tab label" />
    </div>
    <div>
      <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Tab Icon</label>
      <MdiIconSelector value={tabIcon} onChange={setTabIcon} />
    </div>
  </div>
)}
```

Include in save:

```typescript
onSave(instance.id, {
  parameterValues,
  entityBindings,
  visibilityRules,
  ...(instance.parentInstanceId !== null ? { tabLabel: tabLabel || null, tabIcon } : {}),
});
```

**Step 2: Commit**

```bash
git add packages/admin/src/components/dashboard/ComponentConfigModal.tsx
git commit -m "feat: config modal shows tab label and icon fields for container children"
```

---

### Task 12: Display Runtime — TabsContainer Component

**Files:**
- Create: `packages/display/src/runtime/TabsContainer.tsx`

**Step 1: Create TabsContainer**

```tsx
import { useState } from "react";
import Icon from "@mdi/react";
import * as mdiIcons from "@mdi/js";
import { ComponentRenderer } from "./ComponentRenderer.js";
import { VisibilityGate } from "./VisibilityGate.js";
import type { EntityState } from "../template/engine.js";

interface ChildInstance {
  id: number;
  componentId: number;
  sortOrder: number;
  parameterValues: Record<string, string | number | boolean>;
  entityBindings: Record<string, string | string[]>;
  visibilityRules: {
    entityId: string;
    attribute?: string;
    operator: string;
    value: string;
  }[];
  tabLabel: string | null;
  tabIcon: string | null;
}

interface ComponentDef {
  id: number;
  template: string;
  styles: string;
}

interface TabsContainerProps {
  children: ChildInstance[];
  components: Record<number, ComponentDef>;
  entities: Record<string, EntityState>;
  globalStyles: Record<string, string>;
}

function getIconPath(mdiName: string): string | undefined {
  const camelKey =
    "mdi" +
    mdiName
      .slice(4)
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("");
  return (mdiIcons as Record<string, string>)[camelKey];
}

export function TabsContainer({
  children,
  components,
  entities,
  globalStyles,
}: TabsContainerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const sorted = [...children].sort((a, b) => a.sortOrder - b.sortOrder);
  const activeChild = sorted[activeIndex];

  if (sorted.length === 0) return null;

  const fontColor = globalStyles["--db-font-color"] ?? globalStyles.fontColor ?? "#fff";
  const fontColorSecondary = globalStyles["--db-font-color-secondary"] ?? globalStyles.fontColorSecondary ?? "#aaa";
  const accentColor = globalStyles["--db-accent-color"] ?? globalStyles.accentColor ?? "#4fc3f7";
  const borderRadius = globalStyles["--db-border-radius"] ?? globalStyles.borderRadius ?? "0px";

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `1px solid ${fontColorSecondary}33`,
          flexShrink: 0,
        }}
      >
        {sorted.map((child, i) => {
          const isActive = i === activeIndex;
          const iconPath = child.tabIcon ? getIconPath(child.tabIcon) : undefined;
          const comp = components[child.componentId];
          const label = child.tabLabel || (comp ? "Tab " + (i + 1) : "Tab");

          return (
            <button
              key={child.id}
              onClick={() => setActiveIndex(i)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: isActive ? `2px solid ${accentColor}` : "2px solid transparent",
                padding: "8px 16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: isActive ? accentColor : fontColorSecondary,
                fontFamily: "inherit",
                fontSize: "inherit",
                transition: "color 0.2s, border-color 0.2s",
              }}
            >
              {iconPath && <Icon path={iconPath} size={0.7} color={isActive ? accentColor : fontColorSecondary} />}
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {activeChild && (() => {
          const comp = components[activeChild.componentId];
          if (!comp) return null;
          return (
            <VisibilityGate rules={activeChild.visibilityRules} entities={entities}>
              <ComponentRenderer
                template={comp.template}
                styles={comp.styles}
                entities={entities}
                parameterValues={{ ...activeChild.entityBindings, ...activeChild.parameterValues }}
                globalStyles={globalStyles}
                instanceId={activeChild.id}
              />
            </VisibilityGate>
          );
        })()}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/display/src/runtime/TabsContainer.tsx
git commit -m "feat: add TabsContainer display component"
```

---

### Task 13: Display Runtime — AutoRotateContainer Component

**Files:**
- Create: `packages/display/src/runtime/AutoRotateContainer.tsx`

**Step 1: Create AutoRotateContainer**

```tsx
import { useState, useEffect } from "react";
import { ComponentRenderer } from "./ComponentRenderer.js";
import { VisibilityGate } from "./VisibilityGate.js";
import type { EntityState } from "../template/engine.js";

interface ChildInstance {
  id: number;
  componentId: number;
  sortOrder: number;
  parameterValues: Record<string, string | number | boolean>;
  entityBindings: Record<string, string | string[]>;
  visibilityRules: {
    entityId: string;
    attribute?: string;
    operator: string;
    value: string;
  }[];
}

interface ComponentDef {
  id: number;
  template: string;
  styles: string;
}

interface AutoRotateContainerProps {
  children: ChildInstance[];
  components: Record<number, ComponentDef>;
  entities: Record<string, EntityState>;
  globalStyles: Record<string, string>;
  rotateInterval: number;
}

export function AutoRotateContainer({
  children,
  components,
  entities,
  globalStyles,
  rotateInterval,
}: AutoRotateContainerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const sorted = [...children].sort((a, b) => a.sortOrder - b.sortOrder);

  useEffect(() => {
    if (sorted.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % sorted.length);
    }, rotateInterval * 1000);
    return () => clearInterval(timer);
  }, [sorted.length, rotateInterval]);

  if (sorted.length === 0) return null;

  const activeChild = sorted[activeIndex % sorted.length];
  const comp = components[activeChild?.componentId];
  if (!activeChild || !comp) return null;

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <VisibilityGate rules={activeChild.visibilityRules} entities={entities}>
        <ComponentRenderer
          template={comp.template}
          styles={comp.styles}
          entities={entities}
          parameterValues={{ ...activeChild.entityBindings, ...activeChild.parameterValues }}
          globalStyles={globalStyles}
          instanceId={activeChild.id}
        />
      </VisibilityGate>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/display/src/runtime/AutoRotateContainer.tsx
git commit -m "feat: add AutoRotateContainer display component"
```

---

### Task 14: RegionRenderer — Render Containers with Children

**Files:**
- Modify: `packages/display/src/runtime/RegionRenderer.tsx`

**Step 1: Import container components**

Add imports at top:

```typescript
import { TabsContainer } from "./TabsContainer.js";
import { AutoRotateContainer } from "./AutoRotateContainer.js";
```

**Step 2: Update ComponentInstance interface**

Add `tabLabel` and `tabIcon`:

```typescript
interface ComponentInstance {
  // ...existing fields...
  tabLabel: string | null;
  tabIcon: string | null;
}
```

**Step 3: Update rendering to handle containers**

In the `regionInstances.map()` block, check if the component is a container and render accordingly:

```tsx
{regionInstances.map((inst) => {
  const comp = components[inst.componentId];
  if (!comp) return null;

  if (comp.isContainer && comp.containerConfig) {
    const childInstances = instances
      .filter((i) => i.parentInstanceId === inst.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const containerContent =
      comp.containerConfig.type === "tabs" ? (
        <TabsContainer
          children={childInstances}
          components={components}
          entities={entities}
          globalStyles={globalStyles}
        />
      ) : comp.containerConfig.type === "auto-rotate" ? (
        <AutoRotateContainer
          children={childInstances}
          components={components}
          entities={entities}
          globalStyles={globalStyles}
          rotateInterval={comp.containerConfig.rotateInterval ?? 10}
        />
      ) : null;

    if (!containerContent) return null;

    const wrapped = (
      <VisibilityGate key={inst.id} rules={inst.visibilityRules} entities={entities}>
        {containerContent}
      </VisibilityGate>
    );

    if (flexGrow) {
      return (
        <div key={inst.id} style={{ flexGrow: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {wrapped}
        </div>
      );
    }
    return wrapped;
  }

  // Existing non-container rendering
  const content = (
    <VisibilityGate key={inst.id} rules={inst.visibilityRules} entities={entities}>
      <ComponentRenderer
        template={comp.template}
        styles={comp.styles}
        entities={entities}
        parameterValues={{ ...inst.entityBindings, ...inst.parameterValues }}
        globalStyles={globalStyles}
        instanceId={inst.id}
        fillRegion={flexGrow}
      />
    </VisibilityGate>
  );

  if (flexGrow) {
    return (
      <div key={inst.id} style={{ flexGrow: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {content}
      </div>
    );
  }
  return content;
})}
```

**Step 4: Commit**

```bash
git add packages/display/src/runtime/RegionRenderer.tsx
git commit -m "feat: RegionRenderer renders container components with children"
```

---

### Task 15: Delete Instance — Cascade Children

**Files:**
- Modify: `packages/server/src/routes/dashboards.ts:258-269`

**Step 1: Delete children when deleting a container instance**

Update the DELETE `/api/instances/:instanceId` handler to also delete child instances:

```typescript
app.delete<{ Params: { instanceId: string } }>(
  "/api/instances/:instanceId",
  async (req, reply) => {
    const id = parseInt(req.params.instanceId);
    // Delete children first
    await db
      .delete(componentInstances)
      .where(eq(componentInstances.parentInstanceId, id));
    // Then delete the instance itself
    const [row] = await db
      .delete(componentInstances)
      .where(eq(componentInstances.id, id))
      .returning();
    if (!row) return reply.code(404).send({ error: "Not found" });
    return { success: true };
  }
);
```

**Step 2: Commit**

```bash
git add packages/server/src/routes/dashboards.ts
git commit -m "feat: cascade delete children when deleting container instance"
```

---

### Task 16: Build and Verify

**Step 1: Build shared package**

Run: `pnpm --filter @ha-external-dashboards/shared build`

**Step 2: Build admin and display**

Run: `pnpm --filter admin build && pnpm --filter display build`
Expected: Clean build with no TypeScript errors

**Step 3: Build server**

Run: `pnpm --filter server build`
Expected: Clean build

**Step 4: Run migrations**

Run: `pnpm -w run db:migrate`
Expected: Migration applied successfully

**Step 5: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix: resolve build issues"
```

---
