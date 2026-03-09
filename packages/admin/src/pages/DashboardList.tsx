import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Table, Button, Space, Popconfirm, Tag, Tooltip, message } from "antd";
import { PlusOutlined, LinkOutlined, CopyOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { api } from "../api.js";

interface Dashboard {
  id: number;
  name: string;
  slug: string;
  accessMode: string;
  interactiveMode: boolean;
  createdAt: string;
}

export function DashboardList() {
  const [data, setData] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [externalBaseUrl, setExternalBaseUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api
      .get<Dashboard[]>("/api/dashboards")
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    api.get<{ externalBaseUrl: string | null }>("/api/settings").then((s) => {
      setExternalBaseUrl(s.externalBaseUrl);
    });
  }, []);

  const handleDelete = async (id: number) => {
    await api.delete(`/api/dashboards/${id}`);
    message.success("Dashboard deleted");
    load();
  };

  const handleCopy = async (id: number) => {
    const copied = await api.post<Dashboard>(`/api/dashboards/${id}/copy`, {});
    message.success("Dashboard copied");
    navigate(`/dashboards/${copied.id}`);
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/dashboards/new")}
        >
          New Dashboard
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={[
          { title: "Name", dataIndex: "name" },
          { title: "Slug", dataIndex: "slug" },
          {
            title: "Access",
            dataIndex: "accessMode",
            render: (mode: string) => (
              <Tag color={mode === "public" ? "green" : mode === "disabled" ? "default" : "blue"}>{mode}</Tag>
            ),
          },
          {
            title: "Interactive",
            dataIndex: "interactiveMode",
            render: (v: boolean) =>
              v ? <Tag color="orange">Yes</Tag> : <Tag>No</Tag>,
          },
          {
            title: "Actions",
            render: (_, record) => (
              <Space>
                <Tooltip
                  title={
                    externalBaseUrl
                      ? "Open"
                      : "Set EXTERNAL_BASE_URL to enable"
                  }
                >
                  <Button
                    size="small"
                    icon={<LinkOutlined />}
                    disabled={!externalBaseUrl}
                    onClick={() =>
                      window.open(
                        `${externalBaseUrl}/d/${record.slug}`,
                        "_blank"
                      )
                    }
                  />
                </Tooltip>
                <Tooltip title="Edit">
                  <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/dashboards/${record.id}`)} />
                </Tooltip>
                <Tooltip title="Copy">
                  <Button size="small" icon={<CopyOutlined />} onClick={() => handleCopy(record.id)} />
                </Tooltip>
                <Popconfirm
                  title="Delete this dashboard?"
                  onConfirm={() => handleDelete(record.id)}
                >
                  <Tooltip title="Delete">
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Tooltip>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
    </>
  );
}
