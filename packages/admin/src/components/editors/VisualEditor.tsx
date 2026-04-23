import React, { useState, useEffect } from "react";
import { Input, InputNumber, Select, Switch, Button, Card, Modal, Form, Space } from "antd";
import { MinusCircleOutlined, PlusOutlined, UpOutlined, DownOutlined, SettingOutlined } from "@ant-design/icons";
import { MdiIconSelector } from "../selectors/MdiIconSelector.js";
import { api } from "../../api.js";

interface ParameterDef {
  name: string;
  label: string;
  type: "string" | "number" | "boolean" | "color" | "select" | "icon" | "asset" | "textarea";
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

interface VisualEditorProps {
  parameterDefs: ParameterDef[];
  onParameterDefsChange: (defs: ParameterDef[]) => void;
  entitySelectorDefs: EntitySelectorDef[];
  onEntitySelectorDefsChange: (defs: EntitySelectorDef[]) => void;
}

const thStyle: React.CSSProperties = {
  padding: "4px 8px",
  fontSize: 12,
  fontWeight: 500,
  textAlign: "left",
  color: "#999",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "4px 8px",
};

function ParamSettingsModal({
  param,
  open,
  onSave,
  onCancel,
}: {
  param: ParameterDef;
  open: boolean;
  onSave: (updates: Partial<ParameterDef>) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(param.label);
  const [defaultValue, setDefaultValue] = useState<string | number | boolean | undefined>(param.default);
  const [step, setStep] = useState<number | undefined>(param.step);
  const [options, setOptions] = useState<{ label: string; value: string }[]>(param.options ?? []);

  // Reset state when param changes
  useEffect(() => {
    setLabel(param.label);
    setDefaultValue(param.default);
    setStep(param.step);
    setOptions(param.options ?? []);
  }, [param]);

  const handleSave = () => {
    const updates: Partial<ParameterDef> = { label };

    if (param.type === "boolean") {
      updates.default = !!defaultValue;
    } else if (param.type === "number") {
      updates.default = defaultValue != null ? Number(defaultValue) : undefined;
      updates.step = step;
    } else if (param.type === "select") {
      updates.default = defaultValue as string;
      updates.options = options.filter((o) => o.value.trim() !== "");
    } else {
      updates.default = defaultValue as string;
    }

    onSave(updates);
  };

  return (
    <Modal
      title={`Parameter Settings — ${param.name || "(unnamed)"}`}
      open={open}
      onOk={handleSave}
      onCancel={onCancel}
      width={480}
      destroyOnClose
    >
      <Form layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item label="Label">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </Form.Item>

        <Form.Item label="Default Value">
          {param.type === "boolean" ? (
            <Switch checked={!!defaultValue} onChange={(v) => setDefaultValue(v)} />
          ) : param.type === "number" ? (
            <InputNumber
              value={defaultValue as number}
              step={step}
              onChange={(v) => setDefaultValue(v ?? undefined)}
              style={{ width: "100%" }}
            />
          ) : param.type === "color" ? (
            <Input
              type="color"
              value={(defaultValue as string) ?? "#ffffff"}
              onChange={(e) => setDefaultValue(e.target.value)}
              style={{ width: 80, padding: 2 }}
            />
          ) : param.type === "icon" ? (
            <MdiIconSelector
              value={(defaultValue as string) || null}
              onChange={(v) => setDefaultValue(v ?? "")}
            />
          ) : param.type === "select" ? (
            <Select
              value={defaultValue as string}
              onChange={(v) => setDefaultValue(v)}
              options={options}
              allowClear
              placeholder="Select default..."
              style={{ width: "100%" }}
            />
          ) : (
            <Input
              value={defaultValue != null ? String(defaultValue) : ""}
              onChange={(e) => setDefaultValue(e.target.value)}
            />
          )}
        </Form.Item>

        {param.type === "number" && (
          <Form.Item label="Step Size">
            <InputNumber
              value={step}
              min={0}
              onChange={(v) => setStep(v ?? undefined)}
              style={{ width: "100%" }}
            />
          </Form.Item>
        )}

        {param.type === "select" && (
          <Form.Item label="Options">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {options.map((opt, i) => (
                <Space key={i} style={{ width: "100%" }}>
                  <Input
                    placeholder="Value"
                    value={opt.value}
                    onChange={(e) => {
                      const next = [...options];
                      next[i] = { ...next[i], value: e.target.value };
                      setOptions(next);
                    }}
                    style={{ width: 160 }}
                  />
                  <Input
                    placeholder="Label"
                    value={opt.label}
                    onChange={(e) => {
                      const next = [...options];
                      next[i] = { ...next[i], label: e.target.value };
                      setOptions(next);
                    }}
                    style={{ width: 160 }}
                  />
                  <MinusCircleOutlined
                    onClick={() => setOptions(options.filter((_, j) => j !== i))}
                  />
                </Space>
              ))}
              <Button
                size="small"
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => setOptions([...options, { label: "", value: "" }])}
              >
                Add Option
              </Button>
            </div>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}

export function VisualEditor({
  parameterDefs,
  onParameterDefsChange,
  entitySelectorDefs,
  onEntitySelectorDefsChange,
}: VisualEditorProps) {
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [settingsIndex, setSettingsIndex] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<{ entity_id: string }[]>("/api/ha/entities")
      .then((entities) => {
        const domains = new Set<string>();
        for (const e of entities) {
          const dot = e.entity_id.indexOf(".");
          if (dot > 0) domains.add(e.entity_id.substring(0, dot));
        }
        setAvailableDomains(Array.from(domains).sort());
      })
      .catch((err) => console.warn("Failed to load entity domains:", err));
  }, []);

  const addParam = () => {
    onParameterDefsChange([
      ...parameterDefs,
      { name: "", label: "", type: "string" },
    ]);
  };

  const updateParam = (index: number, updates: Partial<ParameterDef>) => {
    const next = [...parameterDefs];
    next[index] = { ...next[index], ...updates };
    onParameterDefsChange(next);
  };

  const removeParam = (index: number) => {
    onParameterDefsChange(parameterDefs.filter((_, i) => i !== index));
  };

  const moveParam = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= parameterDefs.length) return;
    const next = [...parameterDefs];
    [next[index], next[target]] = [next[target], next[index]];
    onParameterDefsChange(next);
  };

