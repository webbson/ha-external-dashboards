import { useEffect, useState } from "react";
import { Card, Collapse, Descriptions, Empty, Tag } from "antd";
import { api } from "../../api.js";

interface HAEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

interface EntityDataViewerProps {
  entityBindings: Record<string, string | string[]>;
}

export function EntityDataViewer({ entityBindings }: EntityDataViewerProps) {
  const [entities, setEntities] = useState<Record<string, HAEntity>>({});

  // Collect all unique entity IDs from bindings
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

  return (
    <Card title="Entity Data" size="small" style={{ marginTop: 16 }}>
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
          const attrs = entity.attributes;
          return {
            key: id,
            label: (
              <span>
                {id} <Tag color="blue" style={{ marginLeft: 8 }}>state: {entity.state}</Tag>
              </span>
            ),
            children: (
              <div>
                <div style={{ marginBottom: 8, fontSize: 12, color: "#999" }}>
                  Use in templates: <code>{"{{state \"" + id + "\"}}"}</code> or <code>{"{{attr \"" + id + "\" \"attribute_name\"}}"}</code>
                </div>
                <Descriptions
                  size="small"
                  column={1}
                  bordered
                  items={Object.entries(attrs).map(([key, value]) => ({
                    key,
                    label: (
                      <code style={{ fontSize: 12 }}>{key}</code>
                    ),
                    children: (
                      <span style={{ fontSize: 12, wordBreak: "break-all" }}>
                        {typeof value === "object" ? JSON.stringify(value) : String(value ?? "")}
                      </span>
                    ),
                  }))}
                />
              </div>
            ),
          };
        })}
      />
    </Card>
  );
}
