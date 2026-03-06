# Dashboard Editor Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve the dashboard editor UX by making Settings a 3-column grid and merging Layouts+Components into a single tab with an editable tab bar.

**Architecture:** Pure frontend refactor of `DashboardEditor.tsx`. One new modal component (`LayoutTabModal`) for add/edit/remove of layout tabs. No backend changes.

**Tech Stack:** React, Ant Design (Row, Col, Modal, Tabs), existing api helper

---

### Task 1: Refactor Settings tab to 3-column grid

**Files:**
- Modify: `packages/admin/src/pages/DashboardEditor.tsx:316-410`

**Step 1: Add Row/Col imports**

Add `Row` and `Col` to the Ant Design import at line 3:

```tsx
import {
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Button,
  Card,
  Space,
  Alert,
  Tabs,
  Row,
  Col,
  message,
} from "antd";
```

**Step 2: Also watch `layoutSwitchMode` from the form**

Add after line 124:

```tsx
const layoutSwitchMode = Form.useWatch("layoutSwitchMode", form);
```

**Step 3: Replace the Settings tab children**

Replace the Settings tab `children` (the `<div>` at lines 322-409) with:

```tsx
<div>
  <Row gutter={16}>
    <Col span={8}>
      <Form.Item name="name" label="Name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
    </Col>
    <Col span={8}>
      <Form.Item
        name="slug"
        label="Slug"
        rules={[
          { required: true },
          { pattern: /^[a-z0-9-]+$/, message: "Lowercase, numbers, hyphens only" },
        ]}
      >
        <Input />
      </Form.Item>
    </Col>
    <Col span={8}>
      <Form.Item name="accessMode" label="Access Mode">
        <Select
          options={[
            { value: "public", label: "Public" },
            { value: "password", label: "Password" },
            { value: "header", label: "Header" },
          ]}
        />
      </Form.Item>
    </Col>
  </Row>

  {accessMode === "password" && (
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item name="password" label="Password">
          <Input.Password />
        </Form.Item>
      </Col>
    </Row>
  )}

  {accessMode === "header" && (
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item name="headerName" label="Header Name">
          <Input />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item name="headerValue" label="Header Value">
          <Input />
        </Form.Item>
      </Col>
    </Row>
  )}

  <Row gutter={16}>
    <Col span={8}>
      <Form.Item name="themeId" label="Theme">
        <Select
          allowClear
          placeholder="No theme"
          options={allThemes.map((t) => ({ value: t.id, label: t.name }))}
        />
      </Form.Item>
    </Col>
    <Col span={8}>
      <Form.Item
        name="maxWidth"
        label="Max Width"
        tooltip="Maximum width of the layout area (e.g. 1200px, 80%). Leave empty for full width."
      >
        <Input placeholder="e.g. 1200px, 80%" allowClear />
      </Form.Item>
    </Col>
    <Col span={8}>
      <Form.Item
        name="padding"
        label="Padding"
        tooltip="Padding around the layout area (e.g. 16px, 2rem 4rem)"
      >
        <Input placeholder="e.g. 16px, 2rem 4rem" allowClear />
      </Form.Item>
    </Col>
  </Row>

  <Row gutter={16}>
    <Col span={8}>
      <Form.Item name="interactiveMode" label="Interactive Mode" valuePropName="checked">
        <Switch />
      </Form.Item>
    </Col>
    <Col span={8}>
      <Form.Item name="layoutSwitchMode" label="Layout Switch Mode">
        <Select
          options={[
            { value: "tabs", label: "Tabs" },
            { value: "auto-rotate", label: "Auto Rotate" },
          ]}
        />
      </Form.Item>
    </Col>
    {layoutSwitchMode === "auto-rotate" && (
      <Col span={8}>
        <Form.Item name="layoutRotateInterval" label="Rotate Interval (s)">
          <InputNumber min={5} />
        </Form.Item>
      </Col>
    )}
  </Row>
</div>
```

**Step 4: Build and verify visually**

Run: `cd packages/admin && pnpm build`

