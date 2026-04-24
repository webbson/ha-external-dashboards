import { useEffect, useState } from "react";
import {
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Card,
  Typography,
  Radio,
  Row,
  Col,
  Tooltip,
  message,
} from "antd";
import { SendOutlined, CopyOutlined, CheckOutlined } from "@ant-design/icons";
import { api, apiUrl } from "../api.js";

const { Text, Title } = Typography;

const preStyle: React.CSSProperties = {
  background: "#f5f5f5",
  padding: 12,
  borderRadius: 4,
  fontSize: 12,
  overflowX: "auto",
  margin: 0,
};

interface Dashboard {
  id: number;
  name: string;
  slug: string;
}

interface Asset {
  id: number;
  name: string;
  fileName: string;
  mimeType: string;
}


function buildEventYaml(
  content: { type: string; body?: string; mediaUrl?: string },
  timeout: number,
  targetSlugs: string[]
): string {
  const contentLines =
    content.type === "text"
      ? `        type: text\n        body: "${content.body ?? ""}"`
      : `        type: ${content.type}\n        mediaUrl: "${content.mediaUrl ?? ""}"`;

  const targetLines =
    targetSlugs.length > 0
      ? `\n      target_dashboards:\n${targetSlugs.map((s) => `        - ${s}`).join("\n")}`
      : "";

  return `action:
  - event: external_dashboards_popup
    event_data:
      content:
${contentLines}
      timeout: ${timeout}${targetLines}`;
}

export function PopupTrigger() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [mediaSource, setMediaSource] = useState<"asset" | "url">("asset");

  const contentType = Form.useWatch(["content", "type"], form);
  const mediaUrl = Form.useWatch(["content", "mediaUrl"], form);
  const body = Form.useWatch(["content", "body"], form);
  const timeout = Form.useWatch("timeout", form) ?? 10;
  const targetDashboardIds: number[] = Form.useWatch("targetDashboardIds", form) ?? [];

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
      ? apiUrl(`/api/assets/${selectedAsset.id}/file`)
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

  // Build live example snippets from current form state
  const effectiveContent =
    contentType === "text"
      ? { type: "text" as const, body: body ?? "" }
      : { type: (contentType ?? "image") as "image" | "video", mediaUrl: mediaUrl ?? "" };

  const targetSlugs = targetDashboardIds.map(
    (id) => dashboards.find((d) => d.id === id)?.slug ?? String(id)
  );

  const eventYaml = buildEventYaml(effectiveContent, timeout, targetSlugs);

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

      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <Title level={5} style={{ margin: 0 }}>Trigger from a HA Automation</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>Updates as you change the form above.</Text>
          </div>
          <Tooltip title={copied ? "Copied!" : "Copy"}>
            <Button
              size="small"
              icon={copied ? <CheckOutlined /> : <CopyOutlined />}
              onClick={() => {
                navigator.clipboard.writeText(eventYaml);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            />
          </Tooltip>
        </div>
        <pre style={preStyle}>{eventYaml}</pre>
      </div>
    </Card>
  );
}
