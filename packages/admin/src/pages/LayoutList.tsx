import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Table, Button, Space, Popconfirm, Tag, Tooltip, message } from "antd";
import { PlusOutlined, UploadOutlined, DownloadOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
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

  const handleExport = async (id: number, name: string) => {
    try {
      const res = await fetch(`/api/layouts/${id}/export`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        await api.post("/api/layouts/import", json);
        message.success("Layout imported");
        load();
      } catch (err) {
        message.error((err as Error).message || "Invalid layout file");
      }
    };
    input.click();
  };

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
        <Button icon={<UploadOutlined />} onClick={handleImport}>
          Import Layout
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        pagination={{ pageSize: 20 }}
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
                <Tooltip title="Edit">
                  <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/layouts/${record.id}`)} />
                </Tooltip>
                <Tooltip title="Export">
                  <Button size="small" icon={<DownloadOutlined />} onClick={() => handleExport(record.id, record.name)} />
                </Tooltip>
                <Popconfirm
                  title="Delete this layout?"
                  onConfirm={() => handleDelete(record.id)}
                  disabled={record.usageCount > 0}
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
