import { useState, useEffect } from "react";
import { Form, Input, InputNumber, Switch, Select, Button, Card, Space } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { api } from "../../api.js";

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

interface VisualEditorProps {
  parameterDefs: ParameterDef[];
  onParameterDefsChange: (defs: ParameterDef[]) => void;
  entitySelectorDefs: EntitySelectorDef[];
  onEntitySelectorDefsChange: (defs: EntitySelectorDef[]) => void;
}

export function VisualEditor({
  parameterDefs,
  onParameterDefsChange,
  entitySelectorDefs,
  onEntitySelectorDefsChange,
}: VisualEditorProps) {
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);

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
      .catch(() => {});
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
        {parameterDefs.map((param, i) => (
          <Space key={i} align="start" style={{ display: "flex", marginBottom: 8 }}>
            <Input
              placeholder="Name"
              value={param.name}
              onChange={(e) => updateParam(i, { name: e.target.value })}
              style={{ width: 120 }}
            />
            <Input
              placeholder="Label"
              value={param.label}
              onChange={(e) => updateParam(i, { label: e.target.value })}
              style={{ width: 120 }}
            />
            <Select
              value={param.type}
              onChange={(type) => updateParam(i, { type })}
              style={{ width: 100 }}
              options={[
                { value: "string", label: "String" },
                { value: "number", label: "Number" },
                { value: "boolean", label: "Boolean" },
                { value: "color", label: "Color" },
                { value: "select", label: "Select" },
              ]}
            />
            <MinusCircleOutlined onClick={() => removeParam(i)} />
          </Space>
        ))}
      </Card>

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
        {entitySelectorDefs.map((sel, i) => (
          <Space key={i} align="start" style={{ display: "flex", marginBottom: 8 }}>
            <Input
              placeholder="Name"
              value={sel.name}
              onChange={(e) =>
                updateEntitySelector(i, { name: e.target.value })
              }
              style={{ width: 120 }}
            />
            <Input
              placeholder="Label"
              value={sel.label}
              onChange={(e) =>
                updateEntitySelector(i, { label: e.target.value })
              }
              style={{ width: 120 }}
            />
            <Select
              value={sel.mode}
              onChange={(mode) => updateEntitySelector(i, { mode })}
              style={{ width: 120 }}
              options={[
                { value: "single", label: "Single" },
                { value: "multiple", label: "Multiple" },
                { value: "glob", label: "Glob/Wildcard" },
                { value: "area", label: "Area" },
                { value: "tag", label: "Tag" },
              ]}
            />
            <Select
              mode="multiple"
              placeholder="All domains"
              value={sel.allowedDomains ?? []}
              onChange={(domains) =>
                updateEntitySelector(i, {
                  allowedDomains: domains.length > 0 ? domains : undefined,
                })
              }
              style={{ width: 200 }}
              options={availableDomains.map((d) => ({
                value: d,
                label: d,
              }))}
              allowClear
            />
            <MinusCircleOutlined onClick={() => removeEntitySelector(i)} />
          </Space>
        ))}
      </Card>
    </div>
  );
}
