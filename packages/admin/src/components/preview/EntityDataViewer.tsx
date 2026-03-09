import { useEffect, useState } from "react";
import { Card, Collapse, Empty, Tag, message } from "antd";
import Icon from "@mdi/react";
import { api } from "../../api.js";
import { getIconPath } from "../selectors/MdiIconSelector.js";
import type {
  EntitySelectorDef,
  GlobAttributeFilter,
  GlobStateFilter,
} from "@ha-external-dashboards/shared";

interface HAEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

interface EntityFilterEntry {
  attributeFilters?: GlobAttributeFilter[];
  stateFilters?: GlobStateFilter[];
}

interface EntityDataViewerProps {
  entityBindings: Record<string, string | string[]>;
  entitySelectorDefs?: EntitySelectorDef[];
  entityFilters?: Record<string, EntityFilterEntry>;
  compact?: boolean;
}

function copySnippet(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    message.success({ content: `Copied: ${text}`, duration: 1.5 });
  });
}

// Find the binding param name for a given entity_id
function findParamName(
  entityBindings: Record<string, string | string[]>,
  entityId: string
): string | null {
  for (const [name, value] of Object.entries(entityBindings)) {
    if (value === entityId || (Array.isArray(value) && value.includes(entityId))) {
      return name;
    }
  }
  return null;
}

function isGlobPattern(value: string): boolean {
  return value.includes("*") || value.includes("?");
}

function matchesOperator(actual: string, operator: string, expected: string): boolean {
  switch (operator) {
    case "eq": return actual === expected;
    case "neq": return actual !== expected;
    case "contains": return actual.includes(expected);
    case "startsWith": return actual.startsWith(expected);
    default: return true;
  }
}

function passesFilters(
  entity: HAEntity,
  attrFilters?: GlobAttributeFilter[],
  stateFilters?: GlobStateFilter[]
): boolean {
  if (attrFilters?.length) {
    for (const f of attrFilters) {
      const val = String(entity.attributes[f.attribute] ?? "");
      if (!matchesOperator(val, f.operator, f.value)) return false;
    }
  }
  if (stateFilters?.length) {
    for (const f of stateFilters) {
      if (!matchesOperator(entity.state, f.operator, f.value)) return false;
    }
  }
  return true;
}

