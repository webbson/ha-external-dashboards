import { useEffect } from "react";
import { Modal, Form, Select, Input, Button, Space } from "antd";

interface Layout {
  id: number;
  name: string;
}

interface LayoutTabModalProps {
  open: boolean;
  mode: "add" | "edit";
  layoutId?: number;
  label?: string | null;
  allLayouts: Layout[];
  canRemove: boolean;
  onSave: (layoutId: number, label: string | null) => void;
  onRemove: () => void;
  onCancel: () => void;
}

export function LayoutTabModal({
  open,
  mode,
  layoutId,
  label,
  allLayouts,
  canRemove,
  onSave,
  onRemove,
  onCancel,
}: LayoutTabModalProps) {
  const [form] = Form.useForm<{ layoutId: number; label: string }>();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        layoutId: layoutId ?? allLayouts[0]?.id,
        label: label ?? "",
      });
    }
  }, [open, layoutId, label, allLayouts, form]);

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSave(values.layoutId, values.label || null);
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
          <Input placeholder="Optional — defaults to layout name" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
