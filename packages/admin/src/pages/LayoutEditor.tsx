import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Form, Input, Button, Card, Space, Typography, message } from "antd";
import { api } from "../api.js";

function parseGridAreas(gridTemplate: string): string[] {
  const matches = gridTemplate.match(/["'][^"']+["']/g) ?? [];
  const areas = new Set<string>();
  for (const m of matches) {
    const names = m.slice(1, -1).trim().split(/\s+/);
    for (const name of names) {
      if (name !== ".") areas.add(name);
    }
  }
  return [...areas];
}

const { Text } = Typography;

interface Region {
  id: string;
  label: string;
}

interface LayoutData {
  name: string;
  structure: {
    gridTemplate: string;
    regions: Region[];
  };
}

function GridPreview({
  gridTemplate,
  regions,
}: {
  gridTemplate: string;
  regions: Region[];
}) {
  if (!gridTemplate || regions.length === 0) {
    return (
      <div
        style={{
          minHeight: 120,
          background: "#1a1a2e",
          borderRadius: 8,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          fontSize: 13,
        }}
      >
        Enter a grid template to see the preview
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplate,
        gap: 4,
        minHeight: 200,
        background: "#1a1a2e",
        padding: 8,
        borderRadius: 8,
        marginBottom: 16,
      }}
    >
      {regions.map((r) => (
        <div
          key={r.id}
          style={{
            gridArea: r.id,
            background: "rgba(255,255,255,0.08)",
            border: "1px dashed rgba(255,255,255,0.2)",
            borderRadius: 4,
            padding: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#aaa",
            fontSize: 12,
          }}
        >
          {r.label || r.id}
        </div>
      ))}
    </div>
  );
}

export function LayoutEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm<LayoutData>();
  const [loading, setLoading] = useState(false);
  const [regionLabels, setRegionLabels] = useState<Record<string, string>>({});
  const isNew = !id;

  const gridTemplate =
    Form.useWatch(["structure", "gridTemplate"], form) ?? "";

  const detectedAreas = useMemo(
    () => parseGridAreas(gridTemplate),
    [gridTemplate]
  );

  const regions: Region[] = useMemo(
    () =>
      detectedAreas.map((area) => ({
        id: area,
        label: regionLabels[area] ?? area,
      })),
    [detectedAreas, regionLabels]
  );

  useEffect(() => {
    if (!isNew) {
      setLoading(true);
      api
        .get<LayoutData>(`/api/layouts/${id}`)
        .then((data) => {
          form.setFieldsValue({
            name: data.name,
            structure: { gridTemplate: data.structure.gridTemplate },
          });
          const labels: Record<string, string> = {};
          for (const r of data.structure.regions) {
            labels[r.id] = r.label;
          }
          setRegionLabels(labels);
        })
        .finally(() => setLoading(false));
    }
  }, [id, isNew, form]);

  const onFinish = async (values: LayoutData) => {
    setLoading(true);
    try {
      const payload = {
        name: values.name,
        structure: {
          gridTemplate: values.structure.gridTemplate,
          regions,
        },
      };
      if (isNew) {
        await api.post("/api/layouts", payload);
        message.success("Layout created");
      } else {
        await api.put(`/api/layouts/${id}`, payload);
        message.success("Layout updated");
      }
      navigate("/layouts");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={isNew ? "New Layout" : "Edit Layout"} loading={loading}>
      <GridPreview gridTemplate={gridTemplate} regions={regions} />

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          structure: {
            gridTemplate:
              '"header header" auto\n"left right" 1fr\n"footer footer" auto / 1fr 1fr',
          },
        }}
      >
        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name={["structure", "gridTemplate"]}
          label="CSS Grid Template"
          rules={[{ required: true }]}
          extra={
            <Text type="secondary" style={{ fontSize: 12 }}>
              Uses the CSS{" "}
              <code>grid-template</code> shorthand. Define rows with quoted
              area names, row heights, and column widths after <code>/</code>.
              Use <code>.</code> for empty cells.
              <br />
              Example: <code>"header header" 60px "nav main" 1fr / 200px 1fr</code>
            </Text>
          }
        >
          <Input.TextArea rows={4} style={{ fontFamily: "monospace" }} />
        </Form.Item>

        {detectedAreas.length > 0 && (
          <Form.Item label="Detected Regions">
            <Space direction="vertical" style={{ width: "100%" }}>
              {detectedAreas.map((area) => (
                <Space key={area} align="center">
                  <Text code style={{ minWidth: 80, display: "inline-block" }}>
                    {area}
                  </Text>
                  <Input
                    placeholder="Label (optional)"
                    value={regionLabels[area] ?? ""}
                    onChange={(e) =>
                      setRegionLabels((prev) => ({
                        ...prev,
                        [area]: e.target.value,
                      }))
                    }
                    style={{ width: 200 }}
                    size="small"
                  />
                </Space>
              ))}
            </Space>
          </Form.Item>
        )}

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isNew ? "Create" : "Save"}
            </Button>
            <Button onClick={() => navigate("/layouts")}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
