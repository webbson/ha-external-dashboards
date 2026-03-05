import { useState } from "react";
import { Tabs } from "antd";
import { CodeEditor } from "./CodeEditor.js";
import { VisualEditor } from "./VisualEditor.js";

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

interface HybridEditorProps {
  template: string;
  onTemplateChange: (value: string) => void;
  styles: string;
  onStylesChange: (value: string) => void;
  parameterDefs: ParameterDef[];
  onParameterDefsChange: (defs: ParameterDef[]) => void;
  entitySelectorDefs: EntitySelectorDef[];
  onEntitySelectorDefsChange: (defs: EntitySelectorDef[]) => void;
}

export function HybridEditor({
  template,
  onTemplateChange,
  styles,
  onStylesChange,
  parameterDefs,
  onParameterDefsChange,
  entitySelectorDefs,
  onEntitySelectorDefsChange,
}: HybridEditorProps) {
  const [mode, setMode] = useState<string>("visual");

  return (
    <Tabs
      activeKey={mode}
      onChange={setMode}
      items={[
        {
          key: "visual",
          label: "Visual",
          children: (
            <VisualEditor
              parameterDefs={parameterDefs}
              onParameterDefsChange={onParameterDefsChange}
              entitySelectorDefs={entitySelectorDefs}
              onEntitySelectorDefsChange={onEntitySelectorDefsChange}
            />
          ),
        },
        {
          key: "template",
          label: "Template",
          children: (
            <CodeEditor
              value={template}
              onChange={onTemplateChange}
              language="handlebars"
            />
          ),
        },
        {
          key: "styles",
          label: "Styles",
          children: (
            <CodeEditor
              value={styles}
              onChange={onStylesChange}
              language="css"
            />
          ),
        },
      ]}
    />
  );
}
