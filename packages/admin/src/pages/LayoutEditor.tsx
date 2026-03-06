import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Form, Input, Button, Card, Checkbox, Space, Typography, Select, Table, Tooltip, message } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
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
  applyChromeTo?: "components" | "region";
  flexDirection?: "column" | "row";
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  alignItems?: "stretch" | "flex-start" | "center" | "flex-end";
  flexGrow?: boolean;
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
          {r.id}
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
  const [regionSettings, setRegionSettings] = useState<Record<string, Omit<Region, "id">>>({});
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
        ...regionSettings[area],
      })),
    [detectedAreas, regionSettings]
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
          const settings: Record<string, Omit<Region, "id">> = {};
          for (const r of data.structure.regions) {
            settings[r.id] = {
              applyChromeTo: (r as any).applyChromeTo,
              flexDirection: r.flexDirection,
              justifyContent: r.justifyContent,
              alignItems: r.alignItems,
              flexGrow: r.flexGrow,
            };
          }
          setRegionSettings(settings);
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
            <Table<Region>
              size="small"
              pagination={false}
              dataSource={regions}
              rowKey="id"
              columns={[
                {
                  title: "Region",
                  dataIndex: "id",
                  width: 100,
                  render: (id: string) => (
                    <Typography.Text code>{id}</Typography.Text>
                  ),
                },
                {
                  title: (
                    <Space size={4}>
                      Styling
                      <Tooltip title="Whether the theme's background, border, and padding wraps each component individually or the entire region as one block">
                        <InfoCircleOutlined style={{ cursor: "help" }} />
                      </Tooltip>
                    </Space>
                  ),
                  dataIndex: "applyChromeTo",
                  width: 160,
                  render: (_: unknown, record: Region) => (
                    <Select
                      size="small"
                      style={{ width: "100%" }}
                      value={regionSettings[record.id]?.applyChromeTo ?? "components"}
                      onChange={(val) =>
                        setRegionSettings((prev) => ({
                          ...prev,
                          [record.id]: { ...prev[record.id], applyChromeTo: val },
                        }))
                      }
                      options={[
                        { label: "Each component", value: "components" },
                        { label: "Whole region", value: "region" },
                      ]}
                    />
                  ),
                },
                {
                  title: (
                    <Space size={4}>
                      Direction
                      <Tooltip title="Stack components vertically (column) or horizontally (row) within this region">
                        <InfoCircleOutlined style={{ cursor: "help" }} />
                      </Tooltip>
                    </Space>
                  ),
                  dataIndex: "flexDirection",
                  width: 130,
                  render: (_: unknown, record: Region) => (
                    <Select
                      size="small"
                      style={{ width: "100%" }}
                      value={regionSettings[record.id]?.flexDirection ?? "column"}
                      onChange={(val) =>
                        setRegionSettings((prev) => ({
                          ...prev,
                          [record.id]: { ...prev[record.id], flexDirection: val },
                        }))
                      }
                      options={[
                        { label: "Column \u2193", value: "column" },
                        { label: "Row \u2192", value: "row" },
                      ]}
                    />
                  ),
                },
                {
                  title: (
                    <Space size={4}>
                      Justify
                      <Tooltip title="Controls spacing along the main axis (e.g. how components are distributed within the region)">
                        <InfoCircleOutlined style={{ cursor: "help" }} />
                      </Tooltip>
                    </Space>
                  ),
                  dataIndex: "justifyContent",
                  width: 150,
                  render: (_: unknown, record: Region) => (
                    <Select
                      size="small"
                      style={{ width: "100%" }}
                      placeholder="—"
                      value={regionSettings[record.id]?.justifyContent}
                      allowClear
                      onChange={(val) =>
                        setRegionSettings((prev) => ({
                          ...prev,
                          [record.id]: { ...prev[record.id], justifyContent: val },
                        }))
                      }
                      options={[
                        { label: "Start", value: "flex-start" },
                        { label: "Center", value: "center" },
                        { label: "End", value: "flex-end" },
                        { label: "Space Between", value: "space-between" },
                        { label: "Space Around", value: "space-around" },
                        { label: "Space Evenly", value: "space-evenly" },
                      ]}
                    />
                  ),
                },
                {
                  title: (
                    <Space size={4}>
                      Align
                      <Tooltip title="Controls alignment on the cross axis (e.g. stretch components to fill width, or center them)">
                        <InfoCircleOutlined style={{ cursor: "help" }} />
                      </Tooltip>
                    </Space>
                  ),
                  dataIndex: "alignItems",
                  width: 120,
                  render: (_: unknown, record: Region) => (
                    <Select
                      size="small"
                      style={{ width: "100%" }}
                      placeholder="—"
                      value={regionSettings[record.id]?.alignItems}
                      allowClear
                      onChange={(val) =>
                        setRegionSettings((prev) => ({
                          ...prev,
                          [record.id]: { ...prev[record.id], alignItems: val },
                        }))
                      }
                      options={[
                        { label: "Stretch", value: "stretch" },
                        { label: "Start", value: "flex-start" },
                        { label: "Center", value: "center" },
                        { label: "End", value: "flex-end" },
                      ]}
                    />
                  ),
                },
                {
                  title: (
                    <Space size={4}>
                      Fill
                      <Tooltip title="Components will grow to fill the available space in this region">
                        <InfoCircleOutlined style={{ cursor: "help" }} />
                      </Tooltip>
                    </Space>
                  ),
                  dataIndex: "flexGrow",
                  width: 80,
                  align: "center" as const,
                  render: (_: unknown, record: Region) => (
                    <Checkbox
                      checked={regionSettings[record.id]?.flexGrow ?? false}
                      onChange={(e) =>
                        setRegionSettings((prev) => ({
                          ...prev,
                          [record.id]: { ...prev[record.id], flexGrow: e.target.checked },
                        }))
                      }
                    />
                  ),
                },
              ]}
            />
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