export function EntityDataViewer({ entityBindings, entitySelectorDefs, entityFilters, compact }: EntityDataViewerProps) {
  const [entities, setEntities] = useState<Record<string, HAEntity>>({});
  const [globExpandedIds, setGlobExpandedIds] = useState<Set<string>>(new Set());

  // Build a set of glob selector names for quick lookup
  const globSelectorNames = new Set(
    (entitySelectorDefs ?? [])
      .filter((def) => def.mode === "glob")
      .map((def) => def.name)
  );

  // Separate concrete entity IDs from glob patterns, tracking selector name per pattern
  const concreteIds: string[] = [];
  const globEntries: { name: string; pattern: string }[] = [];

  for (const [name, value] of Object.entries(entityBindings)) {
    if (!value) continue;
    if (globSelectorNames.has(name) && typeof value === "string" && isGlobPattern(value)) {
      globEntries.push({ name, pattern: value });
    } else {
      const ids = Array.isArray(value) ? value : [value];
      concreteIds.push(...ids.filter(Boolean));
    }
  }

  const uniqueConcreteIds = Array.from(new Set(concreteIds));
  const filterKey = entityFilters ? JSON.stringify(entityFilters) : "";
  const cacheKey = [...uniqueConcreteIds, ...globEntries.map((g) => g.pattern)].sort().join(",") + filterKey;

  useEffect(() => {
    if (uniqueConcreteIds.length === 0 && globEntries.length === 0) {
      setEntities({});
      setGlobExpandedIds(new Set());
      return;
    }

    // Expand glob patterns to real entity IDs
    const globPromises = globEntries.map((entry) =>
      api
        .get<{ matches: string[] }>(`/api/ha/glob-match?pattern=${encodeURIComponent(entry.pattern)}`)
        .then((r) => ({ name: entry.name, matches: r.matches }))
        .catch(() => ({ name: entry.name, matches: [] as string[] }))
    );

    Promise.all(globPromises).then((globResults) => {
      const expandedIds = globResults.flatMap((r) => r.matches);
      const allIds = Array.from(new Set([...uniqueConcreteIds, ...expandedIds]));

      if (allIds.length === 0) {
        setEntities({});
        setGlobExpandedIds(new Set());
        return;
      }

      const allGlobIds = new Set(expandedIds);

      Promise.all(
        allIds.map((id) =>
          api
            .get<HAEntity>(`/api/ha/entities/${id}`)
            .then((e) => [id, e] as const)
            .catch(() => null)
        )
      ).then((results) => {
        // Build a set of glob-expanded IDs per selector name for filter application
        const globIdsBySelectorName = new Map<string, Set<string>>();
        for (const r of globResults) {
          globIdsBySelectorName.set(r.name, new Set(r.matches));
        }

        const map: Record<string, HAEntity> = {};
        for (const r of results) {
          if (!r) continue;
          const [id, entity] = r;

          // Apply filters for glob-expanded entities
          let included = false;
          if (uniqueConcreteIds.includes(id)) {
            included = true;
          }
          for (const [selectorName, ids] of globIdsBySelectorName) {
            if (!ids.has(id)) continue;
            const filters = entityFilters?.[selectorName];
            if (filters && !passesFilters(entity, filters.attributeFilters, filters.stateFilters)) {
              continue;
            }
            included = true;
          }

          if (included) map[id] = entity;
        }
        setEntities(map);
        setGlobExpandedIds(allGlobIds);
      });
    });
  }, [cacheKey]);

  const entityIds = Object.keys(entities);

  if (entityIds.length === 0 && uniqueConcreteIds.length === 0 && globEntries.length === 0) return null;

  const collapseContent = (
    <>
      <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
        Click a row to copy its Handlebars snippet
      </div>
      <Collapse
        size="small"
        items={entityIds.map((id) => {
          const entity = entities[id];
          if (!entity) {
            return {
              key: id,
              label: id,
              children: <Empty description="Entity not found" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
            };
          }
          const isGlob = globExpandedIds.has(id);
          const paramName = isGlob ? null : findParamName(entityBindings, id);
          const canCopy = paramName !== null;
          const stateSnippet = canCopy
            ? `{{state (param "${paramName}")}}`
            : null;
          const attrSnippet = (attr: string) =>
            canCopy
              ? `{{attr (param "${paramName}") "${attr}"}}`
              : null;

          const rowStyle = (hover: boolean): React.CSSProperties => ({
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            ...(canCopy
              ? { cursor: "pointer", background: hover ? "rgba(255,255,255,0.06)" : "transparent" }
              : {}),
          });

          return {
            key: id,
            label: (
              <span>
                {id}{" "}
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  {entity.state}
                </Tag>
                {isGlob && (
                  <Tag color="default" style={{ marginLeft: 4 }}>glob</Tag>
                )}
              </span>
            ),
            children: (
              <div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr
                      style={rowStyle(false)}
                      onClick={stateSnippet ? () => copySnippet(stateSnippet) : undefined}
                      onMouseEnter={canCopy ? (e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; } : undefined}
                      onMouseLeave={canCopy ? (e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; } : undefined}
                    >
                      <td style={{ padding: "6px 8px", fontWeight: 500, fontSize: 12, width: 140 }}>
                        state
                      </td>
                      <td style={{ padding: "6px 8px", fontSize: 12, color: "#aaa" }}>
                        {entity.state}
                      </td>
                    </tr>
                    {Object.entries(entity.attributes).map(([key, value]) => {
                      const strValue = typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value ?? "");
                      const isIconAttr = key === "icon" && typeof value === "string" && value.startsWith("mdi:");
                      const iconPath = isIconAttr ? getIconPath(value as string) : undefined;
                      const snippet = isIconAttr
                        ? (canCopy ? `{{mdiIcon (attr (param "${paramName}") "icon")}}` : null)
                        : attrSnippet(key);
                      return (
                        <tr
                          key={key}
                          style={rowStyle(false)}
                          onClick={snippet ? () => copySnippet(snippet) : undefined}
                          onMouseEnter={canCopy ? (e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; } : undefined}
                          onMouseLeave={canCopy ? (e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; } : undefined}
                        >
                          <td style={{ padding: "6px 8px", fontWeight: 500, fontSize: 12 }}>
                            {key}
                          </td>
                          <td style={{ padding: "6px 8px", fontSize: 12, color: "#aaa", wordBreak: "break-all" }}>
                            {iconPath && (
                              <Icon path={iconPath} size="16px" style={{ verticalAlign: "middle", marginRight: 6 }} />
                            )}
                            {strValue}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ),
          };
        })}
      />
    </>
  );

  if (compact) return collapseContent;

  return (
    <Card title="Entity Data" size="small" style={{ marginTop: 16 }}>
      {collapseContent}
    </Card>
  );
}
