import { useEffect, useState } from "react";
import { Typography, Alert, Card, Spin, Space } from "antd";

const { Title, Paragraph, Text } = Typography;

interface Settings {
  externalBaseUrl: string | null;
  mcpApiKey: string | null;
  mcpEnabled: boolean;
  devMode: boolean;
}

export function McpSetup() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings);
  }, []);

  if (!settings) return <Spin style={{ display: "block", marginTop: 100 }} />;

  const baseUrl = settings.externalBaseUrl || "http://<your-host>:8099";
  const apiKey = settings.mcpApiKey || "<your-mcp-api-key>";
  const mcpUrl = `${baseUrl}/mcp`;

  const claudeDesktopArgs = [
    "mcp-remote",
    mcpUrl,
    ...(settings.mcpApiKey
      ? ["--header", `Authorization:${" "}Bearer ${apiKey}`]
      : []),
  ];

  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        "ha-external-dashboards": {
          command: "npx",
          args: claudeDesktopArgs,
        },
      },
    },
    null,
    2,
  );

  const claudeCodeEntry: Record<string, unknown> = {
    type: "url",
    url: mcpUrl,
  };
  if (settings.mcpApiKey) {
    claudeCodeEntry.headers = { Authorization: `Bearer ${apiKey}` };
  }
  const claudeCodeConfig = JSON.stringify(
    { mcpServers: { "ha-external-dashboards": claudeCodeEntry } },
    null,
    2,
  );

  const cursorEntry: Record<string, unknown> = { url: mcpUrl };
  if (settings.mcpApiKey) {
    cursorEntry.headers = { Authorization: `Bearer ${apiKey}` };
  }
  const cursorConfig = JSON.stringify(
    { mcpServers: { "ha-external-dashboards": cursorEntry } },
    null,
    2,
  );

  return (
    <Typography>
      <Title level={2}>MCP Setup</Title>
      <Paragraph>
        Connect AI agents to your Home Assistant dashboards using the{" "}
        <Text strong>Model Context Protocol (MCP)</Text>. The MCP server exposes
        40 tools for managing dashboards, components, layouts, themes, and
        assets.
      </Paragraph>

      {!settings.externalBaseUrl && (
        <Alert
          type="warning"
          showIcon
          message="External Base URL not set"
          description={
            <>
              Set the <Text code>EXTERNAL_BASE_URL</Text> environment variable
              to your add-on's external address (e.g.{" "}
              <Text code>http://192.168.1.100:8099</Text>). The examples below
              use a placeholder.
            </>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {!settings.mcpApiKey && (
        <Alert
          type={settings.devMode ? "info" : "warning"}
          showIcon
          message="MCP API key not set"
          description={
            settings.devMode ? (
              <>
                Auth is skipped in development mode. For production, set the{" "}
                <Text code>MCP_API_KEY</Text> environment variable.
              </>
            ) : (
              <>
                Set the <Text code>MCP_API_KEY</Text> environment variable to
                secure the MCP endpoint. Without it, the endpoint returns 503 in
                production.
              </>
            )
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Card title="Claude Desktop" size="small">
          <Paragraph>
            Requires <Text code>npx</Text> (Node.js) installed. Add to your{" "}
            <Text code>claude_desktop_config.json</Text>:
          </Paragraph>
          <Paragraph>
            <pre><Text copyable={{ text: claudeDesktopConfig }}>{claudeDesktopConfig}</Text></pre>
          </Paragraph>
        </Card>

        <Card title="Claude Code" size="small">
          <Paragraph>
            Add to your project's <Text code>.mcp.json</Text>:
          </Paragraph>
          <Paragraph>
            <pre><Text copyable={{ text: claudeCodeConfig }}>{claudeCodeConfig}</Text></pre>
          </Paragraph>
        </Card>

        <Card title="Cursor" size="small">
          <Paragraph>
            Add to <Text code>.cursor/mcp.json</Text>:
          </Paragraph>
          <Paragraph>
            <pre><Text copyable={{ text: cursorConfig }}>{cursorConfig}</Text></pre>
          </Paragraph>
        </Card>

        <Card title="Generic / Other" size="small">
          <Paragraph>
            Use these details to configure any MCP-compatible client:
          </Paragraph>
          <Paragraph>
            <Text strong>Endpoint:</Text>{" "}
            <Text code copyable>
              {mcpUrl}
            </Text>
          </Paragraph>
          <Paragraph>
            <Text strong>Method:</Text> <Text code>POST</Text> (Streamable HTTP
            transport, stateless)
          </Paragraph>
          {settings.mcpApiKey && (
            <Paragraph>
              <Text strong>Auth header:</Text>{" "}
              <Text code copyable={{ text: `Authorization: Bearer ${apiKey}` }}>
                Authorization: Bearer {apiKey}
              </Text>
            </Paragraph>
          )}
        </Card>

        <Card title="What can MCP do?" size="small">
          <Paragraph>
            The MCP server exposes tools for AI agents to fully manage your
            External Dashboards setup:
          </Paragraph>
          <ul>
            <li>
              <Text strong>Dashboards</Text> — create, update, delete, list, and
              configure access modes
            </li>
            <li>
              <Text strong>Components</Text> — author templates, styles, and
              parameter definitions
            </li>
            <li>
              <Text strong>Layouts</Text> — design grid layouts and regions
            </li>
            <li>
              <Text strong>Themes</Text> — manage colors, typography, and custom
              CSS variables
            </li>
            <li>
              <Text strong>Assets</Text> — upload and organize images and files
            </li>
            <li>
              <Text strong>Utilities</Text> — reload dashboards, trigger popups,
              query HA entities
            </li>
          </ul>
        </Card>
      </Space>
    </Typography>
  );
}
