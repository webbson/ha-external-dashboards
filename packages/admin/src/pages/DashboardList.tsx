import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Table, Button, Space, Popconfirm, Tag, Tooltip, message } from "antd";
import { PlusOutlined, LinkOutlined } from "@ant-design/icons";
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
              <Tag color={mode === "public" ? "green" : "blue"}>{mode}</Tag>
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
                      ? undefined
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
                  >
                    Open
                  </Button>
                </Tooltip>
                <Button size="small" onClick={() => navigate(`/dashboards/${record.id}`)}>
                  Edit
                </Button>
                <Popconfirm
                  title="Delete this dashboard?"
                  onConfirm={() => handleDelete(record.id)}
                >
                  <Button size="small" danger>
                    Delete
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
    </>
  );
}
