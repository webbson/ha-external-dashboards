import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { DashboardRenderer } from "./runtime/DashboardRenderer.js";
import { PopupOverlay } from "./runtime/PopupOverlay.js";
import { DialogOverlay } from "./runtime/DialogOverlay.js";
import { BlackoutOverlay } from "./runtime/BlackoutOverlay.js";
import { DisplayClient } from "./ws/DisplayClient.js";
import type { EntityState } from "./template/engine.js";
import { setDerivedEntityHandler } from "./template/engine.js";
import { resolveIcons, extractIconNames } from "./icons/icon-resolver.js";
import { ensureUPlot } from "./uplot-loader.js";

interface DashboardConfig {
  dashboard: {
    id: number;
    name: string;
    slug: string;
    accessKey: string;
    accessMode: string;
    interactiveMode: boolean;
    maxWidth?: string | null;
    padding?: string | null;
    globalStyles: Record<string, string>;
    standardVariables?: Record<string, string>;
    layoutSwitchMode: "tabs" | "auto-rotate";
    layoutRotateInterval: number;
    blackoutEntity?: string | null;
    blackoutStartTime?: string | null;
    blackoutEndTime?: string | null;
  };
  layouts: DashboardLayout[];
  components: Record<number, ComponentDef>;
}

interface DashboardLayout {
  id: number;
  layoutId: number;
  sortOrder: number;
  label: string | null;
  icon: string | null;
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

interface HAGlobal {
  callService: (domain: string, service: string, data: Record<string, unknown>) => void;
  openDialog: (type: string, props: Record<string, unknown>) => void;
  closeDialog: () => void;
}

declare global {
  interface Window {
    __ha?: HAGlobal;
  }
}

function getSlugFromUrl(): string | null {
  const match = window.location.pathname.match(/^\/d\/([^/]+)/);
  return match ? match[1] : null;
}

export function DisplayApp() {
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [entities, setEntities] = useState<Record<string, EntityState>>({});
  const [globExpansions, setGlobExpansions] = useState<Record<string, string[]>>({});
  const [popup, setPopup] = useState<PopupData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [password, setPassword] = useState("");
  const [dialogState, setDialogState] = useState<{ type: string; props: Record<string, unknown> } | null>(null);
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

      // Pre-resolve icons before first render
      const iconNames: string[] = [];
      // Layout tab icons
      for (const layout of data.layouts) {
        if (layout.icon) iconNames.push(layout.icon);
      }
      // Icons used in component templates
      const templates = Object.values(data.components).map((c) => c.template);
      iconNames.push(...extractIconNames(templates));
      if (iconNames.length > 0) {
        await resolveIcons(iconNames);
      }

      // Lazy-load uPlot if any component template uses it
      const needsUPlot = templates.some((t) => t.includes("uPlot"));
      if (needsUPlot) {
        await ensureUPlot();
      }

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
      tabBarBg: "transparent",
      tabBarColor: "rgba(255,255,255,0.6)",
      tabBarActiveColor: "#ffffff",
      tabBarActiveBg: "rgba(255,255,255,0.15)",
      tabBarFontSize: "14px",
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
      tabBarBg: "--db-tab-bar-bg",
      tabBarColor: "--db-tab-bar-color",
      tabBarActiveColor: "--db-tab-bar-active-color",
      tabBarActiveBg: "--db-tab-bar-active-bg",
      tabBarFontSize: "--db-tab-bar-font-size",
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

    client.onGlobExpansions((expansions) => {
      setGlobExpansions(expansions);
    });

    // Subscribe to derived entities (from deriveEntity helper) on demand
    const requestedEntities = new Set<string>();
    setDerivedEntityHandler((entityIds) => {
      const newIds = entityIds.filter((id) => !requestedEntities.has(id));
      if (newIds.length === 0) return;
      newIds.forEach((id) => requestedEntities.add(id));
      client.subscribeEntities(newIds);
    });

    client.connect();
    clientRef.current = client;

    if (config.dashboard.interactiveMode) {
      window.__ha = {
        callService: (domain: string, service: string, data: Record<string, unknown>) => {
          client.callService(domain, service, data);
        },
        openDialog: (type: string, props: Record<string, unknown>) => {
          setDialogState({ type, props });
        },
        closeDialog: () => {
          setDialogState(null);
        },
      };
    }

    return () => {
      window.__ha = undefined;
      setDerivedEntityHandler(null);
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

  const globalStyles = useMemo(
    () => ({
      ...config?.dashboard.standardVariables,
      ...config?.dashboard.globalStyles,
    }),
    [config]
  );

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
        globalStyles={globalStyles}
        globExpansions={globExpansions}
        maxWidth={config.dashboard.maxWidth}
        padding={config.dashboard.padding}
        layoutSwitchMode={config.dashboard.layoutSwitchMode}
        layoutRotateInterval={config.dashboard.layoutRotateInterval}
      />
      <BlackoutOverlay
        blackoutEntity={config.dashboard.blackoutEntity}
        blackoutStartTime={config.dashboard.blackoutStartTime}
        blackoutEndTime={config.dashboard.blackoutEndTime}
        entities={entities}
      />
      <PopupOverlay popup={popup} onDismiss={() => setPopup(null)} />
      <DialogOverlay
        dialogState={dialogState}
        onClose={() => setDialogState(null)}
        entities={entities}
        callService={(domain, service, data) => clientRef.current?.callService(domain, service, data)}
      />
    </div>
  );
}
