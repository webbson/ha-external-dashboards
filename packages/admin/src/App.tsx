import { Routes, Route, useNavigate, useLocation } from "react-router";
import { Layout, Menu } from "antd";
import {
  DashboardOutlined,
  LayoutOutlined,
  AppstoreOutlined,
  FileImageOutlined,
  NotificationOutlined,
} from "@ant-design/icons";
import { DashboardList } from "./pages/DashboardList.js";
import { DashboardEditor } from "./pages/DashboardEditor.js";
import { LayoutList } from "./pages/LayoutList.js";
import { LayoutEditor } from "./pages/LayoutEditor.js";
import { ComponentList } from "./pages/ComponentList.js";
import { ComponentEditor } from "./pages/ComponentEditor.js";
import { AssetList } from "./pages/AssetList.js";
import { PopupList } from "./pages/PopupList.js";
import { PopupEditor } from "./pages/PopupEditor.js";

const { Sider, Content } = Layout;

const menuItems = [
  { key: "/dashboards", icon: <DashboardOutlined />, label: "Dashboards" },
  { key: "/layouts", icon: <LayoutOutlined />, label: "Layouts" },
  { key: "/components", icon: <AppstoreOutlined />, label: "Components" },
  { key: "/assets", icon: <FileImageOutlined />, label: "Assets" },
  { key: "/popups", icon: <NotificationOutlined />, label: "Popups" },
];

export function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedKey =
    menuItems.find((item) => location.pathname.startsWith(item.key))?.key ??
    "/dashboards";

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={200} theme="light">
        <div
          style={{
            padding: "16px",
            fontWeight: 600,
            fontSize: 16,
            textAlign: "center",
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
      </Sider>
      <Layout>
        <Content style={{ padding: 24 }}>
          <Routes>
            <Route path="/" element={<DashboardList />} />
            <Route path="/dashboards" element={<DashboardList />} />
            <Route path="/dashboards/new" element={<DashboardEditor />} />
            <Route path="/dashboards/:id" element={<DashboardEditor />} />
            <Route path="/layouts" element={<LayoutList />} />
            <Route path="/layouts/new" element={<LayoutEditor />} />
            <Route path="/layouts/:id" element={<LayoutEditor />} />
            <Route path="/components" element={<ComponentList />} />
            <Route path="/components/new" element={<ComponentEditor />} />
            <Route path="/components/:id" element={<ComponentEditor />} />
            <Route path="/assets" element={<AssetList />} />
            <Route path="/popups" element={<PopupList />} />
            <Route path="/popups/new" element={<PopupEditor />} />
            <Route path="/popups/:id" element={<PopupEditor />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}
