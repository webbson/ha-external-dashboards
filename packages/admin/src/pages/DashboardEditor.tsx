import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
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
  message,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { ComponentPickerModal } from "../components/dashboard/ComponentPickerModal.js";
import { ComponentConfigModal } from "../components/dashboard/ComponentConfigModal.js";
import { VisualLayoutGrid } from "../components/dashboard/VisualLayoutGrid.js";
import { api } from "../api.js";
import { StandardVariablesForm } from "../components/dashboard/StandardVariablesForm.js";
import type { StandardVariables } from "@ha-dashboards/shared";
import { STANDARD_VARIABLE_DEFAULTS } from "@ha-dashboards/shared";

interface Dashboard {
  id?: number;
  name: string;
  slug: string;
  accessMode: string;
  password?: string;
  headerName?: string;
  headerValue?: string;
  interactiveMode: boolean;
  globalStyles: Record<string, string>;
  standardVariables?: Partial<StandardVariables>;
  layoutSwitchMode: string;
  layoutRotateInterval: number;
  layouts?: DashboardLayout[];
}

interface DashboardLayout {
  id: number;
  layoutId: number;
  sortOrder: number;
  label: string | null;
}

interface Layout {
  id: number;
  name: string;
  structure?: {
    gridTemplate: string;
    regions: { id: string; label: string }[];
  };
}

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

interface Component {
  id: number;
  name: string;
  template: string;
  styles: string;
  parameterDefs: ParameterDef[];
  entitySelectorDefs: EntitySelectorDef[];
  isContainer: boolean;
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

interface VisibilityRule {
  entityId: string;
  attribute?: string;
  operator: string;
  value: string;
}

export function DashboardEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm<Dashboard>();
  const [loading, setLoading] = useState(false);
  const [allLayouts, setAllLayouts] = useState<Layout[]>([]);
  const [allComponents, setAllComponents] = useState<Component[]>([]);
  const [dashLayouts, setDashLayouts] = useState<DashboardLayout[]>([]);
  const [instances, setInstances] = useState<ComponentInstance[]>([]);
  const [globalStyleEntries, setGlobalStyleEntries] = useState<
    { key: string; value: string }[]
  >([]);
  const [standardVariables, setStandardVariables] = useState<Partial<StandardVariables>>({});
  const [pickerRegionId, setPickerRegionId] = useState<string | null>(null);
  const [configInstance, setConfigInstance] = useState<ComponentInstance | null>(
    null
  );
  const [activeDlIndex, setActiveDlIndex] = useState(0);
  const isNew = !id;

  const accessMode = Form.useWatch("accessMode", form);
  const interactiveMode = Form.useWatch("interactiveMode", form);

  const activeDl = dashLayouts[activeDlIndex] ?? null;
  const activeDlId = activeDl?.id ?? null;

  useEffect(() => {
    api.get<Layout[]>("/api/layouts").then(setAllLayouts);
    api.get<Component[]>("/api/components").then(setAllComponents);
  }, []);

  useEffect(() => {
    if (!isNew) {
      setLoading(true);
      api
        .get<Dashboard>(`/api/dashboards/${id}`)
        .then((data) => {
          form.setFieldsValue(data);
          setDashLayouts(data.layouts ?? []);
          const gs = data.globalStyles ?? {};
          setGlobalStyleEntries(
            Object.entries(gs).map(([key, value]) => ({ key, value }))
          );
          setStandardVariables(data.standardVariables ?? {});
        })
        .finally(() => setLoading(false));
    }
  }, [id, isNew, form]);

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

  const onFinish = async (values: Dashboard) => {
    setLoading(true);
    try {
      const globalStyles: Record<string, string> = {};
      for (const e of globalStyleEntries) {
        if (e.key) globalStyles[e.key] = e.value;
      }
      const payload = { ...values, globalStyles, standardVariables };

      if (isNew) {
        await api.post("/api/dashboards", payload);
        message.success("Dashboard created");
      } else {
        await api.put(`/api/dashboards/${id}`, payload);
        message.success("Dashboard updated");
      }
      navigate("/dashboards");
    } finally {
      setLoading(false);
    }
  };

  const saveLayouts = async () => {
    if (!id) return;
    const result = await api.put<DashboardLayout[]>(
      `/api/dashboards/${id}/layouts`,
      dashLayouts.map((l, i) => ({
        layoutId: l.layoutId,
        sortOrder: i,
        label: l.label,
      }))
    );
    setDashLayouts(result);
    message.success("Layouts saved");
  };

