import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Table, Button, Space, Popconfirm, Tag, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { api } from "../api.js";

interface Component {
  id: number;
  name: string;
  isContainer: boolean;
  isPrebuilt: boolean;
  createdAt: string;
}

export function ComponentList() {
  const [data, setData] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api
      .get<Component[]>("/api/components")
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCopy = async (id: number) => {
    const copied = await api.post<Component>(`/api/components/${id}/copy`, {});
    message.success("Component copied");
    navigate(`/components/${copied.id}`);
  };

  const handleDelete = async (id: number) => {
    await api.delete(`/api/components/${id}`);
    message.success("Component deleted");
    load();
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/components/new")}
        >
          New Component
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data.filter((c) => !(c.isContainer && c.isPrebuilt))}
        columns={[
          { title: "Name", dataIndex: "name" },
          {
            title: "Type",
            render: (_, r) =>
              r.isContainer ? (
                <Tag color="purple">Container</Tag>
              ) : (
                <Tag>Standard</Tag>
              ),
          },
          {
            title: "Source",
            render: (_, r) =>
              r.isPrebuilt ? (
                <Tag color="cyan">Prebuilt</Tag>
              ) : (
                <Tag>Custom</Tag>
              ),
          },
          {
            title: "Actions",
            render: (_, record) => (
              <Space>
                <Button size="small" onClick={() => navigate(`/components/${record.id}`)}>
                  Edit
                </Button>
                <Button size="small" onClick={() => handleCopy(record.id)}>
                  Copy
                </Button>
                <Popconfirm
                  title="Delete this component?"
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
