import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Form, Input, Button, Card, Space, message } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { api } from "../api.js";
import { StandardVariablesForm } from "../components/dashboard/StandardVariablesForm.js";
import type { StandardVariables } from "@ha-external-dashboards/shared";

interface Theme {
  id?: number;
  name: string;
  standardVariables: Partial<StandardVariables>;
  globalStyles: Record<string, string>;
}

export function ThemeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm<{ name: string }>();
  const [loading, setLoading] = useState(false);
  const [standardVariables, setStandardVariables] = useState<
    Partial<StandardVariables>
  >({});
  const [globalStyleEntries, setGlobalStyleEntries] = useState<
    { key: string; value: string }[]
  >([]);
  const isNew = !id;

  useEffect(() => {
    if (!isNew) {
      setLoading(true);
      api
        .get<Theme>(`/api/themes/${id}`)
        .then((data) => {
          form.setFieldsValue({ name: data.name });
          setStandardVariables(data.standardVariables ?? {});
          const gs = data.globalStyles ?? {};
          setGlobalStyleEntries(
            Object.entries(gs).map(([key, value]) => ({ key, value }))
          );
        })
        .finally(() => setLoading(false));
    }
  }, [id, isNew, form]);

  const onFinish = async (values: { name: string }) => {
    setLoading(true);
    try {
      const globalStyles: Record<string, string> = {};
      for (const e of globalStyleEntries) {
        if (e.key) globalStyles[e.key] = e.value;
      }
      const payload = {
        name: values.name,
        standardVariables,
        globalStyles,
      };

      if (isNew) {
        await api.post("/api/themes", payload);
        message.success("Theme created");
      } else {
        await api.put(`/api/themes/${id}`, payload);
        message.success("Theme updated");
      }
      navigate("/themes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={isNew ? "New Theme" : "Edit Theme"} loading={loading}>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <div style={{ marginBottom: 24 }}>
          <StandardVariablesForm
            value={standardVariables}
            onChange={setStandardVariables}
          />
        </div>

        <div
          style={{
            borderTop: "1px solid #303030",
            paddingTop: 16,
            marginBottom: 24,
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: 12 }}>
            Custom Variables
          </div>
          {globalStyleEntries.map((entry, i) => (
            <Space key={i} style={{ display: "flex", marginBottom: 8 }}>
              <Input
                placeholder="Variable name"
                value={entry.key}
                onChange={(e) => {
                  const next = [...globalStyleEntries];
                  next[i] = { ...next[i], key: e.target.value };
                  setGlobalStyleEntries(next);
                }}
                style={{ width: 200 }}
              />
              <Input
                placeholder="Value"
                value={entry.value}
                onChange={(e) => {
                  const next = [...globalStyleEntries];
                  next[i] = { ...next[i], value: e.target.value };
                  setGlobalStyleEntries(next);
                }}
                style={{ width: 200 }}
              />
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() =>
                  setGlobalStyleEntries(
                    globalStyleEntries.filter((_, j) => j !== i)
                  )
                }
              />
            </Space>
          ))}
          <Button
            icon={<PlusOutlined />}
            onClick={() =>
              setGlobalStyleEntries([
                ...globalStyleEntries,
                { key: "", value: "" },
              ])
            }
          >
            Add Style Variable
          </Button>
        </div>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isNew ? "Create" : "Save"}
            </Button>
            <Button onClick={() => navigate("/themes")}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
