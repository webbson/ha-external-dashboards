import { useState, useEffect } from "react";
import Icon from "@mdi/react";
import * as mdiIcons from "@mdi/js";
import { LayoutRenderer } from "./LayoutRenderer.js";
import type { EntityState } from "../template/engine.js";

function getIconPath(mdiName: string): string | undefined {
  const camelKey =
    "mdi" +
    mdiName
      .slice(4)
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("");
  return (mdiIcons as Record<string, string>)[camelKey];
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
      regions: { id: string; gridArea: string; applyChromeTo?: "components" | "region" }[];
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

interface DashboardRendererProps {
  dashboardLayouts: DashboardLayout[];
  components: Record<number, ComponentDef>;
  entities: Record<string, EntityState>;
  globalStyles: Record<string, string>;
  maxWidth?: string | null;
  padding?: string | null;
  layoutSwitchMode: "tabs" | "auto-rotate";
  layoutRotateInterval: number;
}

export function DashboardRenderer({
  dashboardLayouts,
  components,
  entities,
  globalStyles,
  maxWidth,
  padding,
  layoutSwitchMode,
  layoutRotateInterval,
}: DashboardRendererProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Auto-rotate layouts
  useEffect(() => {
    if (layoutSwitchMode !== "auto-rotate" || dashboardLayouts.length <= 1)
      return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % dashboardLayouts.length);
    }, layoutRotateInterval * 1000);
    return () => clearInterval(interval);
  }, [layoutSwitchMode, layoutRotateInterval, dashboardLayouts.length]);

  if (dashboardLayouts.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          color: "#aaa",
        }}
      >
        No layouts configured
      </div>
    );
  }

  const activeDl = dashboardLayouts[activeIndex];
  if (!activeDl) return null;

  const hasTabs = layoutSwitchMode === "tabs" && dashboardLayouts.length > 1;

  // Read tab bar theme values from globalStyles
  const tabBarBg = globalStyles.tabBarBg ?? "transparent";
  const tabBarColor = globalStyles.tabBarColor ?? "rgba(255,255,255,0.6)";
  const tabBarActiveColor = globalStyles.tabBarActiveColor ?? "#ffffff";
  const tabBarActiveBg = globalStyles.tabBarActiveBg ?? "rgba(255,255,255,0.15)";
  const tabBarFontSize = globalStyles.tabBarFontSize ?? "14px";

  const contentHeight = hasTabs ? "calc(100vh - 40px)" : "100vh";

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      {hasTabs && (
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: "4px 8px",
            background: tabBarBg,
          }}
        >
          {dashboardLayouts.map((dl, i) => {
            const isActive = i === activeIndex;
            const iconPath = dl.icon ? getIconPath(dl.icon) : undefined;
            return (
              <button
                key={dl.id}
                onClick={() => setActiveIndex(i)}
                style={{
                  padding: "6px 16px",
                  border: "none",
                  borderRadius: 4,
                  background: isActive ? tabBarActiveBg : "transparent",
                  color: isActive ? tabBarActiveColor : tabBarColor,
                  cursor: "pointer",
                  fontSize: tabBarFontSize,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "inherit",
                  transition: "color 0.2s, background 0.2s",
                }}
              >
                {iconPath && (
                  <Icon
                    path={iconPath}
                    size={tabBarFontSize}
                    color={isActive ? tabBarActiveColor : tabBarColor}
                  />
                )}
                {dl.label}
              </button>
            );
          })}
        </div>
      )}
      <div
        style={{
          height: contentHeight,
          maxWidth: maxWidth || undefined,
          padding: padding || undefined,
          margin: maxWidth ? "0 auto" : undefined,
          boxSizing: "border-box",
        }}
      >
        <LayoutRenderer
          structure={activeDl.layout.structure}
          instances={activeDl.instances}
          components={components}
          entities={entities}
          globalStyles={globalStyles}
        />
      </div>
    </div>
  );
}
