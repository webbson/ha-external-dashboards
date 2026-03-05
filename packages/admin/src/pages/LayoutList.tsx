import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Table, Button, Space, Popconfirm, Tag, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { api } from "../api.js";

interface Layout {
  id: number;
  name: string;
  structure: { regions: { id: string }[] };
  usageCount: number;
  createdAt: string;
}

export function LayoutList() {
  const [data, setData] = useState<Layout[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api
      .get<Layout[]>("/api/layouts")
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/layouts/${id}`);
      message.success("Layout deleted");
      load();
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/layouts/new")}
        >
          New Layout
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={[
          { title: "Name", dataIndex: "name" },
          {
            title: "Regions",
            render: (_, r) => r.structure?.regions?.length ?? 0,
          },
          {
            title: "Usage",
            dataIndex: "usageCount",
            render: (v: number) => (
              <Tag>{v} dashboard{v !== 1 ? "s" : ""}</Tag>
            ),
          },
          {
            title: "Actions",
            render: (_, record) => (
              <Space>
                <Button size="small" onClick={() => navigate(`/layouts/${record.id}`)}>
                  Edit
                </Button>
                <Popconfirm
                  title="Delete this layout?"
                  onConfirm={() => handleDelete(record.id)}
                  disabled={record.usageCount > 0}
                >
                  <Button size="small" danger disabled={record.usageCount > 0}>
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
