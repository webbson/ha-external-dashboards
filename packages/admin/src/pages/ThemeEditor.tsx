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
  message,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { api } from "../api.js";
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

  const colorField = (label: string, key: keyof StandardVariables) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>
        {label}
      </div>
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
    placeholder?: string
  ) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>
        {label}
      </div>
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
          {/* Column 1: Name + Colors */}
          <Col span={8}>
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>

            <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>
              Colors
            </div>
            {colorField("Component Background", "componentBg")}
            {colorField("Primary Font Color", "fontColor")}
            {colorField("Secondary Font Color", "fontColorSecondary")}
            {colorField("Accent Color", "accentColor")}
          </Col>

          {/* Column 2: Typography + Component Chrome + Layout */}
          <Col span={8}>
            <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>
              Typography
            </div>
            {textField("Font Family", "fontFamily", "inherit")}
            {textField("Font Size", "fontSize", "16px")}

            <div
              style={{
                fontWeight: 500,
                fontSize: 13,
                marginBottom: 8,
                marginTop: 16,
              }}
            >
              Component Chrome
            </div>
            {textField("Border Style", "borderStyle", "none")}
            {textField("Border Radius", "borderRadius", "0px")}
            {textField("Component Padding", "componentPadding", "0px")}

            <div
              style={{
                fontWeight: 500,
                fontSize: 13,
                marginBottom: 8,
                marginTop: 16,
              }}
            >
              Layout
            </div>
            {textField("Component Gap", "componentGap", "0px")}

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
          </Col>

          {/* Column 3: Background + Custom Variables */}
          <Col span={8}>
            <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>
              Background
            </div>
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
                      src={`/api/assets/${imageAssets.find((a) => a.fileName === merged.backgroundImage)?.id}/file`}
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

            <div
              style={{
                fontWeight: 500,
                fontSize: 13,
                marginBottom: 8,
                marginTop: 16,
              }}
            >
              Custom Variables
            </div>
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
