import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Table, Button, Space, Popconfirm, Tag, Tooltip, message } from "antd";
import { PlusOutlined, DownloadOutlined, UploadOutlined, EditOutlined, CopyOutlined, DeleteOutlined } from "@ant-design/icons";
import { api } from "../api.js";

interface Component {
  id: number;
  name: string;
  isContainer: boolean;
  isPrebuilt: boolean;
  usageCount: number;
  createdAt: string;
}

export function ComponentList() {
  const [data, setData] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [devMode, setDevMode] = useState(false);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api
      .get<Component[]>("/api/components")
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api
      .get<{ devMode: boolean }>("/api/settings")
      .then((s) => setDevMode(s.devMode));
  }, []);

  const handleCopy = async (id: number) => {
    const copied = await api.post<Component>(`/api/components/${id}/copy`, {});
    message.success("Component copied");
    navigate(`/components/${copied.id}`);
  };

  const handleExport = async (id: number, name: string) => {
    try {
      const res = await fetch(`/api/components/${id}/export`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success("Component exported");
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
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          message.error("Invalid file: not valid JSON");
          return;
        }
        const created = await api.post<Component>("/api/components/import", parsed);
        message.success(`Component imported: ${created.name}`);
        load();
      } catch (err) {
        message.error((err as Error).message);
      }
    };
    input.click();
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/components/${id}`);
      message.success("Component deleted");
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
          onClick={() => navigate("/components/new")}
        >
          New Component
        </Button>
        <Button icon={<UploadOutlined />} onClick={handleImport}>
          Import Component
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
            title: "Usage",
            dataIndex: "usageCount",
            render: (v: number) => (
              <Tag>{v} instance{v !== 1 ? "s" : ""}</Tag>
            ),
          },
          {
            title: "Actions",
            render: (_, record) => (
              <Space>
                {(!record.isPrebuilt || devMode) && (
                  <Tooltip title="Edit">
                    <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/components/${record.id}`)} />
                  </Tooltip>
                )}
                <Tooltip title="Copy">
                  <Button size="small" icon={<CopyOutlined />} onClick={() => handleCopy(record.id)} />
                </Tooltip>
                {!record.isPrebuilt && (
                  <Tooltip title="Export">
                    <Button size="small" icon={<DownloadOutlined />} onClick={() => handleExport(record.id, record.name)} />
                  </Tooltip>
                )}
                {!record.isPrebuilt && (
                  <Popconfirm
                    title="Delete this component?"
                    onConfirm={() => handleDelete(record.id)}
                    disabled={record.usageCount > 0}
                  >
                    <Tooltip title="Delete">
                      <Button size="small" danger icon={<DeleteOutlined />} disabled={record.usageCount > 0} />
                    </Tooltip>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />
    </>
  );
}
