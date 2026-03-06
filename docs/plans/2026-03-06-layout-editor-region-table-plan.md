# Layout Editor Region Table Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the confusing flat dropdown rows in the Layout editor's "Detected Regions" area with a clear, labeled Ant Design Table.

**Architecture:** Pure UI refactor of a single component. The region settings data model (`regionSettings` state, `Region` interface) stays identical. Only the JSX rendering changes from inline `<Space>`/`<div>` rows to an Ant Design `<Table>` with typed columns.

**Tech Stack:** React, Ant Design (Table, Select, Checkbox, Tooltip), TypeScript

---

### Task 1: Replace region rows with Ant Design Table

**Files:**
- Modify: `packages/admin/src/pages/LayoutEditor.tsx:1-316`

**Step 1: Update imports**

Add `Table, Tooltip` and the `InfoCircleOutlined` icon to existing imports. The file currently imports from `antd` on line 3 and has no icon imports.

```tsx
// Line 3 — add Table and Tooltip to the existing import
import { Form, Input, Button, Card, Checkbox, Space, Typography, Select, Table, Tooltip, message } from "antd";
// New import for the info icon
import { InfoCircleOutlined } from "@ant-design/icons";
```

**Step 2: Replace the detected regions JSX block**

Replace lines 210-303 (the `{detectedAreas.length > 0 && (...)}` block) with a Table implementation. The table's `dataSource` is the `regions` array (already computed on line 116-123, each item has `id` plus settings). The `columns` definition handles all rendering inline.

```tsx
{detectedAreas.length > 0 && (
  <Form.Item label="Detected Regions">
    <Table
      size="small"
      pagination={false}
      dataSource={regions}
      rowKey="id"
      columns={[
        {
          title: "Region",
          dataIndex: "id",
          width: 100,
          render: (id: string) => (
            <Typography.Text code>{id}</Typography.Text>
          ),
        },
        {
          title: "Styling",
          dataIndex: "applyChromeTo",
          width: 160,
          render: (_: unknown, record: Region) => (
            <Select
              size="small"
              style={{ width: "100%" }}
              value={regionSettings[record.id]?.applyChromeTo ?? "components"}
              onChange={(val) =>
                setRegionSettings((prev) => ({
                  ...prev,
                  [record.id]: { ...prev[record.id], applyChromeTo: val },
                }))
              }
              options={[
                { label: "Each component", value: "components" },
                { label: "Whole region", value: "region" },
              ]}
            />
          ),
        },
        {
          title: "Direction",
          dataIndex: "flexDirection",
          width: 130,
          render: (_: unknown, record: Region) => (
            <Select
              size="small"
              style={{ width: "100%" }}
              value={regionSettings[record.id]?.flexDirection ?? "column"}
              onChange={(val) =>
                setRegionSettings((prev) => ({
                  ...prev,
                  [record.id]: { ...prev[record.id], flexDirection: val },
                }))
              }
              options={[
                { label: "Column \u2193", value: "column" },
                { label: "Row \u2192", value: "row" },
              ]}
            />
          ),
        },
        {
          title: "Justify",
          dataIndex: "justifyContent",
          width: 150,
          render: (_: unknown, record: Region) => (
            <Select
              size="small"
              style={{ width: "100%" }}
              placeholder="\u2014"
              value={regionSettings[record.id]?.justifyContent}
              allowClear
              onChange={(val) =>
                setRegionSettings((prev) => ({
                  ...prev,
                  [record.id]: { ...prev[record.id], justifyContent: val },
                }))
              }
              options={[
                { label: "Start", value: "flex-start" },
                { label: "Center", value: "center" },
                { label: "End", value: "flex-end" },
                { label: "Space Between", value: "space-between" },
                { label: "Space Around", value: "space-around" },
                { label: "Space Evenly", value: "space-evenly" },
              ]}
            />
          ),
        },
        {
          title: "Align",
          dataIndex: "alignItems",
          width: 120,
          render: (_: unknown, record: Region) => (
            <Select
              size="small"
              style={{ width: "100%" }}
              placeholder="\u2014"
              value={regionSettings[record.id]?.alignItems}
              allowClear
              onChange={(val) =>
                setRegionSettings((prev) => ({
                  ...prev,
                  [record.id]: { ...prev[record.id], alignItems: val },
                }))
              }
              options={[
                { label: "Stretch", value: "stretch" },
                { label: "Start", value: "flex-start" },
                { label: "Center", value: "center" },
                { label: "End", value: "flex-end" },
              ]}
            />
          ),
        },
        {
          title: (
            <Space size={4}>
              Fill
              <Tooltip title="Components will grow to fill the available space in this region">
                <InfoCircleOutlined style={{ color: "rgba(255,255,255,0.45)", cursor: "help" }} />
              </Tooltip>
            </Space>
          ),
          dataIndex: "flexGrow",
          width: 80,
          align: "center" as const,
          render: (_: unknown, record: Region) => (
            <Checkbox
              checked={regionSettings[record.id]?.flexGrow ?? false}
              onChange={(e) =>
                setRegionSettings((prev) => ({
                  ...prev,
                  [record.id]: { ...prev[record.id], flexGrow: e.target.checked },
                }))
              }
            />
          ),
        },
      ]}
    />
  </Form.Item>
)}
```

**Step 3: Build and verify**

Run: `cd /Users/tom.stevens/git/ha-external-dashboards && pnpm --filter admin build`
Expected: Build succeeds with no TypeScript errors.

**Step 4: Visual verification**

Open the Layout editor in the browser, create or edit a layout with a grid template that has multiple regions. Verify:
- Table renders with labeled column headers
- "Styling" shows "Each component" / "Whole region"
- "Direction" shows "Column ↓" / "Row →"
- "Justify" and "Align" are clearable
- "Fill" column header has info icon with tooltip on hover
- Saving still works (no data model changes)

**Step 5: Commit**

```bash
git add packages/admin/src/pages/LayoutEditor.tsx
git commit -m "feat: replace layout region settings with labeled table

Replaces confusing flat dropdown rows with an Ant Design Table.
Renames 'Chrome -> Components/Region' to 'Each component/Whole region'.
Adds direction arrows, column headers, and Fill tooltip."
```
