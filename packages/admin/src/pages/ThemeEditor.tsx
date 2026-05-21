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
  AutoComplete,
  Modal,
  Tag,
  Divider,
} from "antd";
import { PlusOutlined, DeleteOutlined, InfoCircleOutlined, FontColorsOutlined } from "@ant-design/icons";
import { api, apiUrl } from "../api.js";
import type { StandardVariables } from "@ha-external-dashboards/shared";
import { STANDARD_VARIABLE_DEFAULTS } from "@ha-external-dashboards/shared";

type FontSource =
  | { type: "asset"; assetId: number; fileName: string }
  | { type: "url"; url: string }
  | { type: "stylesheet"; url: string };

interface FontDeclaration {
  id: string;
  name: string;
  sources: FontSource[];
}

interface Theme {
  id?: number;
  name: string;
  standardVariables: Partial<StandardVariables>;
  globalStyles: Record<string, string>;
  fontDeclarations: FontDeclaration[];
}

interface Asset {
  id: number;
  name: string;
  fileName: string;
  mimeType: string;
}

const FONT_MIME_TYPES = [
  "font/woff2",
  "font/woff",
  "font/ttf",
  "font/otf",
  "application/x-font-ttf",
  "application/x-font-otf",
  "application/font-woff",
  "application/font-woff2",
];

const FONT_EXTENSIONS = [".woff2", ".woff", ".ttf", ".otf"];

function isFontAsset(asset: Asset): boolean {
  if (FONT_MIME_TYPES.includes(asset.mimeType) || asset.mimeType.startsWith("font/")) return true;
  const ext = asset.name.toLowerCase().slice(asset.name.lastIndexOf("."));
  return FONT_EXTENSIONS.includes(ext);
}

function fontSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "font"
  );
}

interface FontDeclModalProps {
  open: boolean;
  decl: FontDeclaration | null;
  fontAssets: Asset[];
  onSave: (decl: FontDeclaration) => void;
  onClose: () => void;
}

function FontDeclModal({ open, decl, fontAssets, onSave, onClose }: FontDeclModalProps) {
  const [name, setName] = useState(decl?.name ?? "");
  const [sources, setSources] = useState<FontSource[]>(decl?.sources ?? []);

  useEffect(() => {
    setName(decl?.name ?? "");
    setSources(decl?.sources ?? []);
  }, [decl]);

  const slug = fontSlug(name);
  const cssVar = `--db-font-${slug}`;

  const addSource = (type: FontSource["type"]) => {
    if (type === "asset") {
      setSources((prev) => [...prev, { type: "asset", assetId: 0, fileName: "" }]);
    } else if (type === "url") {
      setSources((prev) => [...prev, { type: "url", url: "" }]);
    } else {
      setSources((prev) => [...prev, { type: "stylesheet", url: "" }]);
    }
  };

  const updateSource = (i: number, patch: Partial<FontSource>) => {
    setSources((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch } as FontSource;
      return next;
    });
  };

  const removeSource = (i: number) => {
    setSources((prev) => prev.filter((_, j) => j !== i));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: decl?.id ?? crypto.randomUUID(),
      name: name.trim(),
      sources,
    });
  };

  return (
    <Modal
      open={open}
      title={decl ? "Edit Font" : "Add Font"}
      onCancel={onClose}
      onOk={handleSave}
      okText="Save"
      width={540}
      destroyOnHidden
    >
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>Font Name</div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Brand Sans"
        />
        {name && (
          <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
            CSS var: <code>{cssVar}</code>
          </div>
        )}
      </div>

      <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>Sources</div>
      {sources.map((src, i) => (
        <Space key={i} style={{ display: "flex", marginBottom: 8, alignItems: "flex-start" }}>
          <Tag
            color={src.type === "asset" ? "blue" : src.type === "stylesheet" ? "green" : "orange"}
            style={{ marginTop: 4, minWidth: 72, textAlign: "center" }}
          >
            {src.type}
          </Tag>
          {src.type === "asset" && (
            <Select
              value={(src as Extract<FontSource, { type: "asset" }>).fileName || undefined}
              onChange={(fileName) => {
                const asset = fontAssets.find((a) => a.fileName === fileName);
                if (asset) updateSource(i, { type: "asset", assetId: asset.id, fileName: asset.fileName });
              }}
              placeholder="Select font file"
              style={{ width: 300 }}
              options={fontAssets.map((a) => ({ value: a.fileName, label: a.name }))}
            />
          )}
          {(src.type === "url" || src.type === "stylesheet") && (
            <Input
              value={(src as Extract<FontSource, { type: "url" | "stylesheet" }>).url}
              onChange={(e) => updateSource(i, { url: e.target.value } as Partial<FontSource>)}
              placeholder={
                src.type === "stylesheet"
                  ? "https://fonts.googleapis.com/css2?family=..."
                  : "https://cdn.example.com/font.woff2"
              }
              style={{ width: 300 }}
            />
          )}
          <Button danger icon={<DeleteOutlined />} size="small" onClick={() => removeSource(i)} />
        </Space>
      ))}

      <Space style={{ marginTop: 8 }}>
        <Button size="small" icon={<PlusOutlined />} onClick={() => addSource("asset")}>
          Uploaded file
        </Button>
        <Button size="small" icon={<PlusOutlined />} onClick={() => addSource("url")}>
          File URL
        </Button>
        <Button size="small" icon={<PlusOutlined />} onClick={() => addSource("stylesheet")}>
          Stylesheet URL
        </Button>
      </Space>
    </Modal>
  );
}

