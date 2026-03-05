import { useEffect, useState } from "react";
import {
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Card,
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

export function PopupTrigger() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const contentType = Form.useWatch(["content", "type"], form);

  useEffect(() => {
    api.get<Dashboard[]>("/api/dashboards").then(setDashboards);
  }, []);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await api.post("/api/trigger/popup", values);
      message.success("Popup sent to displays");
    } catch {
      message.error("Failed to send popup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Send Popup">
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
          <Form.Item
            name={["content", "body"]}
            label="Body"
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
        )}
        {(contentType === "image" || contentType === "video") && (
          <Form.Item
            name={["content", "mediaUrl"]}
            label="Media URL"
            rules={[{ required: true }]}
          >
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
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<SendOutlined />}
          >
            Send Popup
          </Button>
        </Form.Item>
      </Form>
      <Alert
        type="info"
        style={{ marginTop: 16 }}
        message="Home Assistant Integration"
        description={
          <div>
            <Paragraph>
              <Text>
                Add this to your HA <Text code>configuration.yaml</Text>:
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
    payload: '{"content":{"type":"text","body":"{{ message }}"},"timeout":10}'`}
            </pre>
          </div>
        }
      />
    </Card>
  );
}
