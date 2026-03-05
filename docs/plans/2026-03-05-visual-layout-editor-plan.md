# Visual Layout Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the table-based component placement UI with a visual CSS grid editor, add entity domain filtering to components, and persist test entity bindings for live preview.

**Architecture:** Shared types get `allowedDomains` on `EntitySelectorDef`. Server gets a migration for `testEntityBindings` on components, plus Zod updates. Admin UI gets 3 new components (visual grid, component picker modal, config modal) replacing the Components tab, plus allowedDomains/test entity support in the component editor. EntitySelector gets domain filtering.

**Tech Stack:** React 19, Ant Design 5, @dnd-kit/core + @dnd-kit/sortable, Drizzle ORM, Zod

---

### Task 1: Add `allowedDomains` to shared types

**Files:**
- Modify: `packages/shared/src/types/index.ts:20-24`

**Step 1: Update EntitySelectorDef interface**

Add optional `allowedDomains` field:

```typescript
export interface EntitySelectorDef {
  name: string;
  label: string;
  mode: "single" | "multiple" | "glob" | "area" | "tag";
  allowedDomains?: string[];
}
```

**Step 2: Build shared package**

Run: `pnpm --filter shared build`
Expected: Clean build, no errors

**Step 3: Commit**

```bash
git add packages/shared/src/types/index.ts
git commit -m "feat: add allowedDomains to EntitySelectorDef type"
```

---

### Task 2: Add `testEntityBindings` column — schema + migration

**Files:**
- Modify: `packages/server/src/db/schema.ts:67-108` (components table)

**Step 1: Add testEntityBindings to schema**

Add after `containerConfig` (line 98) in the components table:

```typescript
  testEntityBindings: text("test_entity_bindings", { mode: "json" })
    .$type<Record<string, string | string[]> | null>()
    .default(sql`'null'`),
```

**Step 2: Generate migration**

Run: `pnpm -w run db:generate`
Expected: New migration file in `drizzle/` with `ALTER TABLE components ADD COLUMN test_entity_bindings`

**Step 3: Commit**

```bash
git add packages/server/src/db/schema.ts drizzle/
git commit -m "feat: add testEntityBindings column to components table"
```

---

### Task 3: Update server Zod validation for components

**Files:**
- Modify: `packages/server/src/routes/components.ts:7-41`

**Step 1: Add `allowedDomains` to entitySelectorDefSchema**

Update the schema at line 17-21:

```typescript
const entitySelectorDefSchema = z.object({
  name: z.string(),
  label: z.string(),
  mode: z.enum(["single", "multiple", "glob", "area", "tag"]),
  allowedDomains: z.array(z.string()).optional(),
});
```

**Step 2: Add `testEntityBindings` to createSchema**

Update createSchema at line 31-39 to include:

```typescript
const createSchema = z.object({
  name: z.string().min(1),
  template: z.string().default(""),
  styles: z.string().default(""),
  parameterDefs: z.array(parameterDefSchema).default([]),
  entitySelectorDefs: z.array(entitySelectorDefSchema).default([]),
  isContainer: z.boolean().default(false),
  containerConfig: containerConfigSchema,
  testEntityBindings: z
    .record(z.union([z.string(), z.array(z.string())]))
    .nullable()
    .default(null),
});
```

**Step 3: Build and verify**

Run: `pnpm --filter server build`
Expected: Clean build

**Step 4: Commit**

```bash
git add packages/server/src/routes/components.ts
git commit -m "feat: update component Zod schemas for allowedDomains and testEntityBindings"
```

---

### Task 4: Update prebuilt components with `allowedDomains`

**Files:**
- Modify: `packages/server/src/prebuilt/index.ts`

**Step 1: Update PrebuiltComponent interface**

Update the `entitySelectorDefs` type in the interface at line 12 to include `allowedDomains`:

```typescript
  entitySelectorDefs: {
    name: string;
    label: string;
    mode: string;
    allowedDomains?: string[];
  }[];
```

**Step 2: Add allowedDomains to Weather Card**

Update Weather Card entity selector (line 93-95):

```typescript
    entitySelectorDefs: [
      { name: "entity", label: "Weather Entity", mode: "single", allowedDomains: ["weather"] },
    ],
```

**Step 3: Add allowedDomains to Media Player**

Update Media Player entity selector (line 111-113):

```typescript
    entitySelectorDefs: [
      { name: "entity", label: "Media Player Entity", mode: "single", allowedDomains: ["media_player"] },
    ],
```

**Step 4: Handle existing prebuilt component updates**

The current seed logic only inserts if the component doesn't exist. To update existing prebuilt components with allowedDomains, add an update path. Modify `seedPrebuiltComponents()` at line 164-179:

```typescript
export async function seedPrebuiltComponents() {
  for (const comp of prebuiltComponents) {
    const existing = await db
      .select()
      .from(components)
      .where(eq(components.name, comp.name));

    if (existing.length === 0) {
      await db.insert(components).values({
        ...comp,
        isPrebuilt: true,
      });
      console.log(`Seeded prebuilt component: ${comp.name}`);
    } else if (existing[0].isPrebuilt) {
      await db
        .update(components)
        .set({ entitySelectorDefs: comp.entitySelectorDefs })
        .where(eq(components.id, existing[0].id));
    }
  }
}
```

**Step 5: Build and verify**

Run: `pnpm --filter server build`
Expected: Clean build

**Step 6: Commit**

```bash
git add packages/server/src/prebuilt/index.ts
git commit -m "feat: add allowedDomains to Weather Card and Media Player prebuilt components"
```

---

### Task 5: Add domain filtering to EntitySelector

**Files:**
- Modify: `packages/admin/src/components/selectors/EntitySelector.tsx`

**Step 1: Add `allowedDomains` prop**

Update the props interface at line 11-15:

```typescript
interface EntitySelectorProps {
  mode: "single" | "multiple" | "glob" | "area" | "tag";
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  allowedDomains?: string[];
}
```

**Step 2: Accept and destructure the prop**

Update component signature at line 17:

```typescript
export function EntitySelector({ mode, value, onChange, allowedDomains }: EntitySelectorProps) {
```

**Step 3: Filter entities by domain**

After `setEntities` is called, add a filtered list. Insert after line 28, before the mode checks:

```typescript
  const filteredEntities =
    allowedDomains && allowedDomains.length > 0
      ? entities.filter((e) =>
          allowedDomains.some((d) => e.entity_id.startsWith(`${d}.`))
        )
      : entities;
```

**Step 4: Replace `entities` with `filteredEntities` in rendering**

- Line 42: `for (const e of filteredEntities)` (area mode)
- Line 71: `const options = filteredEntities.map(...)` (single/multiple mode)

