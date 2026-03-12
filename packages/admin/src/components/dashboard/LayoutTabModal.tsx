import { useEffect, useState } from "react";
import { Modal, Form, Select, Input, Button, Space, theme, Checkbox, InputNumber, Divider } from "antd";
import { MdiIconSelector } from "../selectors/MdiIconSelector.js";

interface Layout {
  id: number;
  name: string;
  structure?: {
    gridTemplate: string;
    regions: { id: string }[];
  };
}

interface VisibilityRule {
  entityId: string;
  attribute?: string;
  operator: string;
  value: string;
}

interface LayoutTabModalProps {
  open: boolean;
  mode: "add" | "edit";
  layoutId?: number;
  label?: string | null;
  icon?: string | null;
  visibilityRules?: VisibilityRule[] | null;
  hideInTabBar?: boolean | null;
  autoReturn?: boolean | null;
  autoReturnDelay?: number | null;
  allLayouts: Layout[];
  canRemove: boolean;
  onSave: (
    layoutId: number,
    label: string | null,
    icon: string | null,
    visibilityRules: VisibilityRule[],
    hideInTabBar: boolean,
    autoReturn: boolean,
    autoReturnDelay: number
  ) => void;
  onRemove: () => void;
  onCancel: () => void;
}

export function LayoutTabModal({
  open,
  mode,
  layoutId,
  label,
  icon,
  visibilityRules: initialVisibilityRules,
  hideInTabBar: initialHideInTabBar,
  autoReturn: initialAutoReturn,
  autoReturnDelay: initialAutoReturnDelay,
  allLayouts,
  canRemove,
  onSave,
  onRemove,
  onCancel,
}: LayoutTabModalProps) {
  const [form] = Form.useForm<{ layoutId: number; label: string }>();
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [visibilityRules, setVisibilityRules] = useState<VisibilityRule[]>([]);
  const [hideInTabBar, setHideInTabBar] = useState(false);
  const [autoReturn, setAutoReturn] = useState(false);
  const [autoReturnDelay, setAutoReturnDelay] = useState(10);
  const { token } = theme.useToken();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        layoutId: layoutId ?? allLayouts[0]?.id,
        label: label ?? "",
      });
      setSelectedIcon(icon ?? null);
      setVisibilityRules(initialVisibilityRules?.length ? [...initialVisibilityRules] : []);
      setHideInTabBar(initialHideInTabBar ?? false);
      setAutoReturn(initialAutoReturn ?? false);
      setAutoReturnDelay(initialAutoReturnDelay ?? 10);
      setValidationError(null);
    }
  }, [open, layoutId, label, icon, initialVisibilityRules, initialHideInTabBar, initialAutoReturn, initialAutoReturnDelay, allLayouts, form]);

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
      onSave(values.layoutId, trimmedLabel, selectedIcon, visibilityRules, hideInTabBar, autoReturn, autoReturnDelay);
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

        <Divider orientation="left" style={{ fontSize: 12, color: token.colorTextSecondary }}>Visibility</Divider>

        <div style={{ marginBottom: 12 }}>
          {visibilityRules.map((rule, i) => (
            <Space key={i} style={{ display: "flex", marginBottom: 4 }} align="start">
              <Input
                placeholder="entity_id"
                size="small"
                style={{ width: 140 }}
                value={rule.entityId}
                onChange={(e) => {
                  const next = [...visibilityRules];
                  next[i] = { ...next[i], entityId: e.target.value };
                  setVisibilityRules(next);
                }}
              />
              <Input
                placeholder="attribute (opt)"
                size="small"
                style={{ width: 120 }}
                value={rule.attribute ?? ""}
                onChange={(e) => {
                  const next = [...visibilityRules];
                  next[i] = { ...next[i], attribute: e.target.value || undefined };
                  setVisibilityRules(next);
                }}
              />
              <Select
                size="small"
                style={{ width: 70 }}
                value={rule.operator}
                onChange={(v) => {
                  const next = [...visibilityRules];
                  next[i] = { ...next[i], operator: v };
                  setVisibilityRules(next);
                }}
                options={[
                  { value: "eq", label: "=" },
                  { value: "neq", label: "≠" },
                  { value: "gt", label: ">" },
                  { value: "lt", label: "<" },
                  { value: "gte", label: "≥" },
                  { value: "lte", label: "≤" },
                ]}
              />
              <Input
                placeholder="value"
                size="small"
                style={{ width: 100 }}
                value={rule.value}
                onChange={(e) => {
                  const next = [...visibilityRules];
                  next[i] = { ...next[i], value: e.target.value };
                  setVisibilityRules(next);
                }}
              />
              <Button
                size="small"
                danger
                onClick={() => setVisibilityRules(visibilityRules.filter((_, j) => j !== i))}
              >
                ×
              </Button>
            </Space>
          ))}
          <Button
            size="small"
            onClick={() => setVisibilityRules([...visibilityRules, { entityId: "", operator: "eq", value: "" }])}
          >
            + Add Rule
          </Button>
        </div>

        <Divider orientation="left" style={{ fontSize: 12, color: token.colorTextSecondary }}>Behaviour</Divider>

        <div style={{ marginBottom: 8 }}>
          <Checkbox
            checked={hideInTabBar}
            onChange={(e) => setHideInTabBar(e.target.checked)}
          >
            Hide from tab bar
          </Checkbox>
        </div>
        <div style={{ marginBottom: 8 }}>
          <Checkbox
            checked={autoReturn}
            onChange={(e) => setAutoReturn(e.target.checked)}
          >
            Auto-return after switching to this tab
          </Checkbox>
        </div>
        {autoReturn && (
          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: token.colorText, fontSize: 13 }}>Return after</span>
            <InputNumber
              min={1}
              max={3600}
              value={autoReturnDelay}
              onChange={(v) => setAutoReturnDelay(v ?? 10)}
              size="small"
              style={{ width: 80 }}
            />
            <span style={{ color: token.colorText, fontSize: 13 }}>seconds</span>
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
