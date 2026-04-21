import { useState } from "react";
import { Tabs, Collapse, message, Alert } from "antd";
import { CodeEditor } from "./CodeEditor.js";
import { VisualEditor } from "./VisualEditor.js";
import { TemplateHelperReference } from "./TemplateHelperReference.js";

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

interface HybridEditorProps {
  template: string;
  onTemplateChange: (value: string) => void;
  styles: string;
  onStylesChange: (value: string) => void;
  parameterDefs: ParameterDef[];
  onParameterDefsChange: (defs: ParameterDef[]) => void;
  entitySelectorDefs: EntitySelectorDef[];
  onEntitySelectorDefsChange: (defs: EntitySelectorDef[]) => void;
  onSave?: () => void;
  testEntityBindings?: Record<string, string | string[]>;
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
  onSave,
  testEntityBindings,
}: HybridEditorProps) {
  const [mode, setMode] = useState<string>("visual");

  return (
    <Tabs
      activeKey={mode}
      onChange={setMode}
      items={[
        {
          key: "visual",
          label: "Settings",
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
            <div>
              <CodeEditor
                value={template}
                onChange={onTemplateChange}
                language="handlebars"
                onSave={onSave}
                testEntityBindings={testEntityBindings}
                entitySelectorDefs={entitySelectorDefs}
              />
              <TemplateHelperReference />
            </div>
          ),
        },
        {
          key: "styles",
          label: "Styles",
          children: (
            <div>
              <CodeEditor
                value={styles}
                onChange={onStylesChange}
                language="css"
                onSave={onSave}
              />
              <Alert
                type="info"
                showIcon
                style={{ marginTop: 12 }}
                title="Chrome styles (background, border, border-radius, padding) are applied automatically by the theme. To override them for this component, use :host { background: none !important; }"
              />
            </div>
          ),
        },
      ]}
    />
  );
}
