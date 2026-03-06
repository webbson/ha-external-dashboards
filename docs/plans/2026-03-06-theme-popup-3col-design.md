# Theme Editor & Popup Trigger 3-Column Layout Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize ThemeEditor and PopupTrigger pages to use 3-column layouts with an asset picker for popup media selection.

**Architecture:** Both pages adopt the Ant Design `Row`/`Col span={8}` pattern already used in DashboardEditor Settings tab. ThemeEditor inlines StandardVariablesForm fields directly into a 3-column grid. PopupTrigger adds an asset/URL toggle for image and video content types.

**Tech Stack:** React, Ant Design (Row, Col, Form, Select, Radio, ColorPicker), existing `/api/assets` endpoint.

---

## Task 1: Refactor ThemeEditor to 3-Column Layout

**Files:**
- Modify: `packages/admin/src/pages/ThemeEditor.tsx` (full rewrite of JSX)
- Delete: `packages/admin/src/components/dashboard/StandardVariablesForm.tsx` (only used in ThemeEditor)

**Step 1: Rewrite ThemeEditor JSX**

Replace the current single-column form + StandardVariablesForm delegation with inlined fields in a 3-column grid. Keep all existing state management and handlers.

Add imports:

```tsx
import { ColorPicker, Radio, Row, Col, Select } from "antd";
import { STANDARD_VARIABLE_DEFAULTS } from "@ha-external-dashboards/shared";
```

Add image assets state and fetch (copied from StandardVariablesForm):

```tsx
const [imageAssets, setImageAssets] = useState<{ id: number; name: string; fileName: string; mimeType: string }[]>([]);

useEffect(() => {
  api.get<{ id: number; name: string; fileName: string; mimeType: string }[]>("/api/assets").then((assets) => {
    setImageAssets(assets.filter((a) => a.mimeType.startsWith("image/")));
  });
}, []);
```

Add helper merged value and field renderers (same as StandardVariablesForm had):

```tsx
const merged = { ...STANDARD_VARIABLE_DEFAULTS, ...standardVariables };

const updateVar = (key: keyof StandardVariables, val: string) => {
  setStandardVariables({ ...standardVariables, [key]: val });
};

const colorField = (label: string, key: keyof StandardVariables) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>{label}</div>
    <ColorPicker value={merged[key]} onChange={(_, hex) => updateVar(key, hex)} showText />
  </div>
);

const textField = (label: string, key: keyof StandardVariables, placeholder?: string) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>{label}</div>
    <Input
      value={merged[key]}
      onChange={(e) => updateVar(key, e.target.value)}
      placeholder={placeholder ?? STANDARD_VARIABLE_DEFAULTS[key]}
      style={{ width: "100%" }}
    />
  </div>
);
```

Replace the form body with this 3-column layout:

