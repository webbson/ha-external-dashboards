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
  Radio,
  Row,
  Col,
  message,
} from "antd";
import { SendOutlined } from "@ant-design/icons";
import { api } from "../api.js";

const { Text, Paragraph } = Typography;

interface Dashboard {
  id: number;
  name: string;
}

interface Asset {
  id: number;
  name: string;
  fileName: string;
  mimeType: string;
}

export function PopupTrigger() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [mediaSource, setMediaSource] = useState<"asset" | "url">("asset");
  const contentType = Form.useWatch(["content", "type"], form);

  useEffect(() => {
    api.get<Dashboard[]>("/api/dashboards").then(setDashboards);
    api.get<Asset[]>("/api/assets").then(setAssets);
  }, []);

  const filteredAssets = assets.filter((a) => {
    if (contentType === "image") return a.mimeType.startsWith("image/");
    if (contentType === "video") return a.mimeType.startsWith("video/");
    return false;
  });

  const handleContentTypeChange = () => {
    form.setFieldValue(["content", "mediaUrl"], undefined);
    form.setFieldValue(["content", "body"], undefined);
    setMediaSource("asset");
  };

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
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name={["content", "type"]} label="Content Type">
              <Select
                onChange={handleContentTypeChange}
                options={[
                  { value: "text", label: "Text" },
                  { value: "image", label: "Image" },
                  { value: "video", label: "Video" },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="timeout" label="Timeout (seconds)">
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="targetDashboardIds"
              label="Target Dashboards"
              extra="Leave empty to broadcast to all"
            >
              <Select
                mode="multiple"
                placeholder="All dashboards"
                options={dashboards.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        {contentType === "text" && (
          <Row>
            <Col span={24}>
              <Form.Item
                name={["content", "body"]}
                label="Body"
                rules={[{ required: true }]}
              >
                <Input.TextArea rows={4} />
              </Form.Item>
            </Col>
          </Row>
        )}

        {(contentType === "image" || contentType === "video") && (
          <Row>
            <Col span={24}>
              <Form.Item label="Media Source">
                <Radio.Group
                  optionType="button"
                  buttonStyle="solid"
                  value={mediaSource}
                  onChange={(e) => {
                    setMediaSource(e.target.value);
                    form.setFieldValue(["content", "mediaUrl"], undefined);
                  }}
                  options={[
                    { value: "asset", label: "Asset" },
                    { value: "url", label: "External URL" },
                  ]}
                />
              </Form.Item>
              {mediaSource === "asset" ? (
                <Form.Item
                  name={["content", "mediaUrl"]}
                  label={contentType === "image" ? "Image Asset" : "Video Asset"}
                  rules={[{ required: true }]}
                >
                  <Select
                    placeholder={`Select ${contentType}...`}
                    allowClear
                    options={filteredAssets.map((a) => ({
                      value: `/assets/${a.fileName}`,
                      label: a.name,
                    }))}
                  />
                </Form.Item>
              ) : (
                <Form.Item
                  name={["content", "mediaUrl"]}
                  label="External URL"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="https://example.com/image.png" />
                </Form.Item>
              )}
            </Col>
          </Row>
        )}

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