  const addLayout = () => {
    if (allLayouts.length === 0) return;
    setDashLayouts([
      ...dashLayouts,
      {
        id: 0,
        layoutId: allLayouts[0].id,
        sortOrder: dashLayouts.length,
        label: null,
      },
    ]);
  };

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
    const updated = instances.map((inst) => {
      if (inst.id === instanceId) {
        return { ...inst, regionId: newRegionId, sortOrder: newSortOrder };
      }
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

  return (
    <Card title={isNew ? "New Dashboard" : "Edit Dashboard"} loading={loading}>
      {accessMode === "public" && interactiveMode && (
        <Alert
          message="Warning: Public dashboard with interactive mode enabled."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Tabs
        items={[
          {
            key: "settings",
            label: "Settings",
            children: (
              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{
                  accessMode: "public",
                  interactiveMode: false,
                  globalStyles: {},
                  layoutSwitchMode: "tabs",
                  layoutRotateInterval: 30,
                }}
              >
                <Form.Item
                  name="name"
                  label="Name"
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name="slug"
                  label="Slug"
                  rules={[
                    { required: true },
                    {
                      pattern: /^[a-z0-9-]+$/,
                      message: "Lowercase, numbers, hyphens only",
                    },
                  ]}
                >
                  <Input />
                </Form.Item>
                <Form.Item name="accessMode" label="Access Mode">
                  <Select
                    options={[
                      { value: "public", label: "Public" },
                      { value: "password", label: "Password" },
                      { value: "header", label: "Header" },
                    ]}
                  />
                </Form.Item>
                {accessMode === "password" && (
                  <Form.Item name="password" label="Password">
                    <Input.Password />
                  </Form.Item>
                )}
                {accessMode === "header" && (
                  <>
                    <Form.Item name="headerName" label="Header Name">
                      <Input />
                    </Form.Item>
                    <Form.Item name="headerValue" label="Header Value">
                      <Input />
                    </Form.Item>
                  </>
                )}
                <Form.Item
                  name="interactiveMode"
                  label="Interactive Mode"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
                <Form.Item name="layoutSwitchMode" label="Layout Switch Mode">
                  <Select
                    options={[
                      { value: "tabs", label: "Tabs" },
                      { value: "auto-rotate", label: "Auto Rotate" },
                    ]}
                  />
                </Form.Item>
                <Form.Item
                  name="layoutRotateInterval"
                  label="Rotate Interval (s)"
                >
                  <InputNumber min={5} />
                </Form.Item>
                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                    >
                      {isNew ? "Create" : "Save"}
                    </Button>
                    <Button onClick={() => navigate("/dashboards")}>
                      Cancel
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            ),
          },
          ...(!isNew
            ? [
                {
                  key: "layouts",
                  label: "Layouts",
                  children: (
                    <div>
                      {dashLayouts.map((dl, i) => (
                        <Space
                          key={i}
                          style={{ display: "flex", marginBottom: 8 }}
                        >
                          <Select
                            style={{ width: 200 }}
                            value={dl.layoutId}
                            onChange={(v) => {
                              const next = [...dashLayouts];
                              next[i] = { ...next[i], layoutId: v };
                              setDashLayouts(next);
                            }}
                            options={allLayouts.map((l) => ({
                              value: l.id,
                              label: l.name,
                            }))}
                          />
                          <Input
                            placeholder="Tab label"
                            value={dl.label ?? ""}
                            onChange={(e) => {
                              const next = [...dashLayouts];
                              next[i] = {
                                ...next[i],
                                label: e.target.value || null,
                              };
                              setDashLayouts(next);
                            }}
                            style={{ width: 150 }}
                          />
                          <Button
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() =>
                              setDashLayouts(
                                dashLayouts.filter((_, j) => j !== i)
                              )
                            }
                          />
                        </Space>
                      ))}
                      <Space>
                        <Button icon={<PlusOutlined />} onClick={addLayout}>
                          Add Layout
                        </Button>
                        <Button type="primary" onClick={saveLayouts}>
                          Save Layouts
                        </Button>
                      </Space>
                    </div>
                  ),
                },
                {
                  key: "components",
                  label: "Components",
                  children: (
                    <div>
                      {dashLayouts.length === 0 ? (
                        <div
                          style={{
                            color: "#999",
                            padding: 24,
                            textAlign: "center",
                          }}
                        >
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
                                  dl.label || layout?.name || `Layout ${i + 1}`,
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
                        regionLabel={(() => {
                          const layout = allLayouts.find(
                            (l) => l.id === activeDl?.layoutId
                          );
                          const region = layout?.structure?.regions?.find(
                            (r) => r.id === configInstance?.regionId
                          );
                          return region?.label || region?.id || "";
                        })()}
                        globalStyles={{
                          ...Object.fromEntries(
                            Object.entries({ ...STANDARD_VARIABLE_DEFAULTS, ...standardVariables })
                              .filter(([k]) => k !== "backgroundType" && k !== "backgroundImage")
                          ),
                          ...(form.getFieldValue("globalStyles") ?? {}),
                          ...Object.fromEntries(
                            globalStyleEntries.filter((e) => e.key).map((e) => [e.key, e.value])
                          ),
                        }}
                        onSave={handleConfigSave}
                        onDelete={handleConfigDelete}
                        onCancel={() => setConfigInstance(null)}
                      />
                    </div>
                  ),
                },
                {
                  key: "styles",
                  label: "Global Styles",
                  children: (
                    <div>
                      <StandardVariablesForm
                        value={standardVariables}
                        onChange={setStandardVariables}
                      />

                      <div style={{ marginTop: 24, borderTop: "1px solid #303030", paddingTop: 16 }}>
                        <div style={{ fontWeight: 500, marginBottom: 12 }}>Custom Variables</div>
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
                              style={{ width: 200 }}
                            />
                            <Input
                              placeholder="Value"
                              value={entry.value}
                              onChange={(e) => {
                                const next = [...globalStyleEntries];
                                next[i] = { ...next[i], value: e.target.value };
                                setGlobalStyleEntries(next);
                              }}
                              style={{ width: 200 }}
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
                          Add Style Variable
                        </Button>
                      </div>
                    </div>
                  ),
                },
              ]
            : []),
        ]}
      />
    </Card>
  );
}
