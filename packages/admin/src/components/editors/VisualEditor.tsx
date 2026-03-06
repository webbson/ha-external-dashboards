import { useState, useEffect } from "react";
import { Input, Select, Button, Card } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { api } from "../../api.js";

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
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Label</th>
              <th style={thStyle}>Type</th>
              <th style={{ ...thStyle, width: 32 }} />
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
                  <Input
                    size="small"
                    value={param.label}
                    onChange={(e) => updateParam(i, { label: e.target.value })}
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
                      { value: "number", label: "Number" },
                      { value: "boolean", label: "Boolean" },
                      { value: "color", label: "Color" },
                      { value: "icon", label: "Icon" },
                      { value: "select", label: "Select" },
                    ]}
                  />
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  <MinusCircleOutlined onClick={() => removeParam(i)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
              <tr key={i}>
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
                      { value: "area", label: "Area" },
                      { value: "tag", label: "Tag" },
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
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
