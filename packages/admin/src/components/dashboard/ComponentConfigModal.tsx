import { useState, useEffect, useCallback } from "react";
import {
  Modal,
  Input,
  InputNumber,
  Switch,
  Select,
  Collapse,
  Space,
  Button,
  Popconfirm,
  Typography,
} from "antd";
import { DeleteOutlined, PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import { EntitySelector } from "../selectors/EntitySelector.js";
import { MdiIconSelector } from "../selectors/MdiIconSelector.js";
import { LivePreview } from "../preview/LivePreview.js";

interface ParameterDef {
  name: string;
  label: string;
  type: "string" | "number" | "boolean" | "color" | "select" | "icon";
  default?: string | number | boolean;
  options?: { label: string; value: string }[];
  step?: number;
}

interface EntitySelectorDef {
  name: string;
  label: string;
  mode: "single" | "multiple" | "glob";
  allowedDomains?: string[];
}

interface VisibilityRule {
  entityId: string;
  attribute?: string;
  operator: string;
  value: string;
}

interface GlobAttributeFilter {
  attribute: string;
  operator: "eq" | "neq" | "contains" | "startsWith";
  value: string;
}

interface GlobStateFilter {
  operator: "eq" | "neq" | "contains" | "startsWith";
  value: string;
}

interface EntityFilterEntry {
  attributeFilters?: GlobAttributeFilter[];
  stateFilters?: GlobStateFilter[];
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
  entityFilters: Record<string, EntityFilterEntry>;
  parentInstanceId: number | null;
  tabLabel: string | null;
  tabIcon: string | null;
}

interface ComponentDef {
  id: number;
  name: string;
  template: string;
  styles: string;
  parameterDefs: ParameterDef[];
  entitySelectorDefs: EntitySelectorDef[];
}

interface ComponentConfigModalProps {
  open: boolean;
  instance: ComponentInstance | null;
  component: ComponentDef | null;
  regionLabel: string;
  globalStyles?: Record<string, string>;
  standardVariables?: Record<string, string>;
  onSave: (instanceId: number, updates: Partial<ComponentInstance>) => void;
  onDelete: (instanceId: number) => void;
  onCancel: () => void;
}

export function ComponentConfigModal({
  open,
  instance,
  component,
  regionLabel,
  globalStyles = {},
  standardVariables = {},
  onSave,
  onDelete,
  onCancel,
}: ComponentConfigModalProps) {
  const [parameterValues, setParameterValues] = useState<
    Record<string, string | number | boolean>
  >({});
  const [entityBindings, setEntityBindings] = useState<
    Record<string, string | string[]>
  >({});
  const [visibilityRules, setVisibilityRules] = useState<VisibilityRule[]>([]);
  const [entityFilters, setEntityFilters] = useState<Record<string, EntityFilterEntry>>({});
  const [tabLabel, setTabLabel] = useState<string>("");
  const [tabIcon, setTabIcon] = useState<string | null>(null);


  useEffect(() => {
    if (instance && component) {
      const defaults: Record<string, string | number | boolean> = {};
      for (const def of component.parameterDefs) {
        if (def.default !== undefined) defaults[def.name] = def.default;
      }
      setParameterValues({ ...defaults, ...instance.parameterValues });
      setEntityBindings({ ...instance.entityBindings });
      setVisibilityRules([...instance.visibilityRules]);
      setEntityFilters({ ...(instance.entityFilters ?? {}) });
      setTabLabel(instance?.tabLabel ?? "");
      setTabIcon(instance?.tabIcon ?? null);
    }
  }, [instance, component]);



  const handleSave = useCallback(() => {
    if (!instance) return;
    onSave(instance.id, {
      parameterValues,
      entityBindings,
      visibilityRules,
      entityFilters,
      ...(instance.parentInstanceId != null ? { tabLabel: tabLabel || null, tabIcon } : {}),
    });
  }, [instance, parameterValues, entityBindings, visibilityRules, entityFilters, tabLabel, tabIcon, onSave]);

  if (!instance || !component) return null;

  const hasEntityDefs = component.entitySelectorDefs.length > 0;
  const hasParamDefs = component.parameterDefs.length > 0;

  return (
    <Modal
      title={`${component.name} — ${regionLabel}`}
      open={open}
      onCancel={onCancel}
      width="95vw"
      footer={
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Popconfirm
            title="Delete this component instance?"
            onConfirm={() => onDelete(instance.id)}
          >
            <Button danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
          <Space>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" onClick={handleSave}>
              Save
            </Button>
          </Space>
        </div>
      }
      destroyOnHidden
    >
      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {instance?.parentInstanceId != null && (
            <div style={{ marginBottom: 16, padding: 12, background: "rgba(114, 46, 209, 0.08)", borderRadius: 8 }}>
              <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>Tab Settings</Typography.Text>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Tab Label</label>
                <Input value={tabLabel} onChange={(e) => setTabLabel(e.target.value)} placeholder="Tab label" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Tab Icon</label>
                <MdiIconSelector value={tabIcon} onChange={setTabIcon} />
              </div>
            </div>
          )}

          {hasEntityDefs && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>
                Entity Bindings
              </div>
              {component.entitySelectorDefs.map((def) => {
                const bindingValue = entityBindings[def.name];
                const isGlob =
                  def.mode === "glob" &&
                  typeof bindingValue === "string" &&
                  (bindingValue.includes("*") || bindingValue.includes("?"));
                const filters = entityFilters[def.name]?.attributeFilters ?? [];
                const stateFilters = entityFilters[def.name]?.stateFilters ?? [];

                return (
                  <div key={def.name} style={{ marginBottom: 12 }}>
                    <div
                      style={{ fontSize: 12, color: "#999", marginBottom: 4 }}
                    >
                      {def.label}
                    </div>
                    <EntitySelector
                      mode={def.mode}
                      value={bindingValue}
                      onChange={(v) =>
                        setEntityBindings((prev) => ({
                          ...prev,
                          [def.name]: v,
                        }))
                      }
                      allowedDomains={def.allowedDomains}
                    />
                    {isGlob && (
                      <div
                        style={{
                          marginTop: 8,
                          background: "rgba(255,255,255,0.03)",
                          borderRadius: 4,
                          padding: "8px 12px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: filters.length > 0 ? 8 : 0,
                          }}
                        >
                          <Typography.Text
                            type="secondary"
                            style={{ fontSize: 12 }}
                          >
                            Attribute Filters (server-side, reduce WS traffic)
                          </Typography.Text>
                          <Button
                            size="small"
                            type="link"
                            icon={<PlusOutlined />}
                            onClick={() =>
                              setEntityFilters((prev) => ({
                                ...prev,
                                [def.name]: {
                                  attributeFilters: [
                                    ...filters,
                                    {
                                      attribute: "",
                                      operator: "eq" as const,
                                      value: "",
                                    },
                                  ],
                                },
                              }))
                            }
                          >
                            Add Filter
                          </Button>
                        </div>
                        {filters.map((f, i) => (
                          <Space
                            key={i}
                            style={{ display: "flex", marginBottom: 4 }}
                            size={4}
                          >
                            <Input
                              size="small"
                              value={f.attribute}
                              onChange={(e) => {
                                const next = [...filters];
                                next[i] = {
                                  ...next[i],
                                  attribute: e.target.value,
                                };
                                setEntityFilters((prev) => ({
                                  ...prev,
                                  [def.name]: { ...prev[def.name], attributeFilters: next },
                                }));
                              }}
                              placeholder="attribute"
                              style={{ width: 140 }}
                            />
                            <Select
                              size="small"
                              value={f.operator}
                              onChange={(operator) => {
                                const next = [...filters];
                                next[i] = { ...next[i], operator };
                                setEntityFilters((prev) => ({
                                  ...prev,
                                  [def.name]: { ...prev[def.name], attributeFilters: next },
                                }));
                              }}
                              style={{ width: 110 }}
                              options={[
                                { value: "eq", label: "equals" },
                                { value: "neq", label: "not equals" },
                                { value: "contains", label: "contains" },
                                {
                                  value: "startsWith",
                                  label: "starts with",
                                },
                              ]}
                            />
                            <Input
                              size="small"
                              value={f.value}
                              onChange={(e) => {
                                const next = [...filters];
                                next[i] = {
                                  ...next[i],
                                  value: e.target.value,
                                };
                                setEntityFilters((prev) => ({
                                  ...prev,
                                  [def.name]: { ...prev[def.name], attributeFilters: next },
                                }));
                              }}
                              placeholder="value"
                              style={{ width: 160 }}
                            />
                            <MinusCircleOutlined
                              style={{ cursor: "pointer", color: "#999" }}
                              onClick={() => {
                                const next = filters.filter(
                                  (_, j) => j !== i
                                );
                                setEntityFilters((prev) => ({
                                  ...prev,
                                  [def.name]: {
                                    ...prev[def.name],
                                    attributeFilters:
                                      next.length > 0 ? next : undefined,
                                  },
                                }));
                              }}
                            />
                          </Space>
                        ))}

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: filters.length > 0 ? 12 : 0,
                            marginBottom: stateFilters.length > 0 ? 8 : 0,
                          }}
                        >
                          <Typography.Text
                            type="secondary"
                            style={{ fontSize: 12 }}
                          >
                            State Filters (server-side, reduce WS traffic)
                          </Typography.Text>
                          <Button
                            size="small"
                            type="link"
                            icon={<PlusOutlined />}
                            onClick={() =>
                              setEntityFilters((prev) => ({
                                ...prev,
                                [def.name]: {
                                  ...prev[def.name],
                                  stateFilters: [
                                    ...stateFilters,
                                    {
                                      operator: "eq" as const,
                                      value: "",
                                    },
                                  ],
                                },
                              }))
                            }
                          >
                            Add Filter
                          </Button>
                        </div>
                        {stateFilters.map((f, i) => (
                          <Space
                            key={i}
                            style={{ display: "flex", marginBottom: 4 }}
                            size={4}
                          >
                            <Typography.Text
                              type="secondary"
                              style={{ fontSize: 12, width: 40 }}
                            >
                              state
                            </Typography.Text>
                            <Select
                              size="small"
                              value={f.operator}
                              onChange={(operator) => {
                                const next = [...stateFilters];
                                next[i] = { ...next[i], operator };
                                setEntityFilters((prev) => ({
                                  ...prev,
                                  [def.name]: { ...prev[def.name], stateFilters: next },
                                }));
                              }}
                              style={{ width: 110 }}
                              options={[
                                { value: "eq", label: "equals" },
                                { value: "neq", label: "not equals" },
                                { value: "contains", label: "contains" },
                                {
                                  value: "startsWith",
                                  label: "starts with",
                                },
                              ]}
                            />
                            <Input
                              size="small"
                              value={f.value}
                              onChange={(e) => {
                                const next = [...stateFilters];
                                next[i] = {
                                  ...next[i],
                                  value: e.target.value,
                                };
                                setEntityFilters((prev) => ({
                                  ...prev,
                                  [def.name]: { ...prev[def.name], stateFilters: next },
                                }));
                              }}
                              placeholder="value"
                              style={{ width: 160 }}
                            />
                            <MinusCircleOutlined
                              style={{ cursor: "pointer", color: "#999" }}
                              onClick={() => {
                                const next = stateFilters.filter(
                                  (_, j) => j !== i
                                );
                                setEntityFilters((prev) => ({
                                  ...prev,
                                  [def.name]: {
                                    ...prev[def.name],
                                    stateFilters:
                                      next.length > 0 ? next : undefined,
                                  },
                                }));
                              }}
                            />
                          </Space>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {hasParamDefs && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>Parameters</div>
              {component.parameterDefs.map((def) => (
                <div key={def.name} style={{ marginBottom: 12 }}>
                  <div
                    style={{ fontSize: 12, color: "#999", marginBottom: 4 }}
                  >
                    {def.label}
                  </div>
                  {def.type === "boolean" ? (
                    <Switch
                      checked={!!parameterValues[def.name]}
                      onChange={(v) =>
                        setParameterValues((prev) => ({
                          ...prev,
                          [def.name]: v,
                        }))
                      }
                    />
                  ) : def.type === "number" ? (
                    <InputNumber
                      value={parameterValues[def.name] as number}
                      step={def.step}
                      onChange={(v) =>
                        setParameterValues((prev) => ({
                          ...prev,
                          [def.name]: v ?? 0,
                        }))
                      }
                    />
                  ) : def.type === "select" ? (
                    <Select
                      value={parameterValues[def.name] as string}
                      onChange={(v) =>
                        setParameterValues((prev) => ({
                          ...prev,
                          [def.name]: v,
                        }))
                      }
                      options={def.options ?? []}
                      style={{ width: "100%" }}
                    />
                  ) : def.type === "icon" ? (
                    <MdiIconSelector
                      value={(parameterValues[def.name] as string) || null}
                      onChange={(v) =>
                        setParameterValues((prev) => ({
                          ...prev,
                          [def.name]: v ?? "",
                        }))
                      }
                    />
                  ) : def.type === "color" ? (
                    <Input
                      type="color"
                      value={(parameterValues[def.name] as string) ?? "#ffffff"}
                      onChange={(e) =>
                        setParameterValues((prev) => ({
                          ...prev,
                          [def.name]: e.target.value,
                        }))
                      }
                      style={{ width: 60 }}
                    />
                  ) : (
                    <Input
                      value={(parameterValues[def.name] as string) ?? ""}
                      onChange={(e) =>
                        setParameterValues((prev) => ({
                          ...prev,
                          [def.name]: e.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <Collapse
            size="small"
            items={[
              {
                key: "visibility",
                label: "Visibility Rules",
                children: (
                  <div>
                    {visibilityRules.map((rule, i) => (
                      <Space
                        key={i}
                        style={{ display: "flex", marginBottom: 8 }}
                      >
                        <Input
                          placeholder="Entity ID"
                          value={rule.entityId}
                          onChange={(e) => {
                            const next = [...visibilityRules];
                            next[i] = { ...next[i], entityId: e.target.value };
                            setVisibilityRules(next);
                          }}
                          style={{ width: 160 }}
                        />
                        <Input
                          placeholder="Attribute"
                          value={rule.attribute ?? ""}
                          onChange={(e) => {
                            const next = [...visibilityRules];
                            next[i] = {
                              ...next[i],
                              attribute: e.target.value || undefined,
                            };
                            setVisibilityRules(next);
                          }}
                          style={{ width: 100 }}
                        />
                        <Select
                          value={rule.operator}
                          onChange={(v) => {
                            const next = [...visibilityRules];
                            next[i] = { ...next[i], operator: v };
                            setVisibilityRules(next);
                          }}
                          style={{ width: 80 }}
                          options={[
                            { value: "eq", label: "=" },
                            { value: "neq", label: "!=" },
                            { value: "gt", label: ">" },
                            { value: "lt", label: "<" },
                            { value: "gte", label: ">=" },
                            { value: "lte", label: "<=" },
                          ]}
                        />
                        <Input
                          placeholder="Value"
                          value={rule.value}
                          onChange={(e) => {
                            const next = [...visibilityRules];
                            next[i] = { ...next[i], value: e.target.value };
                            setVisibilityRules(next);
                          }}
                          style={{ width: 100 }}
                        />
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() =>
                            setVisibilityRules(
                              visibilityRules.filter((_, j) => j !== i)
                            )
                          }
                        />
                      </Space>
                    ))}
                    <Button
                      size="small"
                      onClick={() =>
                        setVisibilityRules([
                          ...visibilityRules,
                          { entityId: "", operator: "eq", value: "" },
                        ])
                      }
                    >
                      Add Rule
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <LivePreview
            template={component.template}
            styles={component.styles}
            entityBindings={entityBindings}
            parameterValues={parameterValues}
            globalStyles={globalStyles}
            standardVariables={standardVariables}
            entityFilters={entityFilters}
            manualRefresh={Object.values(entityBindings).some(
              (v) => typeof v === "string" && (v.includes("*") || v.includes("?"))
            )}
          />
        </div>
      </div>
    </Modal>
  );
}
