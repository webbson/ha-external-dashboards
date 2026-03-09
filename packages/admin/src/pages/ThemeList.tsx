import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Table, Button, Space, Popconfirm, Tag, Tooltip, message } from "antd";
import { PlusOutlined, EditOutlined, CopyOutlined, DeleteOutlined } from "@ant-design/icons";
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
                <Tooltip title="Edit">
                  <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/themes/${record.id}`)} />
                </Tooltip>
                <Tooltip title="Copy">
                  <Button size="small" icon={<CopyOutlined />} onClick={() => handleCopy(record.id)} />
                </Tooltip>
                <Popconfirm
                  title="Delete this theme?"
                  onConfirm={() => handleDelete(record.id)}
                >
                  <Tooltip title="Delete">
                    <Button size="small" danger icon={<DeleteOutlined />} disabled={record.usageCount > 0} />
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
