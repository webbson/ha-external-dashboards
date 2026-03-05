import { ColorPicker, Input, Radio, Select } from "antd";
import { useEffect, useState } from "react";
import type { StandardVariables } from "@ha-dashboards/shared";
import { STANDARD_VARIABLE_DEFAULTS } from "@ha-dashboards/shared";
import { api } from "../../api.js";

interface Asset {
  id: number;
  name: string;
  fileName: string;
  mimeType: string;
}

interface StandardVariablesFormProps {
  value: Partial<StandardVariables>;
  onChange: (value: Partial<StandardVariables>) => void;
}

export function StandardVariablesForm({ value, onChange }: StandardVariablesFormProps) {
  const [imageAssets, setImageAssets] = useState<Asset[]>([]);
  const merged = { ...STANDARD_VARIABLE_DEFAULTS, ...value };

  useEffect(() => {
    api.get<Asset[]>("/api/assets").then((assets) => {
      setImageAssets(assets.filter((a) => a.mimeType.startsWith("image/")));
    });
  }, []);

  const update = (key: keyof StandardVariables, val: string) => {
    onChange({ ...value, [key]: val });
  };

  const colorField = (label: string, key: keyof StandardVariables) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>{label}</div>
      <ColorPicker
        value={merged[key]}
        onChange={(_, hex) => update(key, hex)}
        showText
      />
    </div>
  );

  const textField = (label: string, key: keyof StandardVariables, placeholder?: string) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>{label}</div>
      <Input
        value={merged[key]}
        onChange={(e) => update(key, e.target.value)}
        placeholder={placeholder ?? STANDARD_VARIABLE_DEFAULTS[key]}
        style={{ width: 200 }}
      />
    </div>
  );

  return (
    <div>
      <div style={{ fontWeight: 500, marginBottom: 12 }}>Standard Variables</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
        <div>
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Colors</div>
          {colorField("Component Background", "componentBg")}
          {colorField("Primary Font Color", "fontColor")}
          {colorField("Secondary Font Color", "fontColorSecondary")}
          {colorField("Accent Color", "accentColor")}
        </div>

        <div>
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Typography</div>
          {textField("Font Family", "fontFamily", "inherit")}
          {textField("Font Size", "fontSize", "16px")}
        </div>

        <div>
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Component Chrome</div>
          {textField("Border Style", "borderStyle", "none")}
          {textField("Border Radius", "borderRadius", "0px")}
          {textField("Component Padding", "componentPadding", "0px")}
        </div>

        <div>
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Layout</div>
          {textField("Component Gap", "componentGap", "0px")}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Background</div>
        <Radio.Group
          value={merged.backgroundType}
          onChange={(e) => update("backgroundType", e.target.value)}
          style={{ marginBottom: 12 }}
        >
          <Radio value="color">Color</Radio>
          <Radio value="image">Image</Radio>
        </Radio.Group>

        {merged.backgroundType === "color" ? (
          <div>
            <ColorPicker
              value={merged.backgroundColor}
              onChange={(_, hex) => update("backgroundColor", hex)}
              showText
            />
          </div>
        ) : (
          <div>
            <Select
              value={merged.backgroundImage || undefined}
              onChange={(v) => update("backgroundImage", v)}
              placeholder="Select an image asset"
              style={{ width: 300 }}
              allowClear
              options={imageAssets.map((a) => ({
                value: a.fileName,
                label: a.name,
              }))}
            />
            {merged.backgroundImage && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={`/api/assets/${imageAssets.find((a) => a.fileName === merged.backgroundImage)?.id}/file`}
                  alt="Background preview"
                  style={{
                    maxWidth: 200,
                    maxHeight: 120,
                    borderRadius: 4,
                    border: "1px solid #333",
                    objectFit: "cover",
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