```tsx
<Form form={form} layout="vertical" onFinish={onFinish}>
  {/* Row 1: Name / Typography / Background */}
  <Row gutter={16}>
    <Col span={8}>
      <Form.Item name="name" label="Name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
    </Col>
    <Col span={8}>
      <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Typography</div>
      {textField("Font Family", "fontFamily", "inherit")}
      {textField("Font Size", "fontSize", "16px")}
    </Col>
    <Col span={8}>
      <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Background</div>
      <Radio.Group
        value={merged.backgroundType}
        onChange={(e) => updateVar("backgroundType", e.target.value)}
        style={{ marginBottom: 12 }}
      >
        <Radio value="color">Color</Radio>
        <Radio value="image">Image</Radio>
      </Radio.Group>
      {merged.backgroundType === "color" ? (
        <div>
          <ColorPicker
            value={merged.backgroundColor}
            onChange={(_, hex) => updateVar("backgroundColor", hex)}
            showText
          />
        </div>
      ) : (
        <div>
          <Select
            value={merged.backgroundImage || undefined}
            onChange={(v) => updateVar("backgroundImage", v)}
            placeholder="Select an image asset"
            style={{ width: "100%" }}
            allowClear
            options={imageAssets.map((a) => ({
              value: a.fileName,
              label: a.name,
            }))}
          />
          {merged.backgroundImage && (
            <div style={{ marginTop: 8 }}>
              <img
                src={`/api/assets/${imageAssets.find((a) => a.fileName === merged.backgroundImage)?.id}/file`}
                alt="Background preview"
                style={{ maxWidth: 200, maxHeight: 120, borderRadius: 4, border: "1px solid #333", objectFit: "cover" }}
              />
            </div>
          )}
        </div>
      )}
    </Col>
  </Row>

  {/* Row 2: Colors / Component Chrome / Custom Variables */}
  <Row gutter={16}>
    <Col span={8}>
      <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Colors</div>
      {colorField("Component Background", "componentBg")}
      {colorField("Primary Font Color", "fontColor")}
      {colorField("Secondary Font Color", "fontColorSecondary")}
      {colorField("Accent Color", "accentColor")}
    </Col>
    <Col span={8}>
      <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Component Chrome</div>
      {textField("Border Style", "borderStyle", "none")}
      {textField("Border Radius", "borderRadius", "0px")}
      {textField("Component Padding", "componentPadding", "0px")}
      <div style={{ fontWeight: 500, fontSize: 13, marginTop: 16, marginBottom: 8 }}>Layout</div>
      {textField("Component Gap", "componentGap", "0px")}
    </Col>
    <Col span={8}>
      <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Custom Variables</div>
      {globalStyleEntries.map((entry, i) => (
        <Space key={i} style={{ display: "flex", marginBottom: 8 }}>
          <Input
            placeholder="Variable name"
            value={entry.key}
            onChange={(e) => {
              const next = [...globalStyleEntries];
              next[i] = { ...next[i], key: e.target.value };
              setGlobalStyleEntries(next);
            }}
          />
          <Input
            placeholder="Value"
            value={entry.value}
            onChange={(e) => {
              const next = [...globalStyleEntries];
              next[i] = { ...next[i], value: e.target.value };
              setGlobalStyleEntries(next);
            }}
          />
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => setGlobalStyleEntries(globalStyleEntries.filter((_, j) => j !== i))}
          />
        </Space>
      ))}
      <Button
        icon={<PlusOutlined />}
        onClick={() => setGlobalStyleEntries([...globalStyleEntries, { key: "", value: "" }])}
      >
        Add Variable
      </Button>
    </Col>
  </Row>

  <Form.Item style={{ marginTop: 16 }}>
    <Space>
      <Button type="primary" htmlType="submit" loading={loading}>
        {isNew ? "Create" : "Save"}
      </Button>
      <Button onClick={() => navigate("/themes")}>Cancel</Button>
    </Space>
  </Form.Item>
</Form>
```

**Step 2: Delete StandardVariablesForm**

Remove `packages/admin/src/components/dashboard/StandardVariablesForm.tsx` — it is only imported in ThemeEditor.

**Step 3: Verify build**

Run: `cd packages/admin && npx tsc --noEmit`
Expected: No type errors.

**Step 4: Commit**

```bash
git add packages/admin/src/pages/ThemeEditor.tsx
git rm packages/admin/src/components/dashboard/StandardVariablesForm.tsx
git commit -m "feat: refactor ThemeEditor to 3-column layout, inline standard variables"
```

---

## Task 2: Refactor PopupTrigger to 3-Column Layout with Asset Picker

**Files:**
- Modify: `packages/admin/src/pages/PopupTrigger.tsx`

**Step 1: Rewrite PopupTrigger with 3-column layout and asset picker**

Add imports:

```tsx
import { Radio, Row, Col } from "antd";
```

Add asset state and fetch:

```tsx
interface Asset {
  id: number;
  name: string;
  fileName: string;
  mimeType: string;
}

// Inside PopupTrigger component:
const [assets, setAssets] = useState<Asset[]>([]);
const [mediaSource, setMediaSource] = useState<"asset" | "url">("asset");

useEffect(() => {
  api.get<Asset[]>("/api/assets").then(setAssets);
}, []);
```

Compute filtered assets based on content type:

