# Dashboard Tab Bar Theming & Icon Support — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add theme-controlled tab bar styling and MDI icon support for dashboard layout tabs.

**Architecture:** Extend `StandardVariables` with 5 new tab bar properties, add `icon` column to `dashboardLayouts` table, update LayoutTabModal with icon picker and cross-field validation, update DashboardRenderer to render themed tabs with icons.

**Tech Stack:** TypeScript, Drizzle ORM (SQLite), React, Ant Design, @mdi/react, Zod

---

### Task 1: Extend StandardVariables with Tab Bar Properties

**Files:**
- Modify: `packages/shared/src/types/index.ts:51-98`

**Step 1: Add tab bar fields to StandardVariables interface**

In `packages/shared/src/types/index.ts`, add 5 new fields to `StandardVariables` after `backgroundImage`:

```typescript
export interface StandardVariables {
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
  backgroundImage: string;
  tabBarBg: string;
  tabBarColor: string;
  tabBarActiveColor: string;
  tabBarActiveBg: string;
  tabBarFontSize: string;
}
```

**Step 2: Add defaults for the new fields**

In `STANDARD_VARIABLE_DEFAULTS`, add after `backgroundImage: ""`:

```typescript
  tabBarBg: "transparent",
  tabBarColor: "rgba(255,255,255,0.6)",
  tabBarActiveColor: "#ffffff",
  tabBarActiveBg: "rgba(255,255,255,0.15)",
  tabBarFontSize: "14px",
```

**Step 3: Add CSS map entries for the new fields**

In `STANDARD_VARIABLE_CSS_MAP`, add after `backgroundColor`:

```typescript
  tabBarBg: "--db-tab-bar-bg",
  tabBarColor: "--db-tab-bar-color",
  tabBarActiveColor: "--db-tab-bar-active-color",
  tabBarActiveBg: "--db-tab-bar-active-bg",
  tabBarFontSize: "--db-tab-bar-font-size",
```

**Step 4: Build shared package**

Run: `cd packages/shared && pnpm build`
Expected: Clean build, no errors

**Step 5: Commit**

```
feat: add tab bar theme variables to StandardVariables
```

---

### Task 2: Add `icon` Column to `dashboardLayouts`

**Files:**
- Modify: `packages/server/src/db/schema.ts:73-83`

**Step 1: Add icon column to schema**

In `packages/server/src/db/schema.ts`, add `icon` field to the `dashboardLayouts` table definition after `label`:

```typescript
export const dashboardLayouts = sqliteTable("dashboard_layouts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dashboardId: integer("dashboard_id")
    .notNull()
    .references(() => dashboards.id, { onDelete: "cascade" }),
  layoutId: integer("layout_id")
    .notNull()
    .references(() => layouts.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  label: text("label"),
  icon: text("icon"),
});
```

**Step 2: Generate migration**

Run: `pnpm -w run db:generate`
Expected: New migration file in `drizzle/` adding `icon` column

**Step 3: Commit**

```
feat: add icon column to dashboard_layouts table
```

---

### Task 3: Update API Validation for Dashboard Layouts

**Files:**
- Modify: `packages/server/src/routes/dashboards.ts:127-175`

**Step 1: Update Zod schema for PUT `/api/dashboards/:id/layouts`**

Replace the Zod schema in the layouts PUT route (lines 131-140) with:

```typescript
      const body = z
        .array(
          z.object({
            id: z.number().int().optional(),
            layoutId: z.number().int(),
            sortOrder: z.number().int(),
            label: z.string().nullable().default(null),
            icon: z.string().nullable().default(null),
          }).refine(
            (item) => item.label || item.icon,
            { message: "Each tab must have at least a label or an icon" }
          )
        )
        .parse(req.body);
```

**Step 2: Update the update/insert operations to include icon**

In the same route, update the `.set()` call (line 158) to include `icon`:

```typescript
          await db
            .update(dashboardLayouts)
            .set({ layoutId: l.layoutId, sortOrder: l.sortOrder, label: l.label, icon: l.icon })
            .where(eq(dashboardLayouts.id, l.id));
```

And the `.values()` call (lines 161-165):

```typescript
          await db.insert(dashboardLayouts).values({
            dashboardId,
            layoutId: l.layoutId,
            sortOrder: l.sortOrder,
            label: l.label,
            icon: l.icon,
          });
```

**Step 3: Commit**

