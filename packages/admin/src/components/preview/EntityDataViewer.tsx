import { useEffect, useState } from "react";
import { Card, Collapse, Empty, Tag, message } from "antd";
import Icon from "@mdi/react";
import { api } from "../../api.js";
import { getIconPath } from "../selectors/MdiIconSelector.js";

interface HAEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

interface EntityDataViewerProps {
  entityBindings: Record<string, string | string[]>;
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

const snippetStyle: React.CSSProperties = {
  cursor: "pointer",
  padding: "2px 6px",
  borderRadius: 3,
  fontSize: 12,
  fontFamily: "monospace",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  transition: "background 0.15s",
};

export function EntityDataViewer({ entityBindings, compact }: EntityDataViewerProps) {
  const [entities, setEntities] = useState<Record<string, HAEntity>>({});

  const entityIds = Array.from(
    new Set(
      Object.values(entityBindings)
        .flat()
        .filter(Boolean)
    )
  );

  useEffect(() => {
    if (entityIds.length === 0) {
      setEntities({});
      return;
    }
    Promise.all(
      entityIds.map((id) =>
        api
          .get<HAEntity>(`/api/ha/entities/${id}`)
          .then((e) => [id, e] as const)
          .catch(() => null)
      )
    ).then((results) => {
      const map: Record<string, HAEntity> = {};
      for (const r of results) {
        if (r) map[r[0]] = r[1];
      }
      setEntities(map);
    });
  }, [entityIds.join(",")]);

  if (entityIds.length === 0) return null;

  const collapseContent = (
    <>
      <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
        Click any snippet to copy to clipboard
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
          const paramName = findParamName(entityBindings, id);
          const stateSnippet = paramName
            ? `{{state (param "${paramName}")}}`
            : `{{state "${id}"}}`;
          const attrSnippet = (attr: string) =>
            paramName
              ? `{{attr (param "${paramName}") "${attr}"}}`
              : `{{attr "${id}" "${attr}"}}`;

          return {
            key: id,
            label: (
              <span>
                {id}{" "}
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  {entity.state}
                </Tag>
              </span>
            ),
            children: (
              <div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <td style={{ padding: "6px 8px", fontWeight: 500, fontSize: 12, width: 140 }}>
                        state
                      </td>
                      <td style={{ padding: "6px 8px", fontSize: 12, color: "#aaa" }}>
                        {entity.state}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>
                        <span
                          style={snippetStyle}
                          onClick={(e) => {
                            e.stopPropagation();
                            copySnippet(stateSnippet);
                          }}
                          onMouseEnter={(e) => {
                            (e.target as HTMLElement).style.background = "rgba(255,255,255,0.12)";
                          }}
                          onMouseLeave={(e) => {
                            (e.target as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                          }}
                        >
                          {stateSnippet}
                        </span>
                      </td>
                    </tr>
                    {Object.entries(entity.attributes).map(([key, value]) => {
                      const strValue = typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value ?? "");
                      const isIconAttr = key === "icon" && typeof value === "string" && value.startsWith("mdi:");
                      const iconPath = isIconAttr ? getIconPath(value as string) : undefined;
                      const snippet = isIconAttr
                        ? (paramName
                          ? `{{mdiIcon (attr (param "${paramName}") "icon")}}`
                          : `{{mdiIcon (attr "${id}" "icon")}}`)
                        : attrSnippet(key);
                      return (
                        <tr
                          key={key}
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
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
                          <td style={{ padding: "6px 8px", textAlign: "right" }}>
                            <span
                              style={snippetStyle}
                              onClick={(e) => {
                                e.stopPropagation();
                                copySnippet(snippet);
                              }}
                              onMouseEnter={(e) => {
                                (e.target as HTMLElement).style.background = "rgba(255,255,255,0.12)";
                              }}
                              onMouseLeave={(e) => {
                                (e.target as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                              }}
                            >
                              {snippet}
                            </span>
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
