import { useEffect, useState } from "react";
import { Modal, Form, Select, Input, Button, Space, theme } from "antd";
import { MdiIconSelector } from "../selectors/MdiIconSelector.js";

interface Layout {
  id: number;
  name: string;
  structure?: {
    gridTemplate: string;
    regions: { id: string }[];
  };
}

interface LayoutTabModalProps {
  open: boolean;
  mode: "add" | "edit";
  layoutId?: number;
  label?: string | null;
  icon?: string | null;
  allLayouts: Layout[];
  canRemove: boolean;
  onSave: (layoutId: number, label: string | null, icon: string | null) => void;
  onRemove: () => void;
  onCancel: () => void;
}

export function LayoutTabModal({
  open,
  mode,
  layoutId,
  label,
  icon,
  allLayouts,
  canRemove,
  onSave,
  onRemove,
  onCancel,
}: LayoutTabModalProps) {
  const [form] = Form.useForm<{ layoutId: number; label: string }>();
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { token } = theme.useToken();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        layoutId: layoutId ?? allLayouts[0]?.id,
        label: label ?? "",
      });
      setSelectedIcon(icon ?? null);
      setValidationError(null);
    }
  }, [open, layoutId, label, icon, allLayouts, form]);

  const selectedLayoutId = Form.useWatch("layoutId", form);
  const selectedLayout = allLayouts.find((l) => l.id === selectedLayoutId);

  const handleOk = () => {
    form.validateFields().then((values) => {
      const trimmedLabel = values.label?.trim() || null;
      if (!trimmedLabel && !selectedIcon) {
        setValidationError("Please provide at least a label or an icon");
        return;
      }
      setValidationError(null);
      onSave(values.layoutId, trimmedLabel, selectedIcon);
    });
  };

  return (
    <Modal
      title={mode === "add" ? "Add Layout Tab" : "Edit Layout Tab"}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            {mode === "edit" && canRemove && (
              <Button danger onClick={onRemove}>
                Remove
              </Button>
            )}
          </div>
          <Space>
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" onClick={handleOk}>
              {mode === "add" ? "Add" : "Save"}
            </Button>
          </Space>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item name="layoutId" label="Layout" rules={[{ required: true }]}>
          <Select
            options={allLayouts.map((l) => ({ value: l.id, label: l.name }))}
          />
        </Form.Item>
        <Form.Item name="label" label="Tab Label">
          <Input />
        </Form.Item>
        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 8, color: token.colorText }}>
            Tab Icon
          </div>
          <MdiIconSelector value={selectedIcon} onChange={setSelectedIcon} />
        </div>
        {validationError && (
          <div style={{ color: "#ff4d4f", marginBottom: 16 }}>
            {validationError}
          </div>
        )}
      </Form>

      {selectedLayout?.structure && (
        <div
          style={{
            display: "grid",
            gridTemplate: selectedLayout.structure.gridTemplate,
            gap: 4,
            minHeight: 120,
            background: token.colorBgLayout,
            border: `1px solid ${token.colorBorderSecondary}`,
            padding: 8,
            borderRadius: 8,
          }}
        >
          {selectedLayout.structure.regions.map((r) => (
            <div
              key={r.id}
              style={{
                gridArea: r.id,
                background: token.colorBgContainer,
                border: `1px dashed ${token.colorBorder}`,
                borderRadius: 4,
                padding: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: token.colorTextSecondary,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {r.id}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
