import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Table, Button, Space, Popconfirm, Tag, message } from "antd";
import { PlusOutlined, SendOutlined } from "@ant-design/icons";
import { api } from "../api.js";

interface Popup {
  id: number;
  name: string;
  content: { type: string };
  timeout: number;
  createdAt: string;
}

export function PopupList() {
  const [data, setData] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api
      .get<Popup[]>("/api/popups")
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: number) => {
    await api.delete(`/api/popups/${id}`);
    message.success("Popup deleted");
    load();
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/popups/new")}
        >
          New Popup
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={[
          { title: "Name", dataIndex: "name" },
          {
            title: "Type",
            render: (_, r) => <Tag>{r.content?.type}</Tag>,
          },
          { title: "Timeout (s)", dataIndex: "timeout" },
          {
            title: "Actions",
            render: (_, record) => (
              <Space>
                <Button
                  size="small"
                  icon={<SendOutlined />}
                  onClick={async () => {
                    await api.post("/api/trigger/popup", { popupId: record.id });
                    message.success("Popup triggered");
                  }}
                >
                  Trigger
                </Button>
                <Button size="small" onClick={() => navigate(`/popups/${record.id}`)}>
                  Edit
                </Button>
                <Popconfirm
                  title="Delete this popup?"
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
