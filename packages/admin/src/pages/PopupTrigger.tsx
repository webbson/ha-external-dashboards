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
  Collapse,
  message,
} from "antd";
import { SendOutlined } from "@ant-design/icons";
import { api } from "../api.js";

const { Text, Paragraph } = Typography;

const preStyle: React.CSSProperties = {
  background: "#f5f5f5",
  padding: 12,
  borderRadius: 4,
  fontSize: 12,
  overflowX: "auto",
};

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
  const mediaUrl = Form.useWatch(["content", "mediaUrl"], form);

  useEffect(() => {
    api.get<Dashboard[]>("/api/dashboards").then(setDashboards);
    api.get<Asset[]>("/api/assets").then(setAssets);
  }, []);

  const filteredAssets = assets.filter((a) => {
    if (contentType === "image") return a.mimeType.startsWith("image/");
    if (contentType === "video") return a.mimeType.startsWith("video/");
    return false;
  });

  const selectedAsset = mediaUrl
    ? assets.find((a) => `/assets/${a.fileName}` === mediaUrl)
    : undefined;

  const previewUrl = mediaUrl
    ? selectedAsset
      ? `/api/assets/${selectedAsset.id}/file`
      : mediaUrl
    : undefined;

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
              {previewUrl && contentType === "image" && (
                <div style={{ marginTop: 8 }}>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{
                      maxWidth: 300,
                      maxHeight: 180,
                      borderRadius: 4,
                      border: "1px solid #333",
                      objectFit: "cover",
                    }}
                  />
                </div>
              )}
              {previewUrl && contentType === "video" && (
                <div style={{ marginTop: 8 }}>
                  <video
                    src={previewUrl}
                    controls
                    style={{
                      maxWidth: 300,
                      maxHeight: 180,
                      borderRadius: 4,
                      border: "1px solid #333",
                    }}
                  />
                </div>
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
      <Collapse
        style={{ marginTop: 16 }}
        items={[
          {
            key: "ha-integration",
            label: "Home Assistant Integration Examples",
            children: (
              <div>
                <Paragraph>
                  <Text>
                    Add these to your HA <Text code>configuration.yaml</Text>{" "}
                    and call them from automations or scripts.
                  </Text>
                </Paragraph>

                <div style={{ fontWeight: 500, marginBottom: 4 }}>
                  Text popup
                </div>
                <pre style={preStyle}>
                  {`rest_command:
  popup_text:
    url: "http://external_dashboards:8080/api/trigger/popup"
    method: POST
    content_type: "application/json"
    payload: '{"content":{"type":"text","body":"{{ message }}"},"timeout":{{ timeout | default(10) }}}'`}
                </pre>

                <div style={{ fontWeight: 500, marginTop: 16, marginBottom: 4 }}>
                  Image popup
                </div>
                <pre style={preStyle}>
                  {`rest_command:
  popup_image:
    url: "http://external_dashboards:8080/api/trigger/popup"
    method: POST
    content_type: "application/json"
    payload: '{"content":{"type":"image","mediaUrl":"{{ media_url }}"},"timeout":{{ timeout | default(15) }}}'`}
                </pre>

                <div style={{ fontWeight: 500, marginTop: 16, marginBottom: 4 }}>
                  Video popup
                </div>
                <pre style={preStyle}>
                  {`rest_command:
  popup_video:
    url: "http://external_dashboards:8080/api/trigger/popup"
    method: POST
    content_type: "application/json"
    payload: '{"content":{"type":"video","mediaUrl":"{{ media_url }}"},"timeout":{{ timeout | default(30) }}}'`}
                </pre>

                <div style={{ fontWeight: 500, marginTop: 16, marginBottom: 4 }}>
                  Target specific dashboards
                </div>
                <pre style={preStyle}>
                  {`rest_command:
  popup_targeted:
    url: "http://external_dashboards:8080/api/trigger/popup"
    method: POST
    content_type: "application/json"
    payload: '{"content":{"type":"text","body":"{{ message }}"},"timeout":10,"targetDashboardIds":[{{ dashboard_id }}]}'`}
                </pre>

                <div style={{ fontWeight: 500, marginTop: 16, marginBottom: 4 }}>
                  Automation example
                </div>
                <pre style={preStyle}>
                  {`automation:
  - alias: "Doorbell popup"
    trigger:
      - platform: state
        entity_id: binary_sensor.doorbell
        to: "on"
    action:
      - service: rest_command.popup_image
        data:
          media_url: "/assets/doorbell-snapshot.jpg"
          timeout: 20`}
                </pre>
              </div>
            ),
          },
        ]}
      />
    </Card>
  );
}
