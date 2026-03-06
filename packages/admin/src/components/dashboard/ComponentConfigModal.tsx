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
import { DeleteOutlined } from "@ant-design/icons";
import { EntitySelector } from "../selectors/EntitySelector.js";
import { MdiIconSelector } from "../selectors/MdiIconSelector.js";
import { LivePreview } from "../preview/LivePreview.js";

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

interface VisibilityRule {
  entityId: string;
  attribute?: string;
  operator: string;
  value: string;
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
      ...(instance.parentInstanceId != null ? { tabLabel: tabLabel || null, tabIcon } : {}),
    });
  }, [instance, parameterValues, entityBindings, visibilityRules, tabLabel, tabIcon, onSave]);

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
              {component.entitySelectorDefs.map((def) => (
                <div key={def.name} style={{ marginBottom: 12 }}>
                  <div
                    style={{ fontSize: 12, color: "#999", marginBottom: 4 }}
                  >
                    {def.label}
                  </div>
                  <EntitySelector
                    mode={def.mode}
                    value={entityBindings[def.name]}
                    onChange={(v) =>
                      setEntityBindings((prev) => ({
                        ...prev,
                        [def.name]: v,
                      }))
                    }
                    allowedDomains={def.allowedDomains}
                  />
                </div>
              ))}
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
          />
        </div>
      </div>
    </Modal>
  );
}
