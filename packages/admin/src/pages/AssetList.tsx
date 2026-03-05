import { useEffect, useState } from "react";
import { Table, Button, Space, Popconfirm, Upload, Image, Typography, message } from "antd";
import { UploadOutlined, CopyOutlined } from "@ant-design/icons";
import { api } from "../api.js";

const { Text } = Typography;

interface Asset {
  id: number;
  name: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

export function AssetList() {
  const [data, setData] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get<Asset[]>("/api/assets")
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: number) => {
    await api.delete(`/api/assets/${id}`);
    message.success("Asset deleted");
    load();
  };

  const handleUpload = async (file: File) => {
    await api.upload("/api/assets/upload", file);
    message.success("Asset uploaded");
    load();
    return false;
  };

  const copyPath = (fileName: string) => {
    navigator.clipboard.writeText(`/assets/${fileName}`);
    message.success("Path copied to clipboard");
  };

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
      </Space>
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
            title: "Actions",
            render: (_, record) => (
              <Space>
                <Popconfirm
                  title="Delete this asset?"
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
