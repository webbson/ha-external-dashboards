import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Form, Input, Button, Card, Space, Switch, Select, InputNumber, message } from "antd";
import { HybridEditor } from "../components/editors/HybridEditor.js";
import { LivePreview } from "../components/preview/LivePreview.js";
import { EntityDataViewer } from "../components/preview/EntityDataViewer.js";
import { EntitySelector } from "../components/selectors/EntitySelector.js";
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

interface DashboardSummary {
  id: number;
  name: string;
  globalStyles: Record<string, string>;
  standardVariables?: Record<string, string>;
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
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
  const [selectedDashboardId, setSelectedDashboardId] = useState<number | null>(null);

  useEffect(() => {
    api.get<DashboardSummary[]>("/api/dashboards").then((list) => {
      setDashboards(list);
      if (list.length > 0) setSelectedDashboardId(list[0].id);
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

  const isContainer = Form.useWatch("isContainer", form);
  const activeDashboard = dashboards.find((d) => d.id === selectedDashboardId);

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

  return (
    <Card title={isNew ? "New Component" : "Edit Component"} loading={loading}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          isContainer: false,
          containerConfig: null,
        }}
      >
        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="isContainer"
          label="Container Component"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        {isContainer && (
          <Space>
            <Form.Item name={["containerConfig", "type"]} label="Container Type">
              <Select
                style={{ width: 150 }}
                options={[
                  { value: "tabs", label: "Tabs" },
                  { value: "auto-rotate", label: "Auto Rotate" },
                  { value: "stack", label: "Stack" },
                ]}
              />
            </Form.Item>
            <Form.Item
              name={["containerConfig", "rotateInterval"]}
              label="Rotate Interval (s)"
            >
              <InputNumber min={1} />
            </Form.Item>
          </Space>
        )}
      </Form>

      <div style={{ marginTop: 16 }}>
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

      <EntityDataViewer entityBindings={testEntityBindings} />

      {dashboards.length > 0 && (
        <Select
          value={selectedDashboardId}
          onChange={setSelectedDashboardId}
          options={dashboards.map((d) => ({ value: d.id, label: d.name }))}
          style={{ width: 200, marginBottom: 8 }}
          placeholder="Preview with dashboard styles"
          size="small"
        />
      )}
      <LivePreview
        template={template}
        styles={styles}
        entityBindings={testEntityBindings}
        parameterValues={{}}
        globalStyles={activeDashboard?.globalStyles ?? {}}
        standardVariables={activeDashboard?.standardVariables ?? {}}
      />

      <Space style={{ marginTop: 16 }}>
        <Button type="primary" loading={loading} onClick={() => form.submit()}>
          {isNew ? "Create" : "Save"}
        </Button>
        <Button onClick={() => navigate("/components")}>Cancel</Button>
      </Space>
    </Card>
  );
}
