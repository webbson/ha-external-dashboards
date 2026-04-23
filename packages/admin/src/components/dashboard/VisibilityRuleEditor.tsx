import { Radio, Select, Input, Space } from "antd";
import type { VisibilityRule, VisibilityOperator } from "@ha-external-dashboards/shared";
import { EntitySelector } from "../selectors/EntitySelector.js";

const OPERATORS: { value: VisibilityOperator; label: string }[] = [
  { value: "isTruthy", label: "is true / has value" },
  { value: "isFalsy", label: "is false / empty" },
  { value: "eq", label: "=" },
  { value: "neq", label: "\u2260" },
  { value: "gt", label: ">" },
  { value: "lt", label: "<" },
  { value: "gte", label: "\u2265" },
  { value: "lte", label: "\u2264" },
];

export function VisibilityRuleEditor({
  value,
  onChange,
}: {
  value: VisibilityRule;
  onChange: (r: VisibilityRule) => void;
}) {
  const source = value.attribute !== undefined ? "attribute" : "state";
  const needsValue = value.operator !== "isTruthy" && value.operator !== "isFalsy";

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <EntitySelector
        mode="single"
        value={value.entityId}
        onChange={(id) => onChange({ ...value, entityId: typeof id === "string" ? id : "" })}
      />
      <Radio.Group
        value={source}
        onChange={(e) =>
          onChange({
            ...value,
            attribute: e.target.value === "attribute" ? (value.attribute ?? "") : undefined,
          })
        }
      >
        <Radio value="state">State</Radio>
        <Radio value="attribute">Attribute</Radio>
      </Radio.Group>
      {source === "attribute" && (
        <Input
          placeholder="Attribute name"
          value={value.attribute ?? ""}
          onChange={(e) => onChange({ ...value, attribute: e.target.value })}
        />
      )}
      <Select
        style={{ width: 220 }}
        value={value.operator}
        onChange={(op) => onChange({ ...value, operator: op as VisibilityOperator })}
        options={OPERATORS}
      />
      {needsValue && (
        <Input
          placeholder="Value"
          value={value.value ?? ""}
          onChange={(e) => onChange({ ...value, value: e.target.value })}
        />
      )}
    </Space>
  );
}
