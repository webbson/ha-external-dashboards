import { type ReactNode } from "react";
import type { VisibilityRule } from "@ha-external-dashboards/shared";

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

const FALSY_STRINGS = new Set(["", "0", "false", "off", "no", "unavailable", "unknown"]);

function isFalsyValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "boolean") return !v;
  if (typeof v === "number") return v === 0;
  if (typeof v === "string") return FALSY_STRINGS.has(v.toLowerCase());
  return false;
}

function evaluate(
  rule: VisibilityRule,
  entities: Record<string, EntityState>
): boolean {
  const entity = entities[rule.entityId];
  if (!entity) return false;

  const source = rule.attribute && rule.attribute !== ""
    ? entity.attributes[rule.attribute]
    : entity.state;
  const actual = typeof source === "string" ? source : String(source ?? "");
  const expected = rule.value ?? "";

  switch (rule.operator) {
    case "isTruthy":
      return !isFalsyValue(source);
    case "isFalsy":
      return isFalsyValue(source);
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
