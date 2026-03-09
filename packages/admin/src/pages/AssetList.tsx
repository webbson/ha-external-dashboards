import { useEffect, useState, useCallback } from "react";
import {
  Table,
  Button,
  Space,
  Popconfirm,
  Upload,
  Image,
  Typography,
  Breadcrumb,
  Select,
  Input,
  message,
  Tooltip,
} from "antd";
import { UploadOutlined, FolderOutlined, FolderAddOutlined, DeleteOutlined } from "@ant-design/icons";
import { api } from "../api.js";

const { Text } = Typography;

interface Asset {
  id: number;
  name: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  folder: string | null;
  createdAt: string;
}

export function AssetList() {
  const [data, setData] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folders, setFolders] = useState<string[]>([]);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const query =
      currentFolder !== null ? `/api/assets?folder=${encodeURIComponent(currentFolder)}` : "/api/assets";
    Promise.all([
      api.get<Asset[]>(query),
      api.get<string[]>("/api/assets/folders"),
    ])
      .then(([assetRows, folderList]) => {
        setData(assetRows);
        setFolders(folderList);
      })
      .finally(() => setLoading(false));
  }, [currentFolder]);

  useEffect(load, [load]);

  const handleDelete = async (id: number) => {
    await api.delete(`/api/assets/${id}`);
    message.success("Asset deleted");
    load();
  };

  const handleUpload = async (file: File) => {
    await api.upload(
      "/api/assets/upload",
      file,
      currentFolder ? { folder: currentFolder } : undefined,
    );
    message.success("Asset uploaded");
    load();
    return false;
  };

  const handleMove = async (id: number, folder: string | null) => {
    await api.put(`/api/assets/${id}`, { folder });
    message.success("Asset moved");
    load();
  };

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    setCurrentFolder(name);
    setShowNewFolder(false);
    setNewFolderName("");
  };

  const breadcrumbItems = [
    {
      title: (
        <a onClick={() => setCurrentFolder(null)}>All Assets</a>
      ),
    },
    ...(currentFolder
      ? [{ title: currentFolder }]
      : []),
  ];

  const folderOptions = [
    { label: "Root (no folder)", value: "__root__" },
    ...folders.map((f) => ({ label: f, value: f })),
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Upload
          showUploadList={false}
          beforeUpload={(file) => {
            handleUpload(file as unknown as File);
            return false;
          }}
        >
          <Button icon={<UploadOutlined />} type="primary">
            Upload Asset
          </Button>
        </Upload>
        <Button
          icon={<FolderAddOutlined />}
          onClick={() => setShowNewFolder(true)}
        >
          New Folder
        </Button>
      </Space>

      {showNewFolder && (
        <Space style={{ marginBottom: 16, display: "flex" }}>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onPressEnter={handleCreateFolder}
            style={{ width: 200 }}
          />
          <Button type="primary" onClick={handleCreateFolder}>
            Create
          </Button>
          <Button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}>
            Cancel
          </Button>
        </Space>
      )}

      <Breadcrumb style={{ marginBottom: 16 }} items={breadcrumbItems} />

      {currentFolder === null && folders.length > 0 && (
        <Space wrap style={{ marginBottom: 16 }}>
          {folders.map((f) => (
            <Button
              key={f}
              icon={<FolderOutlined />}
              onClick={() => setCurrentFolder(f)}
            >
              {f}
            </Button>
          ))}
        </Space>
      )}

      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={[
          {
            title: "Preview",
            width: 60,
            render: (_, record) =>
              record.mimeType.startsWith("image/") ? (
                <Image
                  src={`/api/assets/${record.id}/file`}
                  width={40}
                  height={40}
                  style={{ objectFit: "cover", borderRadius: 4 }}
                  fallback="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>"
                />
              ) : null,
          },
          { title: "Name", dataIndex: "name" },
          { title: "Type", dataIndex: "mimeType" },
          {
            title: "Size",
            dataIndex: "fileSize",
            render: (v: number) =>
              v > 1048576
                ? `${(v / 1048576).toFixed(1)} MB`
                : `${(v / 1024).toFixed(1)} KB`,
          },
          {
            title: "Path",
            render: (_, record) => (
              <Text code copyable={{ text: `/assets/${record.fileName}` }}>
                /assets/{record.fileName}
              </Text>
            ),
          },
          {
            title: "Folder",
            dataIndex: "folder",
            render: (v: string | null) => v ?? "—",
          },
          {
            title: "Actions",
            render: (_, record) => (
              <Space>
                <Select
                  placeholder="Move to..."
                  size="small"
                  style={{ width: 140 }}
                  value={undefined}
                  options={folderOptions}
                  onChange={(val: string) =>
                    handleMove(record.id, val === "__root__" ? null : val)
                  }
                />
                <Popconfirm
                  title="Delete this asset?"
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
