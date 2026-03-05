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
import { STANDARD_VARIABLE_DEFAULTS } from "@ha-external-dashboards/shared";

interface Dashboard {
  id?: number;
  name: string;
  slug: string;
  accessMode: string;
  password?: string;
  headerName?: string;
  headerValue?: string;
  interactiveMode: boolean;
  maxWidth?: string | null;
  padding?: string | null;
  themeId?: number | null;
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
    regions: { id: string }[];
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
  containerConfig?: { type: string; rotateInterval?: number } | null;
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
  parentInstanceId: number | null;
  tabLabel: string | null;
  tabIcon: string | null;
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
  const [allThemes, setAllThemes] = useState<{ id: number; name: string }[]>([]);
  const [dashLayouts, setDashLayouts] = useState<DashboardLayout[]>([]);
  const [instances, setInstances] = useState<ComponentInstance[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<{ standardVariables: Record<string, string>; globalStyles: Record<string, string> } | null>(null);
  const [pickerRegionId, setPickerRegionId] = useState<string | null>(null);
  const [pickerContainerInstanceId, setPickerContainerInstanceId] = useState<number | null>(null);
  const [configInstance, setConfigInstance] = useState<ComponentInstance | null>(
    null
  );
  const [activeDlIndex, setActiveDlIndex] = useState(0);
  const isNew = !id;

  const accessMode = Form.useWatch("accessMode", form);
  const interactiveMode = Form.useWatch("interactiveMode", form);
  const themeId = Form.useWatch("themeId", form);

  const activeDl = dashLayouts[activeDlIndex] ?? null;
  const activeDlId = activeDl?.id ?? null;

  useEffect(() => {
    api.get<Layout[]>("/api/layouts").then(setAllLayouts);
    api.get<Component[]>("/api/components").then(setAllComponents);
    api.get<{ id: number; name: string }[]>("/api/themes").then(setAllThemes);
  }, []);

  useEffect(() => {
    if (!isNew) {
      setLoading(true);
      api
        .get<Dashboard>(`/api/dashboards/${id}`)
        .then((data) => {
          form.setFieldsValue(data);
          setDashLayouts(data.layouts ?? []);
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

  useEffect(() => {
    if (themeId) {
      api.get<{ standardVariables: Record<string, string>; globalStyles: Record<string, string> }>(`/api/themes/${themeId}`).then(setSelectedTheme);
    } else {
      setSelectedTheme(null);
    }
  }, [themeId]);

  const saveLayouts = async () => {
    if (!id) return;
    const result = await api.put<DashboardLayout[]>(
      `/api/dashboards/${id}/layouts`,
      dashLayouts.map((l, i) => ({
        id: l.id > 0 ? l.id : undefined,
        layoutId: l.layoutId,
        sortOrder: i,
        label: l.label,
      }))
    );
    setDashLayouts(result);
  };

  const onFinish = async (values: Dashboard) => {
    setLoading(true);
    try {
      if (isNew) {
        await api.post("/api/dashboards", values);
        message.success("Dashboard created");
      } else {
        await api.put(`/api/dashboards/${id}`, values);
        await saveLayouts();
        message.success("Dashboard updated");
      }
      navigate("/dashboards");
    } finally {
      setLoading(false);
    }
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
    if (!activeDlId) return;

    if (pickerContainerInstanceId !== null) {
      // Adding child to container
      const siblings = instances.filter(
        (i) => i.parentInstanceId === pickerContainerInstanceId
      );
      const containerInst = instances.find((i) => i.id === pickerContainerInstanceId);
      const inst = await api.post<ComponentInstance>(
        `/api/dashboard-layouts/${activeDlId}/instances`,
        {
          componentId,
          regionId: containerInst?.regionId ?? "",
          sortOrder: siblings.length,
          parentInstanceId: pickerContainerInstanceId,
        }
      );
      setInstances([...instances, inst]);
      setPickerContainerInstanceId(null);
      setConfigInstance(inst);
    } else if (pickerRegionId) {
      // Adding to region
      const regionInstances = instances.filter(
        (i) => i.regionId === pickerRegionId && !i.parentInstanceId
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
    }
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
    setInstances(instances.filter((i) => i.id !== instanceId && i.parentInstanceId !== instanceId));
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

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          accessMode: "public",
          interactiveMode: false,
          layoutSwitchMode: "tabs",
          layoutRotateInterval: 30,
        }}
      >
        <Tabs
          items={[
            {
              key: "settings",
              label: "Settings",
              children: (
                <div>
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
                  <Form.Item
                    name="maxWidth"
                    label="Max Width"
                    tooltip="Maximum width of the layout area (e.g. 1200px, 80%). Leave empty for full width."
                  >
                    <Input placeholder="e.g. 1200px, 80%" allowClear />
                  </Form.Item>
                  <Form.Item
                    name="padding"
                    label="Padding"
                    tooltip="Padding around the layout area (e.g. 16px, 2rem 4rem)"
                  >
                    <Input placeholder="e.g. 16px, 2rem 4rem" allowClear />
                  </Form.Item>
                  <Form.Item name="themeId" label="Theme">
                    <Select
                      allowClear
                      placeholder="No theme"
                      options={allThemes.map((t) => ({ value: t.id, label: t.name }))}
                    />
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
                </div>
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
                        <Button icon={<PlusOutlined />} onClick={addLayout}>
                          Add Layout
                        </Button>
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
                                  onAddToContainer={(containerInstanceId) =>
                                    setPickerContainerInstanceId(containerInstanceId)
                                  }
                                />
                              );
                            })()}
                          </>
                        )}

                        <ComponentPickerModal
                          open={pickerRegionId !== null || pickerContainerInstanceId !== null}
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
                              Object.entries({ ...STANDARD_VARIABLE_DEFAULTS, ...(selectedTheme?.standardVariables ?? {}) })
                                .filter(([k]) => k !== "backgroundType" && k !== "backgroundImage")
                            ),
                            ...(selectedTheme?.globalStyles ?? {}),
                          }}
                          standardVariables={(selectedTheme?.standardVariables ?? {}) as Record<string, string>}
                          onSave={handleConfigSave}
                          onDelete={handleConfigDelete}
                          onCancel={() => setConfigInstance(null)}
                        />
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
        />

        <Form.Item style={{ marginTop: 16 }}>
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
    </Card>
  );
}
