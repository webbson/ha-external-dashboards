import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Form,
  Input,
  Button,
  Card,
  Space,
  Row,
  Col,
  ColorPicker,
  Radio,
  Select,
  Tooltip,
  message,
} from "antd";
import { PlusOutlined, DeleteOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { api, apiUrl } from "../api.js";
import type { StandardVariables } from "@ha-external-dashboards/shared";
import { STANDARD_VARIABLE_DEFAULTS } from "@ha-external-dashboards/shared";

interface Theme {
  id?: number;
  name: string;
  standardVariables: Partial<StandardVariables>;
  globalStyles: Record<string, string>;
}

interface Asset {
  id: number;
  name: string;
  fileName: string;
  mimeType: string;
}

export function ThemeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm<{ name: string }>();
  const [loading, setLoading] = useState(false);
  const [standardVariables, setStandardVariables] = useState<
    Partial<StandardVariables>
  >({});
  const [globalStyleEntries, setGlobalStyleEntries] = useState<
    { key: string; value: string }[]
  >([]);
  const [imageAssets, setImageAssets] = useState<Asset[]>([]);
  const isNew = !id;

  const merged = { ...STANDARD_VARIABLE_DEFAULTS, ...standardVariables };

  const update = (key: keyof StandardVariables, val: string) => {
    setStandardVariables({ ...standardVariables, [key]: val });
  };

  useEffect(() => {
    api.get<Asset[]>("/api/assets").then((assets) => {
      setImageAssets(assets.filter((a) => a.mimeType.startsWith("image/")));
    });
  }, []);

  useEffect(() => {
    if (!isNew) {
      setLoading(true);
      api
        .get<Theme>(`/api/themes/${id}`)
        .then((data) => {
          form.setFieldsValue({ name: data.name });
          setStandardVariables(data.standardVariables ?? {});
          const gs = data.globalStyles ?? {};
          setGlobalStyleEntries(
            Object.entries(gs).map(([key, value]) => ({ key, value }))
          );
        })
        .finally(() => setLoading(false));
    }
  }, [id, isNew, form]);

  const onFinish = async (values: { name: string }) => {
    setLoading(true);
    try {
      const globalStyles: Record<string, string> = {};
      for (const e of globalStyleEntries) {
        if (e.key) globalStyles[e.key] = e.value;
      }
      const payload = {
        name: values.name,
        standardVariables,
        globalStyles,
      };

      if (isNew) {
        await api.post("/api/themes", payload);
        message.success("Theme created");
      } else {
        await api.put(`/api/themes/${id}`, payload);
        message.success("Theme updated");
      }
      navigate("/themes");
    } finally {
      setLoading(false);
    }
  };

  const fieldLabel = (label: string, tooltip?: string) => (
    <div style={{ fontSize: 12, color: "#999", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
      {label}
      {tooltip && (
        <Tooltip title={tooltip}>
          <InfoCircleOutlined style={{ fontSize: 11, color: "#bbb", cursor: "help" }} />
        </Tooltip>
      )}
    </div>
  );

  const sectionHeader = (label: string, tooltip?: string) => (
    <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8, marginTop: 16, display: "flex", alignItems: "center", gap: 6 }}>
      {label}
      {tooltip && (
        <Tooltip title={tooltip}>
          <InfoCircleOutlined style={{ fontSize: 12, color: "#bbb", cursor: "help" }} />
        </Tooltip>
      )}
    </div>
  );

  const colorField = (label: string, key: keyof StandardVariables, tooltip?: string) => (
    <div style={{ marginBottom: 12 }}>
      {fieldLabel(label, tooltip)}
      <ColorPicker
        value={merged[key]}
        onChange={(_, hex) => update(key, hex)}
        showText
      />
    </div>
  );

  const textField = (
    label: string,
    key: keyof StandardVariables,
    placeholder?: string,
    tooltip?: string
  ) => (
    <div style={{ marginBottom: 12 }}>
      {fieldLabel(label, tooltip)}
      <Input
        value={merged[key]}
        onChange={(e) => update(key, e.target.value)}
        placeholder={placeholder ?? STANDARD_VARIABLE_DEFAULTS[key]}
      />
    </div>
  );

  return (
    <Card title={isNew ? "New Theme" : "Edit Theme"} loading={loading}>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Row gutter={16}>
          {/* Column 1: Name + Colors + Background */}
          <Col span={8}>
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>

            {sectionHeader("Colors", "Global color palette used by components via CSS variables")}
            {colorField("Component Background", "componentBg", "Background fill for component chrome wrappers. Use in CSS as var(--db-component-bg)")}
            {colorField("Primary Font Color", "fontColor", "Main text color for component content. Use in CSS as var(--db-font-color)")}
            {colorField("Secondary Font Color", "fontColorSecondary", "Muted text for labels, captions, metadata. Use in CSS as var(--db-font-color-secondary)")}
            {colorField("Accent Color", "accentColor", "Highlights, active states, links, progress bars. Use in CSS as var(--db-accent-color)")}

            {sectionHeader("Background", "Full-page background behind all layouts and components")}
            <Radio.Group
              value={merged.backgroundType}
              onChange={(e) => update("backgroundType", e.target.value)}
              style={{ marginBottom: 12 }}
            >
              <Radio value="color">Color</Radio>
              <Radio value="image">Image</Radio>
            </Radio.Group>

            {merged.backgroundType === "color" ? (
              <div style={{ marginBottom: 16 }}>
                <ColorPicker
                  value={merged.backgroundColor}
                  onChange={(_, hex) => update("backgroundColor", hex)}
                  showText
                />
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <Select
                  value={merged.backgroundImage || undefined}
                  onChange={(v) => update("backgroundImage", v)}
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
                      src={apiUrl(`/api/assets/${imageAssets.find((a) => a.fileName === merged.backgroundImage)?.id}/file`)}
                      alt="Background preview"
                      style={{
                        maxWidth: 200,
                        maxHeight: 120,
                        borderRadius: 4,
                        border: "1px solid #333",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </Col>

          {/* Column 2: Typography + Component Chrome + Layout */}
          <Col span={8}>
            {sectionHeader("Typography", "Font settings inherited by all components")}
            {textField("Font Family", "fontFamily", "inherit", "CSS font-family value. Use in CSS as var(--db-font-family)")}
            {textField("Font Size", "fontSize", "16px", "Base font size for component content. Use in CSS as var(--db-font-size)")}

            {sectionHeader("Component Chrome", "Outer wrapper styling applied around each component or region")}
            {textField("Border Style", "borderStyle", "none", "CSS border shorthand, e.g. '1px solid #333'. Use in CSS as var(--db-border-style)")}
            {textField("Border Radius", "borderRadius", "0px", "Corner rounding for component chrome. Use in CSS as var(--db-border-radius)")}
            {textField("Component Padding", "componentPadding", "0px", "Inner padding of component chrome wrappers. Use in CSS as var(--db-component-padding)")}

            {sectionHeader("Layout", "Spacing between components in layout regions")}
            {textField("Component Gap", "componentGap", "0px", "Gap between components within a region. Use in CSS as var(--db-component-gap)")}

            {sectionHeader("Custom Variables", "Define your own CSS variables for use in component templates. Access in Handlebars via {{globalStyles.myVar}} or in CSS as var(--myVar)")}
            {globalStyleEntries.map((entry, i) => (
              <Space
                key={i}
                style={{ display: "flex", marginBottom: 8 }}
              >
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
                  onClick={() =>
                    setGlobalStyleEntries(
                      globalStyleEntries.filter((_, j) => j !== i)
                    )
                  }
                />
              </Space>
            ))}
            <Button
              icon={<PlusOutlined />}
              onClick={() =>
                setGlobalStyleEntries([
                  ...globalStyleEntries,
                  { key: "", value: "" },
                ])
              }
            >
              Add Variable
            </Button>
          </Col>

          {/* Column 3: Tab Bar */}
          <Col span={8}>
            {sectionHeader("Tab Bar", "Styling for the dashboard layout tab bar. Only visible when a dashboard has multiple layouts in tab mode")}
            {colorField("Background", "tabBarBg", "Background color of the entire tab bar container. Use in CSS as var(--db-tab-bar-bg)")}
            {colorField("Inactive Color", "tabBarColor", "Text and icon color for non-selected tabs. Use in CSS as var(--db-tab-bar-color)")}
            {colorField("Active Color", "tabBarActiveColor", "Text and icon color for the selected tab. Use in CSS as var(--db-tab-bar-active-color)")}
            {colorField("Active Background", "tabBarActiveBg", "Pill background color for the selected tab. Use in CSS as var(--db-tab-bar-active-bg)")}
            {textField("Font Size", "tabBarFontSize", "14px", "Font and icon size for tab labels. Use in CSS as var(--db-tab-bar-font-size)")}
          </Col>
        </Row>

        <Form.Item style={{ marginTop: 24 }}>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isNew ? "Create" : "Save"}
            </Button>
            <Button onClick={() => navigate("/themes")}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
