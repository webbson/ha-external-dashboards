import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Table, Button, Space, Popconfirm, Tag, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { api } from "../api.js";

interface Theme {
  id: number;
  name: string;
  usageCount: number;
  createdAt: string;
}

export function ThemeList() {
  const [data, setData] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api
      .get<Theme[]>("/api/themes")
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCopy = async (id: number) => {
    const copied = await api.post<Theme>(`/api/themes/${id}/copy`, {});
    message.success("Theme copied");
    navigate(`/themes/${copied.id}`);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/themes/${id}`);
      message.success("Theme deleted");
      load();
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : "Failed to delete theme"
      );
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/themes/new")}
        >
          New Theme
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={[
          { title: "Name", dataIndex: "name" },
          {
            title: "Usage",
            render: (_, r) => (
              <Tag>
                {r.usageCount} dashboard{r.usageCount !== 1 ? "s" : ""}
              </Tag>
            ),
          },
          {
            title: "Actions",
            render: (_, record) => (
              <Space>
                <Button
                  size="small"
                  onClick={() => navigate(`/themes/${record.id}`)}
                >
                  Edit
                </Button>
                <Button size="small" onClick={() => handleCopy(record.id)}>
                  Copy
                </Button>
                <Popconfirm
                  title="Delete this theme?"
                  onConfirm={() => handleDelete(record.id)}
                >
                  <Button
                    size="small"
                    danger
                    disabled={record.usageCount > 0}
                  >
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