```
feat: accept icon field in dashboard layouts API
```

---

### Task 4: Update LayoutTabModal with Icon Picker

**Files:**
- Modify: `packages/admin/src/components/dashboard/LayoutTabModal.tsx`

**Step 1: Rewrite LayoutTabModal to include icon picker and cross-field validation**

Replace the entire file content with:

```tsx
import { useEffect, useState } from "react";
import { Modal, Form, Select, Input, Button, Space } from "antd";
import { MdiIconSelector } from "../selectors/MdiIconSelector.js";

interface Layout {
  id: number;
  name: string;
  structure?: {
    gridTemplate: string;
    regions: { id: string }[];
  };
}

interface LayoutTabModalProps {
  open: boolean;
  mode: "add" | "edit";
  layoutId?: number;
  label?: string | null;
  icon?: string | null;
  allLayouts: Layout[];
  canRemove: boolean;
  onSave: (layoutId: number, label: string | null, icon: string | null) => void;
  onRemove: () => void;
  onCancel: () => void;
}

export function LayoutTabModal({
  open,
  mode,
  layoutId,
  label,
  icon,
  allLayouts,
  canRemove,
  onSave,
  onRemove,
  onCancel,
}: LayoutTabModalProps) {
  const [form] = Form.useForm<{ layoutId: number; label: string }>();
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        layoutId: layoutId ?? allLayouts[0]?.id,
        label: label ?? "",
      });
      setSelectedIcon(icon ?? null);
      setValidationError(null);
    }
  }, [open, layoutId, label, icon, allLayouts, form]);

  const selectedLayoutId = Form.useWatch("layoutId", form);
  const selectedLayout = allLayouts.find((l) => l.id === selectedLayoutId);

  const handleOk = () => {
    form.validateFields().then((values) => {
      const trimmedLabel = values.label?.trim() || null;
      if (!trimmedLabel && !selectedIcon) {
        setValidationError("Please provide at least a label or an icon");
        return;
      }
      setValidationError(null);
      onSave(values.layoutId, trimmedLabel, selectedIcon);
    });
  };

  return (
    <Modal
      title={mode === "add" ? "Add Layout Tab" : "Edit Layout Tab"}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            {mode === "edit" && canRemove && (
              <Button danger onClick={onRemove}>
                Remove
              </Button>
            )}
          </div>
          <Space>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" onClick={handleOk}>
              {mode === "add" ? "Add" : "Save"}
            </Button>
          </Space>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item name="layoutId" label="Layout" rules={[{ required: true }]}>
          <Select
            options={allLayouts.map((l) => ({ value: l.id, label: l.name }))}
          />
        </Form.Item>
        <Form.Item name="label" label="Tab Label">
          <Input />
        </Form.Item>
        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 8, color: "rgba(0, 0, 0, 0.88)" }}>
            Tab Icon
          </div>
          <MdiIconSelector value={selectedIcon} onChange={setSelectedIcon} />
        </div>
        {validationError && (
          <div style={{ color: "#ff4d4f", marginBottom: 16 }}>
            {validationError}
          </div>
        )}
      </Form>

      {selectedLayout?.structure && (
        <div
          style={{
            display: "grid",
            gridTemplate: selectedLayout.structure.gridTemplate,
            gap: 4,
            minHeight: 120,
            background: "#f5f5f5",
            border: "1px solid #e8e8e8",
            padding: 8,
            borderRadius: 8,
          }}
        >
          {selectedLayout.structure.regions.map((r) => (
            <div
              key={r.id}
              style={{
                gridArea: r.id,
                background: "#fff",
                border: "1px dashed #d9d9d9",
                borderRadius: 4,
                padding: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#8c8c8c",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {r.id}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
```

**Step 2: Commit**

```
feat: add icon picker and cross-field validation to LayoutTabModal
```

---

### Task 5: Update DashboardEditor to Pass Icon

**Files:**
- Modify: `packages/admin/src/pages/DashboardEditor.tsx`

**Step 1: Add `icon` to the `DashboardLayout` interface**

At line 43-48, add `icon`:

```typescript
interface DashboardLayout {
  id: number;
  layoutId: number;
  sortOrder: number;
  label: string | null;
  icon: string | null;
}
```

**Step 2: Update `saveLayouts` to include icon**

In `saveLayouts` (line 177-189), add `icon` to the mapped payload:

```typescript
  const saveLayouts = async () => {
    if (!id) return;
    const result = await api.put<DashboardLayout[]>(
      `/api/dashboards/${id}/layouts`,
      dashLayouts.map((l, i) => ({
        id: l.id > 0 ? l.id : undefined,
        layoutId: l.layoutId,
        sortOrder: i,
        label: l.label,
        icon: l.icon,
      }))
    );
    setDashLayouts(result);
  };
```

**Step 3: Update LayoutTabModal props to pass icon**

In the `<LayoutTabModal>` usage (line 588-645), add the `icon` prop and update the `onSave` handler:

Pass `icon` prop:
```typescript
  icon={
    layoutTabModal?.mode === "edit" && layoutTabModal.index >= 0
      ? dashLayouts[layoutTabModal.index]?.icon
      : undefined
  }
```

Update `onSave` callback signature to `(layoutId, label, icon)`:

For add mode:
```typescript
  {
    id: 0,
    layoutId,
    sortOrder: dashLayouts.length,
    label,
    icon,
  },
```

For edit mode:
```typescript
  next[layoutTabModal.index] = {
    ...next[layoutTabModal.index],
    layoutId,
    label,
    icon,
  };
```

**Step 4: Commit**

```
feat: pass icon through DashboardEditor layout tab flow
```

---

### Task 6: Add Tab Bar Section to ThemeEditor

**Files:**
- Modify: `packages/admin/src/pages/ThemeEditor.tsx:186-190`

**Step 1: Add Tab Bar section after Layout section**

In ThemeEditor, in column 2 (the middle column), after the Layout section with `componentGap` (around line 189), add:

```tsx
            <div
              style={{
                fontWeight: 500,
                fontSize: 13,
                marginBottom: 8,
                marginTop: 16,
              }}
            >
              Tab Bar
            </div>
            {colorField("Background", "tabBarBg")}
            {colorField("Inactive Color", "tabBarColor")}
            {colorField("Active Color", "tabBarActiveColor")}
            {colorField("Active Background", "tabBarActiveBg")}
            {textField("Font Size", "tabBarFontSize", "14px")}
```

**Step 2: Commit**

```
feat: add tab bar section to theme editor
```

---

### Task 7: Update DisplayApp CSS Variable Injection

**Files:**
- Modify: `packages/display/src/DisplayApp.tsx:119-144`

**Step 1: Add tab bar defaults and CSS map entries**

In the `defaults` object (lines 119-131), add:
```typescript
      tabBarBg: "transparent",
      tabBarColor: "rgba(255,255,255,0.6)",
      tabBarActiveColor: "#ffffff",
      tabBarActiveBg: "rgba(255,255,255,0.15)",
      tabBarFontSize: "14px",
```

In the `cssMap` object (lines 132-144), add:
```typescript
      tabBarBg: "--db-tab-bar-bg",
      tabBarColor: "--db-tab-bar-color",
      tabBarActiveColor: "--db-tab-bar-active-color",
      tabBarActiveBg: "--db-tab-bar-active-bg",
      tabBarFontSize: "--db-tab-bar-font-size",
```

**Step 2: Commit**

```
feat: inject tab bar CSS variables from theme
```

---

### Task 8: Update DashboardRenderer with Icons and Theme Styling

**Files:**
- Modify: `packages/display/src/runtime/DashboardRenderer.tsx`

**Step 1: Add icon and theme support to DashboardRenderer**

Replace the entire file with:

```tsx
import { useState, useEffect } from "react";
import Icon from "@mdi/react";
import * as mdiIcons from "@mdi/js";
import { LayoutRenderer } from "./LayoutRenderer.js";
import type { EntityState } from "../template/engine.js";

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

interface DashboardLayout {
  id: number;
  layoutId: number;
  sortOrder: number;
  label: string | null;
  icon: string | null;
  layout: {
    structure: {
      gridTemplate: string;
      regions: { id: string; gridArea: string; applyChromeTo?: "components" | "region" }[];
    };
  };
  instances: ComponentInstance[];
}

interface ComponentInstance {
  id: number;
  componentId: number;
  regionId: string;
  sortOrder: number;
  parameterValues: Record<string, string | number | boolean>;
  entityBindings: Record<string, string | string[]>;
  visibilityRules: {
    entityId: string;
    attribute?: string;
    operator: string;
    value: string;
  }[];
  parentInstanceId: number | null;
}

interface ComponentDef {
  id: number;
  template: string;
  styles: string;
  isContainer: boolean;
  containerConfig: { type: string; rotateInterval?: number } | null;
}

interface DashboardRendererProps {
  dashboardLayouts: DashboardLayout[];
  components: Record<number, ComponentDef>;
  entities: Record<string, EntityState>;
  globalStyles: Record<string, string>;
  maxWidth?: string | null;
  padding?: string | null;
  layoutSwitchMode: "tabs" | "auto-rotate";
  layoutRotateInterval: number;
}

export function DashboardRenderer({
  dashboardLayouts,
  components,
  entities,
  globalStyles,
  maxWidth,
  padding,
  layoutSwitchMode,
  layoutRotateInterval,
}: DashboardRendererProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Auto-rotate layouts
  useEffect(() => {
    if (layoutSwitchMode !== "auto-rotate" || dashboardLayouts.length <= 1)
      return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % dashboardLayouts.length);
    }, layoutRotateInterval * 1000);
    return () => clearInterval(interval);
  }, [layoutSwitchMode, layoutRotateInterval, dashboardLayouts.length]);

  if (dashboardLayouts.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          color: "#aaa",
        }}
      >
        No layouts configured
      </div>
    );
  }

  const activeDl = dashboardLayouts[activeIndex];
  if (!activeDl) return null;

  const hasTabs = layoutSwitchMode === "tabs" && dashboardLayouts.length > 1;

  // Read tab bar theme values from globalStyles
  const tabBarBg = globalStyles.tabBarBg ?? "transparent";
  const tabBarColor = globalStyles.tabBarColor ?? "rgba(255,255,255,0.6)";
  const tabBarActiveColor = globalStyles.tabBarActiveColor ?? "#ffffff";
  const tabBarActiveBg = globalStyles.tabBarActiveBg ?? "rgba(255,255,255,0.15)";
  const tabBarFontSize = globalStyles.tabBarFontSize ?? "14px";

  const contentHeight = hasTabs ? "calc(100vh - 40px)" : "100vh";

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      {hasTabs && (
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: "4px 8px",
            background: tabBarBg,
          }}
        >
          {dashboardLayouts.map((dl, i) => {
            const isActive = i === activeIndex;
            const iconPath = dl.icon ? getIconPath(dl.icon) : undefined;
            return (
              <button
                key={dl.id}
                onClick={() => setActiveIndex(i)}
                style={{
                  padding: "6px 16px",
                  border: "none",
                  borderRadius: 4,
                  background: isActive ? tabBarActiveBg : "transparent",
                  color: isActive ? tabBarActiveColor : tabBarColor,
                  cursor: "pointer",
                  fontSize: tabBarFontSize,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "inherit",
                  transition: "color 0.2s, background 0.2s",
                }}
              >
                {iconPath && (
                  <Icon
                    path={iconPath}
                    size={tabBarFontSize}
                    color={isActive ? tabBarActiveColor : tabBarColor}
                  />
                )}
                {dl.label}
              </button>
            );
          })}
        </div>
      )}
      <div
        style={{
          height: contentHeight,
          maxWidth: maxWidth || undefined,
          padding: padding || undefined,
          margin: maxWidth ? "0 auto" : undefined,
          boxSizing: "border-box",
        }}
      >
        <LayoutRenderer
          structure={activeDl.layout.structure}
          instances={activeDl.instances}
          components={components}
          entities={entities}
          globalStyles={globalStyles}
        />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```
feat: render themed tab bar with icon support in DashboardRenderer
```

---

### Task 9: Build, Migrate, and Verify

**Step 1: Build all packages**

Run: `pnpm build`
Expected: Clean build across all packages

**Step 2: Run migration**

Run: `pnpm -w run db:migrate`
Expected: Migration applies `icon` column to `dashboard_layouts`

**Step 3: Manual verification checklist**

- Theme editor shows "Tab Bar" section with 5 fields
- LayoutTabModal shows icon picker, validates at least one of icon/label
- Dashboard display renders icons in tab bar when present
- Tab bar uses theme colors (background, active/inactive colors, font size)
- Tabs with only an icon (no label) render correctly
- Tabs with only a label (no icon) render correctly
- Tabs with both icon and label render correctly

**Step 4: Commit**

```
chore: build and verify tab bar theming and icon support
```
