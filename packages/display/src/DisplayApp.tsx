import { useEffect, useState, useCallback, useRef } from "react";
import { DashboardRenderer } from "./runtime/DashboardRenderer.js";
import { PopupOverlay } from "./runtime/PopupOverlay.js";
import { DisplayClient } from "./ws/DisplayClient.js";
import type { EntityState } from "./template/engine.js";

interface DashboardConfig {
  dashboard: {
    id: number;
    name: string;
    slug: string;
    accessKey: string;
    accessMode: string;
    interactiveMode: boolean;
    globalStyles: Record<string, string>;
    standardVariables?: Record<string, string>;
    layoutSwitchMode: "tabs" | "auto-rotate";
    layoutRotateInterval: number;
  };
  layouts: DashboardLayout[];
  components: Record<number, ComponentDef>;
}

interface DashboardLayout {
  id: number;
  layoutId: number;
  sortOrder: number;
  label: string | null;
  layout: {
    structure: {
      gridTemplate: string;
      regions: { id: string; label: string; gridArea: string }[];
    };
  };
  instances: ComponentInstance[];
}

interface ComponentInstance {
  id: number;
  componentId: number;
  regionId: string;
  sortOrder: number;
  parameterValues: Record<string, string | number | boolean>;
  entityBindings: Record<string, string | string[]>;
  visibilityRules: {
    entityId: string;
    attribute?: string;
    operator: string;
    value: string;
  }[];
  parentInstanceId: number | null;
}

interface ComponentDef {
  id: number;
  template: string;
  styles: string;
  isContainer: boolean;
  containerConfig: { type: string; rotateInterval?: number } | null;
}

interface PopupData {
  id: number;
  content: { type: string; body?: string; mediaUrl?: string };
  timeout: number;
}

function getSlugFromUrl(): string | null {
  const match = window.location.pathname.match(/^\/d\/([^/]+)/);
  return match ? match[1] : null;
}

export function DisplayApp() {
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [entities, setEntities] = useState<Record<string, EntityState>>({});
  const [popup, setPopup] = useState<PopupData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [password, setPassword] = useState("");
  const clientRef = useRef<DisplayClient | null>(null);

  const slug = getSlugFromUrl();

  const loadConfig = useCallback(async () => {
    if (!slug) {
      setError("No dashboard slug in URL");
      return;
    }

    try {
      const res = await fetch(`/api/display/${slug}`);
      if (res.status === 401) {
        setNeedsAuth(true);
        return;
      }
      if (!res.ok) {
        setError(`Failed to load dashboard: ${res.status}`);
        return;
      }
      const data = (await res.json()) as DashboardConfig;
      setConfig(data);
      setNeedsAuth(false);
    } catch (err) {
      setError(`Failed to load: ${(err as Error).message}`);
    }
  }, [slug]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Inject standard variables as CSS custom properties
  useEffect(() => {
    if (!config?.dashboard.standardVariables) return;

    const vars = config.dashboard.standardVariables;
    const defaults: Record<string, string> = {
      componentBg: "transparent",
      fontColor: "#ffffff",
      fontColorSecondary: "#aaaaaa",
      accentColor: "#1890ff",
      fontFamily: "inherit",
      fontSize: "16px",
      borderStyle: "none",
      borderRadius: "0px",
      componentPadding: "0px",
      componentGap: "0px",
      backgroundColor: "#000000",
    };
    const cssMap: Record<string, string> = {
      componentBg: "--db-component-bg",
      fontColor: "--db-font-color",
      fontColorSecondary: "--db-font-color-secondary",
      accentColor: "--db-accent-color",
      fontFamily: "--db-font-family",
      fontSize: "--db-font-size",
      borderStyle: "--db-border-style",
      borderRadius: "--db-border-radius",
      componentPadding: "--db-component-padding",
      componentGap: "--db-component-gap",
      backgroundColor: "--db-background-color",
    };

    const merged = { ...defaults, ...vars };
    const root = document.documentElement;
    for (const [key, cssProp] of Object.entries(cssMap)) {
      root.style.setProperty(cssProp, merged[key] ?? defaults[key]);
    }

    // Apply background
    const bgType = (vars.backgroundType as string) || "color";
    if (bgType === "image" && vars.backgroundImage) {
      document.body.style.backgroundColor = "";
      document.body.style.backgroundImage = `url(/assets/${vars.backgroundImage})`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
    } else {
      document.body.style.backgroundImage = "";
      document.body.style.backgroundColor = `var(--db-background-color)`;
    }

    return () => {
      for (const cssProp of Object.values(cssMap)) {
        root.style.removeProperty(cssProp);
      }
      document.body.style.backgroundImage = "";
      document.body.style.backgroundColor = "";
    };
  }, [config]);

  // Connect WebSocket once config is loaded
  useEffect(() => {
    if (!config) return;

    const client = new DisplayClient(
      config.dashboard.slug,
      config.dashboard.accessKey
    );

    client.onStateChanged((entityId, state) => {
      setEntities((prev) => ({ ...prev, [entityId]: state }));
    });

    client.onReload(() => {
      window.location.reload();
    });

    client.onPopup((msg) => {
      setPopup(msg as unknown as PopupData);
    });

    client.connect();
    clientRef.current = client;

    return () => {
      client.close();
      clientRef.current = null;
    };
  }, [config]);

  const handleLogin = async () => {
    if (!slug) return;
    const res = await fetch(`/d/${slug}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      loadConfig();
    } else {
      setError("Invalid password");
    }
  };

  if (error && !needsAuth) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          color: "#f55",
          background: "#0a0a1a",
          fontFamily: "system-ui",
        }}
      >
        {error}
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#0a0a1a",
          color: "#eee",
          fontFamily: "system-ui",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 18, marginBottom: 8 }}>
          Dashboard requires authentication
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          placeholder="Password"
          style={{
            padding: "8px 16px",
            fontSize: 16,
            borderRadius: 4,
            border: "1px solid #444",
            background: "#1a1a2e",
            color: "#fff",
          }}
        />
        <button
          onClick={handleLogin}
          style={{
            padding: "8px 24px",
            fontSize: 16,
            borderRadius: 4,
            border: "none",
            background: "#4fc3f7",
            color: "#000",
            cursor: "pointer",
          }}
        >
          Login
        </button>
        {error && <div style={{ color: "#f55" }}>{error}</div>}
      </div>
    );
  }

  if (!config) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#0a0a1a",
          color: "#aaa",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        color: "#eee",
        fontFamily: "system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      <DashboardRenderer
        dashboardLayouts={config.layouts}
        components={config.components}
        entities={entities}
        globalStyles={{
          ...config.dashboard.standardVariables,
          ...config.dashboard.globalStyles,
        }}
        layoutSwitchMode={config.dashboard.layoutSwitchMode}
        layoutRotateInterval={config.dashboard.layoutRotateInterval}
      />
      <PopupOverlay popup={popup} onDismiss={() => setPopup(null)} />
    </div>
  );
}
