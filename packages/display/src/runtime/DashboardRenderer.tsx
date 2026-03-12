import { useState, useEffect, useRef } from "react";
import { LayoutRenderer } from "./LayoutRenderer.js";
import type { EntityState } from "../template/engine.js";
import { getIconPath } from "../icons/icon-resolver.js";

interface VisibilityRule {
  entityId: string;
  attribute?: string;
  operator: string;
  value: string;
}

interface DashboardLayout {
  id: number;
  layoutId: number;
  sortOrder: number;
  label: string | null;
  icon: string | null;
  visibilityRules?: VisibilityRule[] | null;
  hideInTabBar?: boolean | null;
  autoReturn?: boolean | null;
  autoReturnDelay?: number | null;
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
  globExpansions: Record<string, string[]>;
  maxWidth?: string | null;
  padding?: string | null;
  layoutSwitchMode: "tabs" | "auto-rotate";
  layoutRotateInterval: number;
  switchLayoutMsg?: { layoutId: number; autoReturn?: boolean; autoReturnDelay?: number } | null;
  onSwitchLayoutHandled?: () => void;
}

function evaluateVisibilityRule(
  rule: VisibilityRule,
  entities: Record<string, EntityState>
): boolean {
  const entity = entities[rule.entityId];
  if (!entity) return false;
  const actual = rule.attribute
    ? String(entity.attributes[rule.attribute] ?? "")
    : entity.state;
  const expected = rule.value;
  switch (rule.operator) {
    case "eq": return actual === expected;
    case "neq": return actual !== expected;
    case "gt": return parseFloat(actual) > parseFloat(expected);
    case "lt": return parseFloat(actual) < parseFloat(expected);
    case "gte": return parseFloat(actual) >= parseFloat(expected);
    case "lte": return parseFloat(actual) <= parseFloat(expected);
    default: return true;
  }
}

function isTabVisible(dl: DashboardLayout, entityStates: Record<string, EntityState>): boolean {
  if (!dl.visibilityRules?.length) return true;
  return dl.visibilityRules.every((r) => evaluateVisibilityRule(r, entityStates));
}

export function DashboardRenderer({
  dashboardLayouts,
  components,
  entities,
  globalStyles,
  globExpansions,
  maxWidth,
  padding,
  layoutSwitchMode,
  layoutRotateInterval,
  switchLayoutMsg,
  onSwitchLayoutHandled,
}: DashboardRendererProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const autoReturnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevActiveIndexRef = useRef<number>(0);
  const prevVisibilityRef = useRef<Record<number, boolean>>({});

  function switchToTabWithAutoReturn(newIndex: number, dl: DashboardLayout) {
    if (autoReturnTimerRef.current) clearTimeout(autoReturnTimerRef.current);
    prevActiveIndexRef.current = activeIndex;
    setActiveIndex(newIndex);
    if (dl.autoReturn) {
      autoReturnTimerRef.current = setTimeout(() => {
        setActiveIndex(prevActiveIndexRef.current);
      }, (dl.autoReturnDelay ?? 10) * 1000);
    }
  }

  // Cleanup: clear autoReturn timer on unmount
  useEffect(() => {
    return () => {
      if (autoReturnTimerRef.current) clearTimeout(autoReturnTimerRef.current);
    };
  }, []);

  // Auto-switch when tab visibility changes
  useEffect(() => {
    dashboardLayouts.forEach((dl, i) => {
      const wasVisible = prevVisibilityRef.current[dl.id] ?? true;
      const isVisible = isTabVisible(dl, entities);

      if (!wasVisible && isVisible) {
        // Tab just became visible — switch to it
        if (autoReturnTimerRef.current) {
          clearTimeout(autoReturnTimerRef.current);
          autoReturnTimerRef.current = null;
        }
        setActiveIndex(i);
      }
      if (wasVisible && !isVisible && activeIndex === i) {
        // Active tab just became hidden — switch to first visible tab
        const firstVisible = dashboardLayouts.findIndex((d, j) => j !== i && isTabVisible(d, entities));
        if (firstVisible >= 0) setActiveIndex(firstVisible);
      }

      prevVisibilityRef.current[dl.id] = isVisible;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities]);

  // Handle WS switch_layout message
  useEffect(() => {
    if (!switchLayoutMsg) return;
    const idx = dashboardLayouts.findIndex((dl) => dl.layoutId === switchLayoutMsg.layoutId);
    if (idx >= 0) {
      const dl = dashboardLayouts[idx];
      switchToTabWithAutoReturn(idx, {
        ...dl,
        autoReturn: switchLayoutMsg.autoReturn ?? dl.autoReturn,
        autoReturnDelay: switchLayoutMsg.autoReturnDelay ?? dl.autoReturnDelay,
      });
    }
    onSwitchLayoutHandled?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [switchLayoutMsg]);

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

  // Use CSS variables set by DisplayApp (always includes defaults)
  const tabBarBg = "var(--db-tab-bar-bg, transparent)";
  const tabBarColor = "var(--db-tab-bar-color, rgba(255,255,255,0.6))";
  const tabBarActiveColor = "var(--db-tab-bar-active-color, #ffffff)";
  const tabBarActiveBg = "var(--db-tab-bar-active-bg, rgba(255,255,255,0.15))";
  const tabBarFontSize = "var(--db-tab-bar-font-size, 14px)";

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
            if (dl.hideInTabBar) return null;
            const isActive = i === activeIndex;
            const iconPath = dl.icon ? getIconPath(dl.icon) : undefined;
            return (
              <button
                key={dl.id}
                onClick={() => switchToTabWithAutoReturn(i, dl)}
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
                  <svg viewBox="0 0 24 24" width="1em" height="1em" style={{ fill: "currentColor", verticalAlign: "middle" }}>
                    <path d={iconPath} />
                  </svg>
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
          globExpansions={globExpansions}
        />
      </div>
    </div>
  );
}
