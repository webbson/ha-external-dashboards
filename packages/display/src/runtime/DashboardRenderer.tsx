import { useState, useEffect, useCallback } from "react";
import { LayoutRenderer } from "./LayoutRenderer.js";
import type { EntityState } from "../template/engine.js";

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

interface DashboardRendererProps {
  dashboardLayouts: DashboardLayout[];
  components: Record<number, ComponentDef>;
  entities: Record<string, EntityState>;
  globalStyles: Record<string, string>;
  layoutSwitchMode: "tabs" | "auto-rotate";
  layoutRotateInterval: number;
}

export function DashboardRenderer({
  dashboardLayouts,
  components,
  entities,
  globalStyles,
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

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      {layoutSwitchMode === "tabs" && dashboardLayouts.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: "4px 8px",
            background: "rgba(255,255,255,0.05)",
          }}
        >
          {dashboardLayouts.map((dl, i) => (
            <button
              key={dl.id}
              onClick={() => setActiveIndex(i)}
              style={{
                padding: "6px 16px",
                border: "none",
                borderRadius: 4,
                background:
                  i === activeIndex
                    ? "rgba(255,255,255,0.15)"
                    : "transparent",
                color: i === activeIndex ? "#fff" : "#aaa",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              {dl.label ?? `Layout ${i + 1}`}
            </button>
          ))}
        </div>
      )}
      <div style={{ flex: 1, height: layoutSwitchMode === "tabs" && dashboardLayouts.length > 1 ? "calc(100vh - 40px)" : "100vh" }}>
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