Do NOT filter for glob or tag modes (they're free-text).

**Step 5: Build and verify**

Run: `pnpm --filter admin build`
Expected: Clean build

**Step 6: Commit**

```bash
git add packages/admin/src/components/selectors/EntitySelector.tsx
git commit -m "feat: add allowedDomains filtering to EntitySelector"
```

---

### Task 6: Install dnd-kit in admin package

**Files:**
- Modify: `packages/admin/package.json`

**Step 1: Install dependencies**

Run: `pnpm --filter admin add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

**Step 2: Verify install**

Run: `pnpm --filter admin build`
Expected: Clean build (no new imports yet, just verifying install)

**Step 3: Commit**

```bash
git add packages/admin/package.json pnpm-lock.yaml
git commit -m "chore: add @dnd-kit/core and @dnd-kit/sortable to admin package"
```

---

### Task 7: Create ComponentPickerModal

**Files:**
- Create: `packages/admin/src/components/dashboard/ComponentPickerModal.tsx`

This modal opens when clicking "+" on a region. Shows all components as cards with search.

**Step 1: Create the component**

```tsx
import { useState, useMemo } from "react";
import { Modal, Input, Card, Row, Col, Empty } from "antd";
import { SearchOutlined } from "@ant-design/icons";

interface Component {
  id: number;
  name: string;
  isContainer: boolean;
}

interface ComponentPickerModalProps {
  open: boolean;
  components: Component[];
  onSelect: (componentId: number) => void;
  onCancel: () => void;
}

export function ComponentPickerModal({
  open,
  components,
  onSelect,
  onCancel,
}: ComponentPickerModalProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return components;
    const lower = search.toLowerCase();
    return components.filter((c) => c.name.toLowerCase().includes(lower));
  }, [components, search]);

  return (
    <Modal
      title="Add Component"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Input
        placeholder="Search components..."
        prefix={<SearchOutlined />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16 }}
        allowClear
      />
      {filtered.length === 0 ? (
        <Empty description="No components found" />
      ) : (
        <Row gutter={[12, 12]}>
          {filtered.map((comp) => (
            <Col key={comp.id} span={8}>
              <Card
                hoverable
                size="small"
                onClick={() => {
                  setSearch("");
                  onSelect(comp.id);
                }}
                style={{ textAlign: "center", cursor: "pointer" }}
              >
                <div style={{ fontWeight: 500 }}>{comp.name}</div>
                {comp.isContainer && (
                  <div style={{ fontSize: 11, color: "#888" }}>Container</div>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Modal>
  );
}
```

**Step 2: Build and verify**

Run: `pnpm --filter admin build`
Expected: Clean build

**Step 3: Commit**

```bash
git add packages/admin/src/components/dashboard/ComponentPickerModal.tsx
git commit -m "feat: create ComponentPickerModal for visual layout editor"
```

---

### Task 8: Create ComponentConfigModal

**Files:**
- Create: `packages/admin/src/components/dashboard/ComponentConfigModal.tsx`

This modal opens when clicking an existing component card. Shows entity bindings, parameters, visibility rules, and a live preview.

**Step 1: Create the component**

```tsx
import { useState, useEffect, useCallback } from "react";
import {
  Modal,
  Input,
  InputNumber,
  Switch,
  Select,
  Collapse,
  Space,
  Button,
  Popconfirm,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { EntitySelector } from "../selectors/EntitySelector.js";
import { LivePreview } from "../preview/LivePreview.js";

interface ParameterDef {
  name: string;
  label: string;
  type: "string" | "number" | "boolean" | "color" | "select";
  default?: string | number | boolean;
  options?: { label: string; value: string }[];
}

interface EntitySelectorDef {
  name: string;
  label: string;
  mode: "single" | "multiple" | "glob" | "area" | "tag";
  allowedDomains?: string[];
}

interface VisibilityRule {
  entityId: string;
  attribute?: string;
  operator: string;
  value: string;
}

interface ComponentInstance {
  id: number;
  dashboardLayoutId: number;
  componentId: number;
  regionId: string;
  sortOrder: number;
  parameterValues: Record<string, string | number | boolean>;
  entityBindings: Record<string, string | string[]>;
  visibilityRules: VisibilityRule[];
}

interface ComponentDef {
  id: number;
  name: string;
  template: string;
  styles: string;
  parameterDefs: ParameterDef[];
  entitySelectorDefs: EntitySelectorDef[];
}

interface ComponentConfigModalProps {
  open: boolean;
  instance: ComponentInstance | null;
  component: ComponentDef | null;
  regionLabel: string;
  globalStyles?: Record<string, string>;
  onSave: (instanceId: number, updates: Partial<ComponentInstance>) => void;
  onDelete: (instanceId: number) => void;
  onCancel: () => void;
}

export function ComponentConfigModal({
  open,
  instance,
  component,
  regionLabel,
  globalStyles = {},
  onSave,
  onDelete,
  onCancel,
}: ComponentConfigModalProps) {
  const [parameterValues, setParameterValues] = useState<
    Record<string, string | number | boolean>
  >({});
  const [entityBindings, setEntityBindings] = useState<
    Record<string, string | string[]>
  >({});
  const [visibilityRules, setVisibilityRules] = useState<VisibilityRule[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (instance && component) {
      // Merge defaults with instance values
      const defaults: Record<string, string | number | boolean> = {};
      for (const def of component.parameterDefs) {
        if (def.default !== undefined) defaults[def.name] = def.default;
      }
      setParameterValues({ ...defaults, ...instance.parameterValues });
      setEntityBindings({ ...instance.entityBindings });
      setVisibilityRules([...instance.visibilityRules]);
    }
  }, [instance, component]);

  // Trigger preview refresh when bindings/params change
  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, [entityBindings, parameterValues]);

  const handleSave = useCallback(() => {
    if (!instance) return;
    onSave(instance.id, { parameterValues, entityBindings, visibilityRules });
  }, [instance, parameterValues, entityBindings, visibilityRules, onSave]);

  if (!instance || !component) return null;

  const hasEntityDefs = component.entitySelectorDefs.length > 0;
  const hasParamDefs = component.parameterDefs.length > 0;

  return (
    <Modal
      title={`${component.name} — ${regionLabel}`}
      open={open}
      onCancel={onCancel}
      width={900}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Popconfirm
            title="Delete this component instance?"
            onConfirm={() => onDelete(instance.id)}
          >
            <Button danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
          <Space>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" onClick={handleSave}>
              Save
            </Button>
          </Space>
        </div>
      }
      destroyOnClose
    >
      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {hasEntityDefs && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>
                Entity Bindings
              </div>
              {component.entitySelectorDefs.map((def) => (
                <div key={def.name} style={{ marginBottom: 12 }}>
                  <div
                    style={{ fontSize: 12, color: "#999", marginBottom: 4 }}
                  >
                    {def.label}
                  </div>
                  <EntitySelector
                    mode={def.mode}
                    value={entityBindings[def.name]}
                    onChange={(v) =>
                      setEntityBindings((prev) => ({
                        ...prev,
                        [def.name]: v,
                      }))
                    }
                    allowedDomains={def.allowedDomains}
                  />
                </div>
              ))}
            </div>
          )}

          {hasParamDefs && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>Parameters</div>
              {component.parameterDefs.map((def) => (
                <div key={def.name} style={{ marginBottom: 12 }}>
                  <div
                    style={{ fontSize: 12, color: "#999", marginBottom: 4 }}
                  >
                    {def.label}
                  </div>
                  {def.type === "boolean" ? (
                    <Switch
                      checked={!!parameterValues[def.name]}
                      onChange={(v) =>
                        setParameterValues((prev) => ({
                          ...prev,
                          [def.name]: v,
                        }))
                      }
                    />
                  ) : def.type === "number" ? (
                    <InputNumber
                      value={parameterValues[def.name] as number}
                      onChange={(v) =>
                        setParameterValues((prev) => ({
                          ...prev,
                          [def.name]: v ?? 0,
                        }))
                      }
                    />
                  ) : def.type === "select" ? (
                    <Select
                      value={parameterValues[def.name] as string}
                      onChange={(v) =>
                        setParameterValues((prev) => ({
                          ...prev,
                          [def.name]: v,
                        }))
                      }
                      options={def.options ?? []}
                      style={{ width: "100%" }}
                    />
                  ) : def.type === "color" ? (
                    <Input
                      type="color"
                      value={(parameterValues[def.name] as string) ?? "#ffffff"}
                      onChange={(e) =>
                        setParameterValues((prev) => ({
                          ...prev,
                          [def.name]: e.target.value,
                        }))
                      }
                      style={{ width: 60 }}
                    />
                  ) : (
                    <Input
                      value={(parameterValues[def.name] as string) ?? ""}
                      onChange={(e) =>
                        setParameterValues((prev) => ({
                          ...prev,
                          [def.name]: e.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <Collapse
            size="small"
            items={[
              {
                key: "visibility",
                label: "Visibility Rules",
                children: (
                  <div>
                    {visibilityRules.map((rule, i) => (
                      <Space
                        key={i}
                        style={{ display: "flex", marginBottom: 8 }}
                      >
                        <Input
                          placeholder="Entity ID"
                          value={rule.entityId}
                          onChange={(e) => {
                            const next = [...visibilityRules];
                            next[i] = { ...next[i], entityId: e.target.value };
                            setVisibilityRules(next);
                          }}
                          style={{ width: 160 }}
                        />
                        <Input
                          placeholder="Attribute"
                          value={rule.attribute ?? ""}
                          onChange={(e) => {
                            const next = [...visibilityRules];
                            next[i] = {
                              ...next[i],
                              attribute: e.target.value || undefined,
                            };
                            setVisibilityRules(next);
                          }}
                          style={{ width: 100 }}
                        />
                        <Select
                          value={rule.operator}
                          onChange={(v) => {
                            const next = [...visibilityRules];
                            next[i] = { ...next[i], operator: v };
                            setVisibilityRules(next);
                          }}
                          style={{ width: 80 }}
                          options={[
                            { value: "eq", label: "=" },
                            { value: "neq", label: "!=" },
                            { value: "gt", label: ">" },
                            { value: "lt", label: "<" },
                            { value: "gte", label: ">=" },
                            { value: "lte", label: "<=" },
                          ]}
                        />
                        <Input
                          placeholder="Value"
                          value={rule.value}
                          onChange={(e) => {
                            const next = [...visibilityRules];
                            next[i] = { ...next[i], value: e.target.value };
                            setVisibilityRules(next);
                          }}
                          style={{ width: 100 }}
                        />
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() =>
                            setVisibilityRules(
                              visibilityRules.filter((_, j) => j !== i)
                            )
                          }
                        />
                      </Space>
                    ))}
                    <Button
                      size="small"
                      onClick={() =>
                        setVisibilityRules([
                          ...visibilityRules,
                          { entityId: "", operator: "eq", value: "" },
                        ])
                      }
                    >
                      Add Rule
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </div>

        <div style={{ width: 350, flexShrink: 0 }}>
          <LivePreview
            template={component.template}
            styles={component.styles}
            entityBindings={entityBindings}
            parameterValues={parameterValues}
            globalStyles={globalStyles}
            refreshKey={refreshKey}
          />
        </div>
      </div>
    </Modal>
  );
}
```

**Step 2: Build and verify**

Run: `pnpm --filter admin build`
Expected: Clean build

**Step 3: Commit**

```bash
git add packages/admin/src/components/dashboard/ComponentConfigModal.tsx
git commit -m "feat: create ComponentConfigModal with live preview"
```

---

### Task 9: Create VisualLayoutGrid component

**Files:**
- Create: `packages/admin/src/components/dashboard/VisualLayoutGrid.tsx`

The core visual grid component. Renders the CSS grid layout with component cards in each region, supports drag-to-reorder within and across regions.

**Step 1: Create the component**

```tsx
import { useMemo, useState } from "react";
import { Button, Typography } from "antd";
import { PlusOutlined, HolderOutlined } from "@ant-design/icons";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface LayoutRegion {
  id: string;
  label: string;
}

interface ComponentInstance {
  id: number;
  componentId: number;
  regionId: string;
  sortOrder: number;
  entityBindings: Record<string, string | string[]>;
}

interface ComponentDef {
  id: number;
  name: string;
}

interface VisualLayoutGridProps {
  gridTemplate: string;
  regions: LayoutRegion[];
  instances: ComponentInstance[];
  components: ComponentDef[];
  onAddClick: (regionId: string) => void;
  onInstanceClick: (instance: ComponentInstance) => void;
  onReorder: (
    instanceId: number,
    newRegionId: string,
    newSortOrder: number
  ) => void;
}

function SortableCard({
  instance,
  componentName,
  onClick,
}: {
  instance: ComponentInstance;
  componentName: string;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: instance.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const bindingSummary = Object.values(instance.entityBindings)
    .flat()
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: "8px 12px",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 6,
        marginBottom: 6,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
      onClick={onClick}
    >
      <span
        {...attributes}
        {...listeners}
        style={{ cursor: "grab", color: "#666" }}
        onClick={(e) => e.stopPropagation()}
      >
        <HolderOutlined />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 13 }}>{componentName}</div>
        {bindingSummary && (
          <div
            style={{
              fontSize: 11,
              color: "#888",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {bindingSummary}
          </div>
        )}
      </div>
    </div>
  );
}

export function VisualLayoutGrid({
  gridTemplate,
  regions,
  instances,
  components,
  onAddClick,
  onInstanceClick,
  onReorder,
}: VisualLayoutGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const instancesByRegion = useMemo(() => {
    const map: Record<string, ComponentInstance[]> = {};
    for (const region of regions) {
      map[region.id] = instances
        .filter((i) => i.regionId === region.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [regions, instances]);

  const componentMap = useMemo(() => {
    const map: Record<number, ComponentDef> = {};
    for (const c of components) map[c.id] = c;
    return map;
  }, [components]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as number;
    const overId = over.id;

    // Find which region the dragged item came from
    const activeInstance = instances.find((i) => i.id === activeId);
    if (!activeInstance) return;

    // Check if dropped on a region directly or on another instance
    const overInstance = instances.find((i) => i.id === overId);
    const targetRegionId = overInstance
      ? overInstance.regionId
      : (overId as string);
    const isRegionDrop = regions.some((r) => r.id === targetRegionId);

    if (overInstance) {
      // Dropped on another instance — reorder within/across regions
      const regionInstances = instancesByRegion[overInstance.regionId] || [];
      const overIndex = regionInstances.findIndex((i) => i.id === overId);
      onReorder(activeId, overInstance.regionId, overIndex);
    } else if (isRegionDrop) {
      // Dropped on empty region
      const regionInstances = instancesByRegion[targetRegionId] || [];
      onReorder(activeId, targetRegionId, regionInstances.length);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div
        style={{
          display: "grid",
          gridTemplate,
          gap: 8,
          minHeight: 400,
          padding: 8,
          background: "rgba(0,0,0,0.15)",
          borderRadius: 8,
        }}
      >
        {regions.map((region) => {
          const regionInstances = instancesByRegion[region.id] || [];
          return (
            <div
              key={region.id}
              style={{
                gridArea: region.id,
                border: "2px dashed rgba(255,255,255,0.15)",
                borderRadius: 8,
                padding: 8,
                display: "flex",
                flexDirection: "column",
                minHeight: 80,
              }}
            >
              <Typography.Text
                style={{
                  fontSize: 11,
                  color: "#888",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {region.label || region.id}
              </Typography.Text>

              <SortableContext
                items={regionInstances.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {regionInstances.map((inst) => (
                  <SortableCard
                    key={inst.id}
                    instance={inst}
                    componentName={
                      componentMap[inst.componentId]?.name ?? "Unknown"
                    }
                    onClick={() => onInstanceClick(inst)}
                  />
                ))}
              </SortableContext>

              <Button
                type="dashed"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => onAddClick(region.id)}
                style={{ marginTop: "auto" }}
                block
              >
                Add
              </Button>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}
```

**Step 2: Build and verify**

Run: `pnpm --filter admin build`
Expected: Clean build

**Step 3: Commit**

```bash
git add packages/admin/src/components/dashboard/VisualLayoutGrid.tsx
git commit -m "feat: create VisualLayoutGrid with drag-to-reorder support"
```

---

### Task 10: Replace Components tab in DashboardEditor

**Files:**
- Modify: `packages/admin/src/pages/DashboardEditor.tsx`

This is the biggest change. Replace the table-based Components tab (lines 393-700) with the visual grid, component picker, and config modals. Also need to expand the `Component` interface to include template/styles for the config modal preview.

**Step 1: Add imports**

Add at the top of the file (after existing imports):

```typescript
import { ComponentPickerModal } from "../components/dashboard/ComponentPickerModal.js";
import { ComponentConfigModal } from "../components/dashboard/ComponentConfigModal.js";
import { VisualLayoutGrid } from "../components/dashboard/VisualLayoutGrid.js";
```

**Step 2: Update Component interface**

Expand the existing `Component` interface (line 67-72) to include template and styles needed for preview:

```typescript
interface Component {
  id: number;
  name: string;
  template: string;
  styles: string;
  parameterDefs: ParameterDef[];
  entitySelectorDefs: EntitySelectorDef[];
  isContainer: boolean;
}
```

Update the `EntitySelectorDef` interface (line 62-65) to include `allowedDomains`:

```typescript
interface EntitySelectorDef {
  name: string;
  label: string;
  mode: "single" | "multiple" | "glob" | "area" | "tag";
  allowedDomains?: string[];
}
```

**Step 3: Add new state variables**

After existing state declarations (around line 104), add:

```typescript
  const [pickerRegionId, setPickerRegionId] = useState<string | null>(null);
  const [configInstance, setConfigInstance] = useState<ComponentInstance | null>(null);
  const [activeDlIndex, setActiveDlIndex] = useState(0);
```

**Step 4: Auto-load instances when active layout changes**

Replace the `selectedDlId`-based useEffect (lines 132-140). Remove `selectedDlId` state entirely. Use `activeDlIndex` with dashLayouts:

```typescript
  const activeDl = dashLayouts[activeDlIndex] ?? null;
  const activeDlId = activeDl?.id ?? null;

  useEffect(() => {
    if (activeDlId && activeDlId > 0) {
      api
        .get<ComponentInstance[]>(
          `/api/dashboard-layouts/${activeDlId}/instances`
        )
        .then(setInstances);
    } else {
      setInstances([]);
    }
  }, [activeDlId]);
```

**Step 5: Add handler functions**

Add these after the existing `updateInstance` function:

```typescript
  const handlePickerSelect = async (componentId: number) => {
    if (!activeDlId || !pickerRegionId) return;
    const regionInstances = instances.filter(
      (i) => i.regionId === pickerRegionId
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
  };

  const handleConfigSave = async (
    instanceId: number,
    updates: Partial<ComponentInstance>
  ) => {
    const updated = await api.put<ComponentInstance>(
      `/api/instances/${instanceId}`,
      updates
    );
    setInstances(instances.map((i) => (i.id === instanceId ? updated : i)));
    setConfigInstance(null);
    message.success("Component saved");
  };

  const handleConfigDelete = async (instanceId: number) => {
    await api.delete(`/api/instances/${instanceId}`);
    setInstances(instances.filter((i) => i.id !== instanceId));
    setConfigInstance(null);
    message.success("Component removed");
  };

  const handleReorder = async (
    instanceId: number,
    newRegionId: string,
    newSortOrder: number
  ) => {
    // Optimistic update
    const updated = instances.map((inst) => {
      if (inst.id === instanceId) {
        return { ...inst, regionId: newRegionId, sortOrder: newSortOrder };
      }
      // Adjust sort orders in the target region
      if (inst.regionId === newRegionId && inst.sortOrder >= newSortOrder) {
        return { ...inst, sortOrder: inst.sortOrder + 1 };
      }
      return inst;
    });
    setInstances(updated);

    await api.put(`/api/instances/${instanceId}`, {
      regionId: newRegionId,
      sortOrder: newSortOrder,
    });
  };
```

**Step 6: Replace the Components tab children**

Replace the entire `key: "components"` tab children (lines 393-700) with:

```tsx
{
  key: "components",
  label: "Components",
  children: (
    <div>
      {dashLayouts.length === 0 ? (
        <div style={{ color: "#999", padding: 24, textAlign: "center" }}>
          Add layouts in the Layouts tab first.
        </div>
      ) : (
        <>
          <Tabs
            activeKey={String(activeDlIndex)}
            onChange={(k) => setActiveDlIndex(Number(k))}
            items={dashLayouts.map((dl, i) => {
              const layout = allLayouts.find(
                (l) => l.id === dl.layoutId
              );
              return {
                key: String(i),
                label:
                  dl.label ||
                  layout?.name ||
                  `Layout ${i + 1}`,
              };
            })}
            style={{ marginBottom: 16 }}
          />

          {(() => {
            const layout = allLayouts.find(
              (l) => l.id === activeDl?.layoutId
            );
            if (!layout?.structure) return null;
            return (
              <VisualLayoutGrid
                gridTemplate={layout.structure.gridTemplate}
                regions={layout.structure.regions}
                instances={instances}
                components={allComponents}
                onAddClick={(regionId) =>
                  setPickerRegionId(regionId)
                }
                onInstanceClick={(inst) =>
                  setConfigInstance(inst)
                }
                onReorder={handleReorder}
              />
            );
          })()}
        </>
      )}

      <ComponentPickerModal
        open={pickerRegionId !== null}
        components={allComponents}
        onSelect={handlePickerSelect}
        onCancel={() => setPickerRegionId(null)}
      />

      <ComponentConfigModal
        open={configInstance !== null}
        instance={configInstance}
        component={
          configInstance
            ? allComponents.find(
                (c) => c.id === configInstance.componentId
              ) ?? null
            : null
        }
        regionLabel={
          (() => {
            const layout = allLayouts.find(
              (l) => l.id === activeDl?.layoutId
            );
            const region = layout?.structure?.regions?.find(
              (r) => r.id === configInstance?.regionId
            );
            return region?.label || region?.id || "";
          })()
        }
        globalStyles={form.getFieldValue("globalStyles") ?? {}}
        onSave={handleConfigSave}
        onDelete={handleConfigDelete}
        onCancel={() => setConfigInstance(null)}
      />
    </div>
  ),
},
```

**Step 7: Clean up unused imports and code**

Remove `selectedDlId` state, `addInstance` function, `deleteInstance` function (only the one used by the table — keep the logic in new handlers). Remove `Table` from antd imports. Remove `Popconfirm` if no longer used elsewhere (check — it's still used in the Layouts tab... actually no, layouts tab doesn't use Popconfirm). Keep `Popconfirm` as it may be used elsewhere — check and remove if unused.

Remove from antd import: `Table`
The `Popconfirm` import can be removed since it's no longer used in this file (it's now in the config modal).

**Step 8: Build and verify**

Run: `pnpm --filter admin build`
Expected: Clean build

**Step 9: Commit**

```bash
git add packages/admin/src/pages/DashboardEditor.tsx
git commit -m "feat: replace Components tab with visual grid editor"
```

---

### Task 11: Add allowedDomains and test entity support to Component Editor

**Files:**
- Modify: `packages/admin/src/components/editors/VisualEditor.tsx`
- Modify: `packages/admin/src/components/editors/HybridEditor.tsx`
- Modify: `packages/admin/src/pages/ComponentEditor.tsx`

**Step 1: Add allowedDomains to VisualEditor**

In `VisualEditor.tsx`, update the `EntitySelectorDef` interface (line 12-16):

```typescript
interface EntitySelectorDef {
  name: string;
  label: string;
  mode: "single" | "multiple" | "glob" | "area" | "tag";
  allowedDomains?: string[];
}
```

In the entity selector rendering section (line 126-158), add an allowedDomains multi-select after the mode select. Add a new state to hold available domains. Fetch entities on mount to extract domain list:

Add at the top of the component function (after line 30):

```typescript
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);

  useEffect(() => {
    api
      .get<{ entity_id: string }[]>("/api/ha/entities")
      .then((entities) => {
        const domains = new Set<string>();
        for (const e of entities) {
          const dot = e.entity_id.indexOf(".");
          if (dot > 0) domains.add(e.entity_id.substring(0, dot));
        }
        setAvailableDomains(Array.from(domains).sort());
      })
      .catch(() => {});
  }, []);
```

Add imports at the top:

```typescript
import { useState, useEffect } from "react";
import { api } from "../../api.js";
```

In the entity selector row (inside the Space at line 127), add after the mode Select (line 144-155):

```tsx
<Select
  mode="multiple"
  placeholder="All domains"
  value={sel.allowedDomains ?? []}
  onChange={(domains) =>
    updateEntitySelector(i, {
      allowedDomains: domains.length > 0 ? domains : undefined,
    })
  }
  style={{ width: 200 }}
  options={availableDomains.map((d) => ({
    value: d,
    label: d,
  }))}
  allowClear
/>
```

**Step 2: Update HybridEditor to pass allowedDomains through**

In `HybridEditor.tsx`, update the `EntitySelectorDef` interface (line 14-18):

```typescript
interface EntitySelectorDef {
  name: string;
  label: string;
  mode: "single" | "multiple" | "glob" | "area" | "tag";
  allowedDomains?: string[];
}
```

No other changes needed since it passes through to VisualEditor.

**Step 3: Add test entity bindings to ComponentEditor**

In `ComponentEditor.tsx`:

Update the `EntitySelectorDef` interface (line 16-20):

```typescript
interface EntitySelectorDef {
  name: string;
  label: string;
  mode: "single" | "multiple" | "glob" | "area" | "tag";
  allowedDomains?: string[];
}
```

Update `ComponentData` interface (line 22-30) to include `testEntityBindings`:

```typescript
interface ComponentData {
  name: string;
  template: string;
  styles: string;
  parameterDefs: ParameterDef[];
  entitySelectorDefs: EntitySelectorDef[];
  isContainer: boolean;
  containerConfig: { type: string; rotateInterval?: number } | null;
  testEntityBindings: Record<string, string | string[]> | null;
}
```

Add state for test entity bindings (after line 40):

```typescript
  const [testEntityBindings, setTestEntityBindings] = useState<
    Record<string, string | string[]>
  >({});
```

In the load effect (after line 53), add:

```typescript
          setTestEntityBindings(data.testEntityBindings ?? {});
```

Update the save payload (line 64-69) to include testEntityBindings:

```typescript
      const payload = {
        ...values,
        template,
        styles,
        parameterDefs,
        entitySelectorDefs,
        testEntityBindings,
      };
```

Add a test entity section below the HybridEditor and above the LivePreview (between lines 138-140). Import `EntitySelector`:

```tsx
import { EntitySelector } from "../components/selectors/EntitySelector.js";
```

Add after the HybridEditor div (line 138):

```tsx
      {entitySelectorDefs.length > 0 && (
        <Card title="Test Entities" size="small" style={{ marginTop: 16 }}>
          {entitySelectorDefs.map((def) => (
            <div key={def.name} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>
                {def.label || def.name}
              </div>
              <EntitySelector
                mode={def.mode}
                value={testEntityBindings[def.name]}
                onChange={(v) =>
                  setTestEntityBindings((prev) => ({
                    ...prev,
                    [def.name]: v,
                  }))
                }
                allowedDomains={def.allowedDomains}
              />
            </div>
          ))}
        </Card>
      )}
```

Update the LivePreview to use test entity bindings (line 140-145):

```tsx
      <LivePreview
        template={template}
        styles={styles}
        entityBindings={testEntityBindings}
        parameterValues={{}}
      />
```

**Step 4: Build and verify**

Run: `pnpm --filter admin build`
Expected: Clean build

**Step 5: Commit**

```bash
git add packages/admin/src/components/editors/VisualEditor.tsx packages/admin/src/components/editors/HybridEditor.tsx packages/admin/src/pages/ComponentEditor.tsx
git commit -m "feat: add allowedDomains and test entity bindings to component editor"
```

---

### Task 12: Full build and manual test

**Step 1: Build all packages**

Run: `pnpm build`
Expected: All packages build cleanly in order (shared -> admin/display -> server)

**Step 2: Run migration**

Run: `pnpm -w run db:migrate`
Expected: Migration applies, adds `test_entity_bindings` column

**Step 3: Manual smoke test checklist**

Verify the following by running the dev server:

1. **Component Editor** — Open an existing component:
   - Entity selector defs show allowedDomains multi-select
   - Test entity picker appears below each entity selector def
   - Test entities persist on save and reload
   - LivePreview renders with test entity data

2. **Dashboard Editor — Components tab**:
   - Layout tab bar shows all dashboard layouts
   - Visual grid renders with correct proportions
   - Click "+" on a region → ComponentPickerModal opens
   - Search works in picker
   - Select a component → ConfigModal opens
   - Entity bindings filtered by allowedDomains
   - Parameter inputs work
   - LivePreview updates in real-time
   - Save persists, cancel discards
   - Delete removes instance
   - Drag-to-reorder works within a region
   - Cross-region drag works

3. **Prebuilt components**:
   - Weather Card has allowedDomains: ["weather"]
   - Media Player has allowedDomains: ["media_player"]
   - Entity Value has no domain restriction

**Step 4: Commit any fixes**

If any issues found, fix and commit.

---

### Task 13: Update documentation

**Files:**
- Modify: `docs/component-authoring.md` — Document `allowedDomains` and `testEntityBindings`
- Modify: `CLAUDE.md` — Update data model section to mention `allowedDomains` and `testEntityBindings`

**Step 1: Update component-authoring.md**

Add a section about entity domain filtering and test entities.

**Step 2: Update CLAUDE.md data model**

Add to the components bullet:
- `components` — add note about `testEntityBindings` field
- `EntitySelectorDef` — add note about `allowedDomains`

**Step 3: Commit**

```bash
git add docs/component-authoring.md CLAUDE.md
git commit -m "docs: update documentation for allowedDomains and test entities"
```