Open the dashboard editor in the browser and confirm:
- Fields are in 3 columns
- Conditional fields appear/disappear correctly
- Rotate Interval only shows when Layout Switch Mode is "auto-rotate"

**Step 5: Commit**

```bash
git add packages/admin/src/pages/DashboardEditor.tsx
git commit -m "feat: dashboard editor settings tab 3-column grid layout"
```

---

### Task 2: Create LayoutTabModal component

**Files:**
- Create: `packages/admin/src/components/dashboard/LayoutTabModal.tsx`

**Step 1: Create the modal component**

```tsx
import { useEffect } from "react";
import { Modal, Form, Select, Input, Button, Space } from "antd";

interface Layout {
  id: number;
  name: string;
}

interface LayoutTabModalProps {
  open: boolean;
  mode: "add" | "edit";
  layoutId?: number;
  label?: string | null;
  allLayouts: Layout[];
  canRemove: boolean;
  onSave: (layoutId: number, label: string | null) => void;
  onRemove: () => void;
  onCancel: () => void;
}

export function LayoutTabModal({
  open,
  mode,
  layoutId,
  label,
  allLayouts,
  canRemove,
  onSave,
  onRemove,
  onCancel,
}: LayoutTabModalProps) {
  const [form] = Form.useForm<{ layoutId: number; label: string }>();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        layoutId: layoutId ?? allLayouts[0]?.id,
        label: label ?? "",
      });
    }
  }, [open, layoutId, label, allLayouts, form]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSave(values.layoutId, values.label || null);
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
          <Input placeholder="Optional — defaults to layout name" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
```

**Step 2: Build to verify no type errors**

Run: `cd packages/admin && pnpm build`

**Step 3: Commit**

```bash
git add packages/admin/src/components/dashboard/LayoutTabModal.tsx
git commit -m "feat: add LayoutTabModal component for dashboard editor"
```

---

### Task 3: Merge Layouts + Components into single "Layouts" tab

**Files:**
- Modify: `packages/admin/src/pages/DashboardEditor.tsx:412-577`

**Step 1: Add imports**

Add to icon imports (line 16):

```tsx
import { PlusOutlined, EditOutlined } from "@ant-design/icons";
```

Remove `DeleteOutlined` (no longer needed).

Add the new modal import after line 19:

```tsx
import { LayoutTabModal } from "../components/dashboard/LayoutTabModal.js";
```

**Step 2: Add modal state**

Add after the `activeDlIndex` state (line 119):

```tsx
const [layoutTabModal, setLayoutTabModal] = useState<{
  open: boolean;
  mode: "add" | "edit";
  index: number;
} | null>(null);
```

**Step 3: Replace the old Layouts and Components tab items**

Replace lines 412-576 (the `...(!isNew ? [{ key: "layouts" ... }, { key: "components" ... }] : [])` spread) with a single "Layouts" tab:

```tsx
...(!isNew
  ? [
      {
        key: "layouts",
        label: "Layouts",
        children: (
          <div>
            {dashLayouts.length === 0 ? (
              <div style={{ color: "#999", padding: 24, textAlign: "center" }}>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() =>
                    setLayoutTabModal({ open: true, mode: "add", index: -1 })
                  }
                >
                  Add First Layout
                </Button>
              </div>
            ) : (
              <>
                <Tabs
                  activeKey={String(activeDlIndex)}
                  onChange={(k) => setActiveDlIndex(Number(k))}
                  tabBarExtraContent={
                    <Button
                      type="text"
                      icon={<PlusOutlined />}
                      onClick={() =>
                        setLayoutTabModal({
                          open: true,
                          mode: "add",
                          index: -1,
                        })
                      }
                    />
                  }
                  items={dashLayouts.map((dl, i) => {
                    const layout = allLayouts.find(
                      (l) => l.id === dl.layoutId
                    );
                    return {
                      key: String(i),
                      label: (
                        <span>
                          {dl.label || layout?.name || `Layout ${i + 1}`}
                          <EditOutlined
                            style={{
                              marginLeft: 6,
                              fontSize: 11,
                              opacity: 0.5,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setLayoutTabModal({
                                open: true,
                                mode: "edit",
                                index: i,
                              });
                            }}
                          />
                        </span>
                      ),
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
                      onAddToContainer={(containerInstanceId) =>
                        setPickerContainerInstanceId(containerInstanceId)
                      }
                    />
                  );
                })()}
              </>
            )}

            <ComponentPickerModal
              open={
                pickerRegionId !== null ||
                pickerContainerInstanceId !== null
              }
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
              regionLabel={(() => {
                const layout = allLayouts.find(
                  (l) => l.id === activeDl?.layoutId
                );
                const region = layout?.structure?.regions?.find(
                  (r) => r.id === configInstance?.regionId
                );
                return region?.id || "";
              })()}
              globalStyles={{
                ...Object.fromEntries(
                  Object.entries({
                    ...STANDARD_VARIABLE_DEFAULTS,
                    ...(selectedTheme?.standardVariables ?? {}),
                  }).filter(
                    ([k]) =>
                      k !== "backgroundType" && k !== "backgroundImage"
                  )
                ),
                ...(selectedTheme?.globalStyles ?? {}),
              }}
              standardVariables={
                (selectedTheme?.standardVariables ?? {}) as Record<
                  string,
                  string
                >
              }
              onSave={handleConfigSave}
              onDelete={handleConfigDelete}
              onCancel={() => setConfigInstance(null)}
            />

            <LayoutTabModal
              open={layoutTabModal?.open ?? false}
              mode={layoutTabModal?.mode ?? "add"}
              layoutId={
                layoutTabModal?.mode === "edit" && layoutTabModal.index >= 0
                  ? dashLayouts[layoutTabModal.index]?.layoutId
                  : undefined
              }
              label={
                layoutTabModal?.mode === "edit" && layoutTabModal.index >= 0
                  ? dashLayouts[layoutTabModal.index]?.label
                  : undefined
              }
              allLayouts={allLayouts}
              canRemove={dashLayouts.length > 1}
              onSave={(layoutId, label) => {
                if (layoutTabModal?.mode === "add") {
                  setDashLayouts([
                    ...dashLayouts,
                    {
                      id: 0,
                      layoutId,
                      sortOrder: dashLayouts.length,
                      label,
                    },
                  ]);
                  setActiveDlIndex(dashLayouts.length);
                } else if (
                  layoutTabModal?.mode === "edit" &&
                  layoutTabModal.index >= 0
                ) {
                  const next = [...dashLayouts];
                  next[layoutTabModal.index] = {
                    ...next[layoutTabModal.index],
                    layoutId,
                    label,
                  };
                  setDashLayouts(next);
                }
                setLayoutTabModal(null);
              }}
              onRemove={() => {
                if (
                  layoutTabModal?.mode === "edit" &&
                  layoutTabModal.index >= 0
                ) {
                  const next = dashLayouts.filter(
                    (_, j) => j !== layoutTabModal.index
                  );
                  setDashLayouts(next);
                  if (activeDlIndex >= next.length) {
                    setActiveDlIndex(Math.max(0, next.length - 1));
                  }
                }
                setLayoutTabModal(null);
              }}
              onCancel={() => setLayoutTabModal(null)}
            />
          </div>
        ),
      },
    ]
  : []),
```

**Step 4: Remove the old `addLayout` function**

Delete lines 199-210 (the `addLayout` function) — it's replaced by the modal flow.

**Step 5: Build and verify**

Run: `cd packages/admin && pnpm build`

Open the dashboard editor in the browser and verify:
- Only two tabs: "Settings" and "Layouts"
- Layout tab bar shows each dashboard_layout with edit icon
- Plus button at end of tab bar opens add modal
- Edit icon opens edit modal with layout selector + label + remove button
- Remove button hidden when only one layout tab remains
- VisualLayoutGrid renders correctly for active tab
- Component picker and config modals still work

**Step 6: Commit**

```bash
git add packages/admin/src/pages/DashboardEditor.tsx packages/admin/src/components/dashboard/LayoutTabModal.tsx
git commit -m "feat: merge layouts and components into single tab with editable tab bar"
```
