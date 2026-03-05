import { type ReactNode } from "react";

interface VisibilityRule {
  entityId: string;
  attribute?: string;
  operator: string;
  value: string;
}

interface EntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

interface VisibilityGateProps {
  rules: VisibilityRule[];
  entities: Record<string, EntityState>;
  children: ReactNode;
}

function evaluate(
  rule: VisibilityRule,
  entities: Record<string, EntityState>
): boolean {
  const entity = entities[rule.entityId];
  if (!entity) return false;

  const actual = rule.attribute
    ? String(entity.attributes[rule.attribute] ?? "")
    : entity.state;
  const expected = rule.value;

  switch (rule.operator) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "gt":
      return parseFloat(actual) > parseFloat(expected);
    case "lt":
      return parseFloat(actual) < parseFloat(expected);
    case "gte":
      return parseFloat(actual) >= parseFloat(expected);
    case "lte":
      return parseFloat(actual) <= parseFloat(expected);
    default:
      return true;
  }
}

export function VisibilityGate({
  rules,
  entities,
  children,
}: VisibilityGateProps) {
  if (rules.length === 0) return <>{children}</>;
  const visible = rules.every((r) => evaluate(r, entities));
  if (!visible) return null;
  return <>{children}</>;
}
