import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Popconfirm,
  Row,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  ApiOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  DesktopOutlined,
  WifiOutlined,
} from "@ant-design/icons";
import { Link } from "react-router";

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

interface KnownClient {
  id: number;
  identity: string;
  macAddress: string | null;
  alias: string | null;
  hostname: string | null;
  lastIp: string | null;
  lastDashboardId: number | null;
  lastSlug: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  connected: boolean;
}

const POLL_INTERVAL_MS = 5000;

export function Diagnostics() {
  const [data, setData] = useState<DiagnosticsPayload | null>(null);
  const [knownClients, setKnownClients] = useState<KnownClient[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const visibleRef = useRef(
    typeof document !== "undefined"
      ? document.visibilityState !== "hidden"
      : true
  );

  const fetchClients = useCallback(async (): Promise<KnownClient[] | null> => {
    try {
      const res = await fetch("/api/admin/clients");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as KnownClient[];
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchOnce = async () => {
      try {
        const [diagRes, clients] = await Promise.all([
          fetch("/api/admin/diagnostics"),
          fetchClients(),
        ]);
        if (!diagRes.ok) throw new Error(`HTTP ${diagRes.status}`);
        const json = (await diagRes.json()) as DiagnosticsPayload;
        if (!cancelled) {
          setData(json);
          setKnownClients(clients);
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
  }, [fetchClients]);

  const setAlias = useCallback(
    async (id: number, alias: string | null) => {
      try {
        const res = await fetch(`/api/admin/clients/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alias }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        message.success("Alias saved");
        const next = await fetchClients();
        if (next) setKnownClients(next);
      } catch (err) {
        message.error(`Failed to save alias: ${(err as Error).message}`);
      }
    },
    [fetchClients]
  );

  const forgetClient = useCallback(
    async (id: number) => {
      try {
        const res = await fetch(`/api/admin/clients/${id}`, {
          method: "DELETE",
        });
        if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
        message.success("Client forgotten");
        const next = await fetchClients();
        if (next) setKnownClients(next);
      } catch (err) {
        message.error(`Failed to forget client: ${(err as Error).message}`);
      }
    },
    [fetchClients]
  );

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

      <Card title="Known display clients">
        {!knownClients || knownClients.length === 0 ? (
          <Typography.Text type="secondary">
            No known clients yet — connect a display to populate this list.
          </Typography.Text>
        ) : (
          <Table<KnownClient>
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={knownClients}
            columns={[
              {
                title: "Status",
                dataIndex: "connected",
                width: 90,
                render: (connected: boolean, row) => (
                  <Tooltip
                    title={
                      connected
                        ? "Currently connected"
                        : `Last seen ${formatTimeAgo(row.lastSeenAt)}`
                    }
                  >
                    <Badge
                      status={connected ? "success" : "default"}
                      text={connected ? "Online" : formatTimeAgo(row.lastSeenAt)}
                    />
                  </Tooltip>
                ),
              },
              {
                title: "Alias",
                dataIndex: "alias",
                render: (_, row) => (
                  <Typography.Text
                    editable={{
                      tooltip: "Edit alias",
                      onChange: (val) => {
                        const trimmed = val.trim();
                        if (trimmed === (row.alias ?? "")) return;
                        setAlias(row.id, trimmed.length > 0 ? trimmed : null);
                      },
                      text: row.alias ?? "",
                    }}
                    type={row.alias ? undefined : "secondary"}
                  >
                    {row.alias ??
                      (row.hostname
                        ? `(suggest: ${row.hostname})`
                        : "(unset)")}
                  </Typography.Text>
                ),
              },
              {
                title: "Hostname",
                dataIndex: "hostname",
                render: (h: string | null) =>
                  h ?? <Typography.Text type="secondary">—</Typography.Text>,
              },
              {
                title: "MAC",
                dataIndex: "macAddress",
                render: (mac: string | null, row) =>
                  mac ? (
                    <Typography.Text code>{mac}</Typography.Text>
                  ) : (
                    <Tooltip title="MAC could not be resolved — row is keyed by IP. Enable host_network for the add-on to unlock MAC tracking.">
                      <Tag color="default">IP-based</Tag>
                    </Tooltip>
                  ),
              },
              {
                title: "Last IP",
                dataIndex: "lastIp",
                render: (ip: string | null) =>
                  ip ?? <Typography.Text type="secondary">—</Typography.Text>,
              },
              {
                title: "Last dashboard",
                dataIndex: "lastSlug",
                render: (slug: string | null) =>
                  slug ? (
                    <Link to={`/dashboards`}>{slug}</Link>
                  ) : (
                    <Typography.Text type="secondary">—</Typography.Text>
                  ),
              },
              {
                title: "First seen",
                dataIndex: "firstSeenAt",
                render: (ts: string) => (
                  <Tooltip title={new Date(ts).toLocaleString()}>
                    {formatTimeAgo(ts)}
                  </Tooltip>
                ),
              },
              {
                title: "",
                key: "actions",
                width: 90,
                align: "right",
                render: (_, row) => (
                  <Popconfirm
                    title="Forget this client?"
                    description={
                      row.connected
                        ? "The client is currently connected. It will be re-created on the next heartbeat, without the alias."
                        : "This removes the persistent record. It can be re-discovered on next connect."
                    }
                    okText="Forget"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => forgetClient(row.id)}
                  >
                    <Button
                      size="small"
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                    >
                      Forget
                    </Button>
                  </Popconfirm>
                ),
              },
            ]}
          />
        )}
      </Card>
    </Space>
  );
}