export function ThemeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm<{ name: string }>();
  const [loading, setLoading] = useState(false);
  const [standardVariables, setStandardVariables] = useState<Partial<StandardVariables>>({});
  const [globalStyleEntries, setGlobalStyleEntries] = useState<{ key: string; value: string }[]>([]);
  const [imageAssets, setImageAssets] = useState<Asset[]>([]);
  const [fontDeclarations, setFontDeclarations] = useState<FontDeclaration[]>([]);
  const [fontAssets, setFontAssets] = useState<Asset[]>([]);
  const [fontModalOpen, setFontModalOpen] = useState(false);
  const [editingDecl, setEditingDecl] = useState<FontDeclaration | null>(null);
  const isNew = !id;

  const merged = { ...STANDARD_VARIABLE_DEFAULTS, ...standardVariables };

  const update = (key: keyof StandardVariables, val: string) => {
    setStandardVariables({ ...standardVariables, [key]: val });
  };

  useEffect(() => {
    api.get<Asset[]>("/api/assets").then((assets) => {
      setImageAssets(assets.filter((a) => a.mimeType.startsWith("image/")));
      setFontAssets(assets.filter((a) => isFontAsset(a)));
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
          setFontDeclarations(data.fontDeclarations ?? []);
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
        fontDeclarations,
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
            <div style={{ marginBottom: 12 }}>
              {fieldLabel("Font Family", "CSS font-family value. Declared fonts appear as options. Use in CSS as var(--db-font-family)")}
              <AutoComplete
                value={merged.fontFamily}
                onChange={(v) => update("fontFamily", v)}
                placeholder={STANDARD_VARIABLE_DEFAULTS.fontFamily}
                style={{ width: "100%" }}
                options={fontDeclarations.map((d) => ({ value: d.name, label: d.name }))}
              />
            </div>
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

        <Divider />

        {sectionHeader("Fonts", "Declare named font families from uploaded files, CDN URLs, or Google Fonts stylesheets. Each gets a --db-font-{name} CSS variable.")}

        {fontDeclarations.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {fontDeclarations.map((decl) => {
              const slug = fontSlug(decl.name);
              return (
                <Space key={decl.id} style={{ display: "flex", marginBottom: 8, alignItems: "center" }}>
                  <span style={{ fontWeight: 500, minWidth: 120 }}>{decl.name}</span>
                  <code style={{ fontSize: 11, color: "#888" }}>--db-font-{slug}</code>
                  <Space size={4}>
                    {Array.from(new Set(decl.sources.map((s) => s.type))).map((t) => (
                      <Tag key={t} color={t === "asset" ? "blue" : t === "stylesheet" ? "green" : "orange"}>
                        {t}
                      </Tag>
                    ))}
                  </Space>
                  <Button
                    size="small"
                    onClick={() => {
                      setEditingDecl(decl);
                      setFontModalOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      setFontDeclarations(fontDeclarations.filter((d) => d.id !== decl.id))
                    }
                  />
                </Space>
              );
            })}
          </div>
        )}

        <Button
          icon={<FontColorsOutlined />}
          onClick={() => {
            setEditingDecl(null);
            setFontModalOpen(true);
          }}
        >
          Add Font
        </Button>

        <FontDeclModal
          open={fontModalOpen}
          decl={editingDecl}
          fontAssets={fontAssets}
          onSave={(saved) => {
            setFontDeclarations((prev) => {
              const idx = prev.findIndex((d) => d.id === saved.id);
              return idx >= 0
                ? prev.map((d) => (d.id === saved.id ? saved : d))
                : [...prev, saved];
            });
            setFontModalOpen(false);
          }}
          onClose={() => setFontModalOpen(false)}
        />

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
