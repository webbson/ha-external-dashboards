import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router";
import { Layout, Menu, ConfigProvider, theme, Button } from "antd";
import {
  DashboardOutlined,
  LayoutOutlined,
  AppstoreOutlined,
  FileImageOutlined,
  NotificationOutlined,
  FormatPainterOutlined,
  SunOutlined,
  MoonOutlined,
  ApiOutlined,
  MonitorOutlined,
} from "@ant-design/icons";
import { useDarkMode } from "./hooks/useDarkMode.js";
import { DashboardList } from "./pages/DashboardList.js";
import { DashboardEditor } from "./pages/DashboardEditor.js";
import { LayoutList } from "./pages/LayoutList.js";
import { LayoutEditor } from "./pages/LayoutEditor.js";
import { ComponentList } from "./pages/ComponentList.js";
import { ComponentEditor } from "./pages/ComponentEditor.js";
import { AssetList } from "./pages/AssetList.js";
import { PopupTrigger } from "./pages/PopupTrigger.js";
import { ThemeList } from "./pages/ThemeList.js";
import { ThemeEditor } from "./pages/ThemeEditor.js";
import { McpSetup } from "./pages/McpSetup.js";
import { Diagnostics } from "./pages/Diagnostics.js";
import { BackupRestore } from "./components/BackupRestore.js";
import { apiUrl } from "./api.js";

const { Sider, Content } = Layout;

const baseMenuItems = [
  { key: "/dashboards", icon: <DashboardOutlined />, label: "Dashboards" },
  { key: "/themes", icon: <FormatPainterOutlined />, label: "Themes" },
  { key: "/layouts", icon: <LayoutOutlined />, label: "Layouts" },
  { key: "/components", icon: <AppstoreOutlined />, label: "Components" },
  { key: "/assets", icon: <FileImageOutlined />, label: "Assets" },
  { key: "/popups", icon: <NotificationOutlined />, label: "Popups" },
  { key: "/diagnostics", icon: <MonitorOutlined />, label: "Diagnostics" },
];

function AppLayout({ isDark, toggle }: { isDark: boolean; toggle: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const [mcpEnabled, setMcpEnabled] = useState(false);

  useEffect(() => {
    fetch(apiUrl("/api/settings"))
      .then((r) => r.json())
      .then((data) => setMcpEnabled(data.mcpEnabled ?? false))
      .catch(() => {});
  }, []);

  const menuItems = mcpEnabled
    ? [...baseMenuItems, { key: "/mcp", icon: <ApiOutlined />, label: "MCP" }]
    : baseMenuItems;

  const selectedKey =
    menuItems.find((item) => location.pathname.startsWith(item.key))?.key ??
    "/dashboards";

  return (
    <Layout style={{ minHeight: "100vh", background: token.colorBgLayout }}>
      <Sider width={200} theme={isDark ? "dark" : "light"} style={{ position: "relative" }}>
        <div
          style={{
            padding: "16px",
            fontWeight: 600,
            fontSize: 16,
            textAlign: "center",
            color: isDark ? "rgba(255, 255, 255, 0.85)" : "rgba(0, 0, 0, 0.88)",
          }}
        >
          External Dashboards
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
        <div
          style={{
            position: "absolute",
            bottom: 16,
            width: "100%",
            padding: "0 12px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <BackupRestore />
          <div style={{ textAlign: "center" }}>
            <Button
              type="text"
              icon={isDark ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggle}
            />
          </div>
        </div>
      </Sider>
      <Layout style={{ background: token.colorBgLayout }}>
        <Content style={{ padding: 24 }}>
          <Routes>
            <Route index element={<Navigate to="/dashboards" replace />} />
            <Route path="*" element={<Navigate to="/dashboards" replace />} />
            <Route path="/dashboards" element={<DashboardList />} />
            <Route path="/dashboards/new" element={<DashboardEditor />} />
            <Route path="/dashboards/:id" element={<DashboardEditor />} />
            <Route path="/themes" element={<ThemeList />} />
            <Route path="/themes/new" element={<ThemeEditor />} />
            <Route path="/themes/:id" element={<ThemeEditor />} />
            <Route path="/layouts" element={<LayoutList />} />
            <Route path="/layouts/new" element={<LayoutEditor />} />
            <Route path="/layouts/:id" element={<LayoutEditor />} />
            <Route path="/components" element={<ComponentList />} />
            <Route path="/components/new" element={<ComponentEditor />} />
            <Route path="/components/:id" element={<ComponentEditor />} />
            <Route path="/assets" element={<AssetList />} />
            <Route path="/popups" element={<PopupTrigger />} />
            <Route path="/mcp" element={<McpSetup />} />
            <Route path="/diagnostics" element={<Diagnostics />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export function App() {
  const { isDark, toggle } = useDarkMode();

  return (
    <ConfigProvider
      theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm }}
    >
      <AppLayout isDark={isDark} toggle={toggle} />
    </ConfigProvider>
  );
}