  const addEntitySelector = () => {
    onEntitySelectorDefsChange([
      ...entitySelectorDefs,
      { name: "", label: "", mode: "single" },
    ]);
  };

  const updateEntitySelector = (
    index: number,
    updates: Partial<EntitySelectorDef>
  ) => {
    const next = [...entitySelectorDefs];
    next[index] = { ...next[index], ...updates };
    onEntitySelectorDefsChange(next);
  };

  const removeEntitySelector = (index: number) => {
    onEntitySelectorDefsChange(
      entitySelectorDefs.filter((_, i) => i !== index)
    );
  };

  return (
    <div>
      <Card
        title="Parameters"
        size="small"
        style={{ marginBottom: 16 }}
        extra={
          <Button size="small" icon={<PlusOutlined />} onClick={addParam}>
            Add
          </Button>
        }
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <th style={thStyle}>Name</th>
              <th style={{ ...thStyle, width: 110 }}>Type</th>
              <th style={{ ...thStyle, width: 110 }} />
            </tr>
          </thead>
          <tbody>
            {parameterDefs.map((param, i) => (
              <tr key={i}>
                <td style={tdStyle}>
                  <Input
                    size="small"
                    value={param.name}
                    onChange={(e) => updateParam(i, { name: e.target.value })}
                  />
                </td>
                <td style={tdStyle}>
                  <Select
                    size="small"
                    value={param.type}
                    onChange={(type) => updateParam(i, { type })}
                    style={{ width: "100%" }}
                    options={[
                      { value: "string", label: "String" },
                      { value: "textarea", label: "Textarea" },
                      { value: "number", label: "Number" },
                      { value: "boolean", label: "Boolean" },
                      { value: "color", label: "Color" },
                      { value: "icon", label: "Icon" },
                      { value: "select", label: "Select" },
                      { value: "asset", label: "Asset" },
                    ]}
                  />
                </td>
                <td style={{ ...tdStyle, textAlign: "center", whiteSpace: "nowrap" }}>
                  <UpOutlined
                    style={{ cursor: i === 0 ? "not-allowed" : "pointer", opacity: i === 0 ? 0.3 : 1, marginRight: 10 }}
                    onClick={() => moveParam(i, -1)}
                  />
                  <DownOutlined
                    style={{ cursor: i === parameterDefs.length - 1 ? "not-allowed" : "pointer", opacity: i === parameterDefs.length - 1 ? 0.3 : 1, marginRight: 10 }}
                    onClick={() => moveParam(i, 1)}
                  />
                  <SettingOutlined
                    style={{ cursor: "pointer", marginRight: 10 }}
                    onClick={() => setSettingsIndex(i)}
                  />
                  <MinusCircleOutlined onClick={() => removeParam(i)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {settingsIndex !== null && parameterDefs[settingsIndex] && (
        <ParamSettingsModal
          param={parameterDefs[settingsIndex]}
          open
          onSave={(updates) => {
            updateParam(settingsIndex, updates);
            setSettingsIndex(null);
          }}
          onCancel={() => setSettingsIndex(null)}
        />
      )}

      <Card
        title="Entity Selectors"
        size="small"
        extra={
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={addEntitySelector}
          >
            Add
          </Button>
        }
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Label</th>
              <th style={thStyle}>Mode</th>
              <th style={thStyle}>Allowed Domains</th>
              <th style={{ ...thStyle, width: 32 }} />
            </tr>
          </thead>
          <tbody>
            {entitySelectorDefs.map((sel, i) => (
              <React.Fragment key={i}>
              <tr>
                <td style={tdStyle}>
                  <Input
                    size="small"
                    value={sel.name}
                    onChange={(e) =>
                      updateEntitySelector(i, { name: e.target.value })
                    }
                  />
                </td>
                <td style={tdStyle}>
                  <Input
                    size="small"
                    value={sel.label}
                    onChange={(e) =>
                      updateEntitySelector(i, { label: e.target.value })
                    }
                  />
                </td>
                <td style={tdStyle}>
                  <Select
                    size="small"
                    value={sel.mode}
                    onChange={(mode) => updateEntitySelector(i, { mode })}
                    style={{ width: "100%" }}
                    options={[
                      { value: "single", label: "Single" },
                      { value: "multiple", label: "Multiple" },
                      { value: "glob", label: "Glob/Wildcard" },
                    ]}
                  />
                </td>
                <td style={tdStyle}>
                  <Select
                    size="small"
                    mode="multiple"
                    placeholder="All domains"
                    value={sel.allowedDomains ?? []}
                    onChange={(domains) =>
                      updateEntitySelector(i, {
                        allowedDomains: domains.length > 0 ? domains : undefined,
                      })
                    }
                    style={{ width: "100%" }}
                    options={availableDomains.map((d) => ({
                      value: d,
                      label: d,
                    }))}
                    allowClear
                  />
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  <MinusCircleOutlined onClick={() => removeEntitySelector(i)} />
                </td>
              </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
