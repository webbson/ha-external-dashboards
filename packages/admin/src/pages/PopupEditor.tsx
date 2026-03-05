import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Card,
  Space,
  Alert,
  Typography,
  message,
} from "antd";
import { SendOutlined } from "@ant-design/icons";
import { api } from "../api.js";

const { Text, Paragraph } = Typography;

interface Dashboard {
  id: number;
  name: string;
}

interface PopupData {
  id?: number;
  name: string;
  content: { type: string; body?: string; mediaUrl?: string };
  timeout: number;
  targetDashboardIds: number[];
}

export function PopupEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm<PopupData>();
  const [loading, setLoading] = useState(false);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const isNew = !id;

  const contentType = Form.useWatch(["content", "type"], form);

  useEffect(() => {
    api.get<Dashboard[]>("/api/dashboards").then(setDashboards);
  }, []);

  useEffect(() => {
    if (!isNew) {
      setLoading(true);
      api
        .get<PopupData>(`/api/popups/${id}`)
        .then((data) => form.setFieldsValue(data))
        .finally(() => setLoading(false));
    }
  }, [id, isNew, form]);

  const onFinish = async (values: PopupData) => {
    setLoading(true);
    try {
      if (isNew) {
        await api.post("/api/popups", values);
        message.success("Popup created");
      } else {
        await api.put(`/api/popups/${id}`, values);
        message.success("Popup updated");
      }
      navigate("/popups");
    } finally {
      setLoading(false);
    }
  };

  const triggerPopup = async () => {
    if (!id) return;
    try {
      await api.post("/api/trigger/popup", { popupId: parseInt(id) });
      message.success("Popup triggered on all displays");
    } catch {
      message.error("Failed to trigger popup");
    }
  };

  return (
    <Card title={isNew ? "New Popup" : "Edit Popup"} loading={loading}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          content: { type: "text" },
          timeout: 10,
          targetDashboardIds: [],
        }}
      >
        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name={["content", "type"]} label="Content Type">
          <Select
            options={[
              { value: "text", label: "Text" },
              { value: "image", label: "Image" },
              { value: "video", label: "Video" },
            ]}
          />
        </Form.Item>
        {contentType === "text" && (
          <Form.Item name={["content", "body"]} label="Body">
            <Input.TextArea rows={4} />
          </Form.Item>
        )}
        {(contentType === "image" || contentType === "video") && (
          <Form.Item name={["content", "mediaUrl"]} label="Media URL">
            <Input placeholder="/assets/image.png" />
          </Form.Item>
        )}
        <Form.Item name="timeout" label="Timeout (seconds)">
          <InputNumber min={1} />
        </Form.Item>
        <Form.Item
          name="targetDashboardIds"
          label="Target Dashboards"
          extra="Leave empty to broadcast to all dashboards"
        >
          <Select
            mode="multiple"
            placeholder="All dashboards"
            options={dashboards.map((d) => ({ value: d.id, label: d.name }))}
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isNew ? "Create" : "Save"}
            </Button>
            {!isNew && (
              <Button icon={<SendOutlined />} onClick={triggerPopup}>
                Trigger Now
              </Button>
            )}
            <Button onClick={() => navigate("/popups")}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>

      {!isNew && (
        <Alert
          type="info"
          style={{ marginTop: 16 }}
          message="Home Assistant Integration"
          description={
            <div>
              <Paragraph>
                <Text>
                  Add this to your HA <Text code>configuration.yaml</Text> to
                  trigger this popup from automations:
                </Text>
              </Paragraph>
              <pre
                style={{
                  background: "#f5f5f5",
                  padding: 12,
                  borderRadius: 4,
                  fontSize: 12,
                }}
              >
{`rest_command:
  trigger_popup:
    url: "http://localhost:8099/api/trigger/popup"
    method: POST
    content_type: "application/json"
    payload: '{"popupId": ${id}}'`}
              </pre>
              <Paragraph>
                <Text>
                  Then use <Text code>service: rest_command.trigger_popup</Text>{" "}
                  in automations.
                </Text>
              </Paragraph>
            </div>
          }
        />
      )}
    </Card>
  );
}
