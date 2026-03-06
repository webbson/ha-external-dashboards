import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Form, Input, InputNumber, Button, Card, Space, Select, Switch, Collapse, message } from "antd";
import { HybridEditor } from "../components/editors/HybridEditor.js";
import { LivePreview } from "../components/preview/LivePreview.js";
import { EntityDataViewer } from "../components/preview/EntityDataViewer.js";
import { EntitySelector } from "../components/selectors/EntitySelector.js";
import { MdiIconSelector } from "../components/selectors/MdiIconSelector.js";
import { api } from "../api.js";

const DEFAULT_TEMPLATE = `<div class="component">
  {{!-- your content here --}}
</div>`;

const DEFAULT_STYLES = `:host {
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
}`;

interface ParameterDef {
  name: string;
  label: string;
  type: "string" | "number" | "boolean" | "color" | "select" | "icon";
  default?: string | number | boolean;
  options?: { label: string; value: string }[];
}

interface EntitySelectorDef {
  name: string;
  label: string;
  mode: "single" | "multiple" | "glob" | "area" | "tag";
  allowedDomains?: string[];
}

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

interface ThemeSummary {
  id: number;
  name: string;
  globalStyles: Record<string, string>;
  standardVariables: Record<string, string>;
}

export function ComponentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState(isNew ? DEFAULT_TEMPLATE : "");
  const [styles, setStyles] = useState(isNew ? DEFAULT_STYLES : "");
  const [parameterDefs, setParameterDefs] = useState<ParameterDef[]>([]);
  const [entitySelectorDefs, setEntitySelectorDefs] = useState<EntitySelectorDef[]>([]);
  const [testEntityBindings, setTestEntityBindings] = useState<Record<string, string | string[]>>({});
  const [testParameterValues, setTestParameterValues] = useState<Record<string, string | number | boolean>>({});
  const [themes, setThemes] = useState<ThemeSummary[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);

  useEffect(() => {
    api.get<ThemeSummary[]>("/api/themes").then((list) => {
      setThemes(list);
      if (list.length > 0) setSelectedThemeId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!isNew) {
      setLoading(true);
      api
        .get<ComponentData>(`/api/components/${id}`)
        .then((data) => {
          form.setFieldsValue(data);
          setTemplate(data.template);
          setStyles(data.styles);
          setParameterDefs(data.parameterDefs ?? []);
          setEntitySelectorDefs(data.entitySelectorDefs ?? []);
          setTestEntityBindings(data.testEntityBindings ?? {});
        })
        .finally(() => setLoading(false));
    }
  }, [id, isNew, form]);

  const activeTheme = themes.find((t) => t.id === selectedThemeId);

  const onFinish = async (values: Record<string, unknown>) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        template,
        styles,
        parameterDefs,
        entitySelectorDefs,
        testEntityBindings,
      };
      if (isNew) {
        await api.post("/api/components", payload);
        message.success("Component created");
      } else {
        await api.put(`/api/components/${id}`, payload);
        message.success("Component updated");
      }
      navigate("/components");
    } finally {
      setLoading(false);
    }
  };

  const previewSettingsItems = [];

  if (entitySelectorDefs.length > 0) {
    previewSettingsItems.push({
      key: "entities",
      label: "Test Entities & Data",
      children: (
        <div>
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
          <EntityDataViewer entityBindings={testEntityBindings} compact />
        </div>
      ),
    });
  }

  if (parameterDefs.length > 0) {
    previewSettingsItems.push({
      key: "parameters",
      label: "Test Parameter Values",
      children: (
        <div>
          {parameterDefs.map((def) => (
            <div key={def.name} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>
                {def.label || def.name}
              </div>
              {def.type === "boolean" ? (
                <Switch
                  checked={!!testParameterValues[def.name]}
                  onChange={(v) =>
                    setTestParameterValues((prev) => ({ ...prev, [def.name]: v }))
                  }
                />
              ) : def.type === "number" ? (
                <InputNumber
                  value={testParameterValues[def.name] as number}
                  onChange={(v) =>
                    setTestParameterValues((prev) => ({ ...prev, [def.name]: v ?? 0 }))
                  }
                />
              ) : def.type === "select" ? (
                <Select
                  value={testParameterValues[def.name] as string}
                  onChange={(v) =>
                    setTestParameterValues((prev) => ({ ...prev, [def.name]: v }))
                  }
                  options={def.options ?? []}
                  style={{ width: "100%" }}
                  allowClear
                  placeholder={def.default != null ? String(def.default) : undefined}
                />
              ) : def.type === "color" ? (
                <Input
                  type="color"
                  value={(testParameterValues[def.name] as string) ?? (def.default as string) ?? "#ffffff"}
                  onChange={(e) =>
                    setTestParameterValues((prev) => ({ ...prev, [def.name]: e.target.value }))
                  }
                  style={{ width: 60 }}
                />
              ) : def.type === "icon" ? (
                <MdiIconSelector
                  value={(testParameterValues[def.name] as string) || null}
                  onChange={(v) =>
                    setTestParameterValues((prev) => ({ ...prev, [def.name]: v ?? "" }))
                  }
                />
              ) : (
                <Input
                  value={(testParameterValues[def.name] as string) ?? ""}
                  onChange={(e) =>
                    setTestParameterValues((prev) => ({ ...prev, [def.name]: e.target.value }))
                  }
                  placeholder={def.default != null ? String(def.default) : undefined}
                />
              )}
            </div>
          ))}
        </div>
      ),
    });
  }

  if (themes.length > 0) {
    previewSettingsItems.push({
      key: "theme",
      label: "Theme",
      children: (
        <Select
          value={selectedThemeId}
          onChange={setSelectedThemeId}
          options={themes.map((t) => ({ value: t.id, label: t.name }))}
          style={{ width: "100%" }}
          placeholder="Preview with theme"
        />
      ),
    });
  }

  return (
    <Card loading={loading} styles={{ body: { padding: 0 } }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <Form form={form} layout="inline" onFinish={onFinish} style={{ flex: 1 }}>
          <Form.Item name="name" rules={[{ required: true }]} style={{ flex: 1, marginRight: 0 }}>
            <Input placeholder="Component name" />
          </Form.Item>
        </Form>
        <Space>
          <Button type="primary" loading={loading} onClick={() => form.submit()}>
            {isNew ? "Create" : "Save"}
          </Button>
          <Button onClick={() => navigate("/components")}>Cancel</Button>
        </Space>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 160px)" }}>
        {/* Left column: Editor */}
        <div style={{ flex: 1, minWidth: 0, padding: 16, overflow: "auto" }}>
          <HybridEditor
            template={template}
            onTemplateChange={setTemplate}
            styles={styles}
            onStylesChange={setStyles}
            parameterDefs={parameterDefs}
            onParameterDefsChange={setParameterDefs}
            entitySelectorDefs={entitySelectorDefs}
            onEntitySelectorDefsChange={setEntitySelectorDefs}
          />
        </div>

        {/* Right column: Preview Settings + Live Preview */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            borderLeft: "1px solid rgba(255,255,255,0.08)",
            position: "sticky",
            top: 0,
            height: "calc(100vh - 160px)",
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {previewSettingsItems.length > 0 && (
            <div style={{ padding: "12px 16px 0" }}>
              <Collapse size="small" items={previewSettingsItems} />
            </div>
          )}

          <div style={{ flex: 1, padding: 16, minHeight: 300 }}>
            <LivePreview
              template={template}
              styles={styles}
              entityBindings={testEntityBindings}
              parameterValues={testParameterValues}
              globalStyles={activeTheme?.globalStyles ?? {}}
              standardVariables={activeTheme?.standardVariables ?? {}}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