```tsx
const filteredAssets = assets.filter((a) =>
  contentType === "image"
    ? a.mimeType.startsWith("image/")
    : contentType === "video"
      ? a.mimeType.startsWith("video/")
      : false
);
```

Replace the form body:

```tsx
<Form
  form={form}
  layout="vertical"
  onFinish={onFinish}
  initialValues={{
    content: { type: "text" },
    timeout: 10,
    targetDashboardIds: [],
  }}
>
  {/* Row 1: Content Type / Timeout / Target Dashboards */}
  <Row gutter={16}>
    <Col span={8}>
      <Form.Item name={["content", "type"]} label="Content Type">
        <Select
          options={[
            { value: "text", label: "Text" },
            { value: "image", label: "Image" },
            { value: "video", label: "Video" },
          ]}
          onChange={() => {
            form.setFieldValue(["content", "mediaUrl"], undefined);
            form.setFieldValue(["content", "body"], undefined);
            setMediaSource("asset");
          }}
        />
      </Form.Item>
    </Col>
    <Col span={8}>
      <Form.Item name="timeout" label="Timeout (seconds)">
        <InputNumber min={1} style={{ width: "100%" }} />
      </Form.Item>
    </Col>
    <Col span={8}>
      <Form.Item
        name="targetDashboardIds"
        label="Target Dashboards"
        extra="Leave empty to broadcast to all dashboards"
      >
        <Select
          mode="multiple"
          placeholder="All dashboards"
          options={dashboards.map((d) => ({ value: d.id, label: d.name }))}
        />
      </Form.Item>
    </Col>
  </Row>

  {/* Row 2: Content body (full width) */}
  {contentType === "text" && (
    <Row gutter={16}>
      <Col span={24}>
        <Form.Item name={["content", "body"]} label="Body" rules={[{ required: true }]}>
          <Input.TextArea rows={4} />
        </Form.Item>
      </Col>
    </Row>
  )}

  {(contentType === "image" || contentType === "video") && (
    <Row gutter={16}>
      <Col span={24}>
        <div style={{ marginBottom: 8 }}>
          <Radio.Group value={mediaSource} onChange={(e) => {
            setMediaSource(e.target.value);
            form.setFieldValue(["content", "mediaUrl"], undefined);
          }}>
            <Radio.Button value="asset">Asset</Radio.Button>
            <Radio.Button value="url">External URL</Radio.Button>
          </Radio.Group>
        </div>
        {mediaSource === "asset" ? (
          <Form.Item name={["content", "mediaUrl"]} label="Select Asset" rules={[{ required: true }]}>
            <Select
              placeholder={`Select ${contentType} asset`}
              allowClear
              options={filteredAssets.map((a) => ({
                value: `/assets/${a.fileName}`,
                label: a.name,
              }))}
            />
          </Form.Item>
        ) : (
          <Form.Item
            name={["content", "mediaUrl"]}
            label="Media URL"
            rules={[{ required: true }]}
          >
            <Input placeholder="https://example.com/image.png" />
          </Form.Item>
        )}
      </Col>
    </Row>
  )}

  <Form.Item>
    <Button type="primary" htmlType="submit" loading={loading} icon={<SendOutlined />}>
      Send Popup
    </Button>
  </Form.Item>
</Form>
```

Keep the HA Integration Alert below the form unchanged.

**Step 2: Verify build**

Run: `cd packages/admin && npx tsc --noEmit`
Expected: No type errors.

**Step 3: Commit**

```bash
git add packages/admin/src/pages/PopupTrigger.tsx
git commit -m "feat: refactor PopupTrigger to 3-column layout with asset picker"
```

---

## Task 3: Visual Verification

**Step 1:** Run dev server: `pnpm dev` (or however the admin dev server starts)

**Step 2:** Check ThemeEditor (new + edit) — verify 3-column layout, all fields functional, background image picker works, custom variables add/remove works.

**Step 3:** Check PopupTrigger — verify 3-column layout, asset/URL toggle for image and video, text body still works, send functionality unchanged.

**Step 4: Final commit if any tweaks needed**

```bash
git add -A
git commit -m "fix: polish theme editor and popup trigger layouts"
```
