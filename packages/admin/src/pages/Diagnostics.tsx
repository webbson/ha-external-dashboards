import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Card,
  Col,
  Descriptions,
  Row,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  ApiOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  DesktopOutlined,
  WifiOutlined,
} from "@ant-design/icons";

interface DiagnosticsPayload {
  haWs: {
    connected: boolean;
    lastReconnectAt: string | null;
    reconnectCount: number;
    lastMessageAt: string | null;
  };
  displayClients: {
    count: number;
    bySlug: Record<string, number>;
  };
  db: {
    path: string;
    sizeBytes: number;
    tableCounts: Record<string, number>;
  };
  entities: {
    count: number;
    lastSeenAt: string | null;
  };
  uptimeMs: number;
  version: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatUptime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours || days) parts.push(`${hours}h`);
  if (minutes || hours || days) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

function formatTimeAgo(iso: string | null): string {
  if (!iso) return "never";
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return iso;
  const delta = Date.now() - d;
  if (delta < 1000) return "just now";
  if (delta < 60_000) return `${Math.floor(delta / 1000)}s ago`;
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}

const POLL_INTERVAL_MS = 5000;

export function Diagnostics() {
  const [data, setData] = useState<DiagnosticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const visibleRef = useRef(
    typeof document !== "undefined"
      ? document.visibilityState !== "hidden"
      : true
  );

  useEffect(() => {
    let cancelled = false;

    const fetchOnce = async () => {
      try {
        const res = await fetch("/api/admin/diagnostics");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as DiagnosticsPayload;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message || "Failed to fetch diagnostics");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // Initial fetch
    fetchOnce();

    const interval = window.setInterval(() => {
      if (visibleRef.current) fetchOnce();
    }, POLL_INTERVAL_MS);

    const onVisibility = () => {
      const visible = document.visibilityState !== "hidden";
      visibleRef.current = visible;
      // Re-fetch immediately on becoming visible so the UI isn't stale.
      if (visible) fetchOnce();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (loading && !data) {
    return (
      <Card>
        <Skeleton active />
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Alert
        type="error"
        showIcon
        message="Failed to load diagnostics"
        description={error}
      />
    );
  }

  if (!data) return null;

  const bySlugRows = Object.entries(data.displayClients.bySlug).map(
    ([slug, count]) => ({ key: slug, slug, count })
  );

  const tableCountRows = Object.entries(data.db.tableCounts).map(
    ([table, count]) => ({ key: table, table, count })
  );

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Diagnostics
      </Typography.Title>

      {error && (
        <Alert
          type="warning"
          showIcon
          message="Last refresh failed — showing cached data"
          description={error}
          closable
          onClose={() => setError(null)}
        />
      )}

      <Row gutter={16}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Server uptime"
              value={formatUptime(data.uptimeMs)}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="HA WebSocket"
              value={data.haWs.connected ? "Connected" : "Disconnected"}
              valueStyle={{ color: data.haWs.connected ? "#52c41a" : "#ff4d4f" }}
              prefix={<WifiOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Display clients"
              value={data.displayClients.count}
              prefix={<DesktopOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Entities known"
              value={data.entities.count}
              prefix={<ApiOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Home Assistant connection">
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
          <Descriptions.Item label="Status">
            {data.haWs.connected ? (
              <Tag color="green">Connected</Tag>
            ) : (
              <Tag color="red">Disconnected</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Reconnect count">
            {data.haWs.reconnectCount}
          </Descriptions.Item>
          <Descriptions.Item label="Last reconnect">
            {formatTimeAgo(data.haWs.lastReconnectAt)}
          </Descriptions.Item>
          <Descriptions.Item label="Last message">
            {formatTimeAgo(data.haWs.lastMessageAt)}
          </Descriptions.Item>
          <Descriptions.Item label="Last entity seen">
            {formatTimeAgo(data.entities.lastSeenAt)}
          </Descriptions.Item>
          <Descriptions.Item label="Version">
            {data.version}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Database" extra={<DatabaseOutlined />}>
        <Descriptions column={{ xs: 1, sm: 2 }} size="small">
          <Descriptions.Item label="Path">
            <Typography.Text code>{data.db.path}</Typography.Text>
          </Descriptions.Item>
          <Descriptions.Item label="Size">
            {formatBytes(data.db.sizeBytes)}
          </Descriptions.Item>
        </Descriptions>
        <Table
          size="small"
          style={{ marginTop: 16 }}
          rowKey="table"
          pagination={false}
          dataSource={tableCountRows}
          columns={[
            { title: "Table", dataIndex: "table" },
            {
              title: "Row count",
              dataIndex: "count",
              align: "right",
            },
          ]}
        />
      </Card>

      <Card title="Connected display clients">
        {bySlugRows.length === 0 ? (
          <Typography.Text type="secondary">
            No display clients connected.
          </Typography.Text>
        ) : (
          <Table
            size="small"
            rowKey="slug"
            pagination={false}
            dataSource={bySlugRows}
            columns={[
              { title: "Dashboard slug", dataIndex: "slug" },
              {
                title: "Clients",
                dataIndex: "count",
                align: "right",
              },
            ]}
          />
        )}
      </Card>
    </Space>
  );
}
