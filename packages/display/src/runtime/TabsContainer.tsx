import { useState, useMemo } from "react";
import Icon from "@mdi/react";
import * as mdiIcons from "@mdi/js";
import { ComponentRenderer } from "./ComponentRenderer.js";
import { VisibilityGate } from "./VisibilityGate.js";
import { useEntitySubsetWithDerived, getInstanceEntityIds } from "./useEntitySubset.js";
import type { EntityState } from "../template/engine.js";

interface ChildInstance {
  id: number;
  componentId: number;
  sortOrder: number;
  parameterValues: Record<string, string | number | boolean>;
  entityBindings: Record<string, string | string[]>;
  visibilityRules: {
    entityId: string;
    attribute?: string;
    operator: string;
    value: string;
  }[];
  tabLabel: string | null;
  tabIcon: string | null;
}

interface ComponentDef {
  id: number;
  template: string;
  styles: string;
}

interface TabsContainerProps {
  children: ChildInstance[];
  components: Record<number, ComponentDef>;
  entities: Record<string, EntityState>;
  globalStyles: Record<string, string>;
  globExpansions: Record<string, string[]>;
}

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

export function TabsContainer({
  children,
  components,
  entities,
  globalStyles,
  globExpansions,
}: TabsContainerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const sorted = [...children].sort((a, b) => a.sortOrder - b.sortOrder);
  const activeChild = sorted[activeIndex];

  if (sorted.length === 0) return null;

  const fontColor =
    globalStyles["--db-font-color"] ?? globalStyles.fontColor ?? "#fff";
  const fontColorSecondary =
    globalStyles["--db-font-color-secondary"] ??
    globalStyles.fontColorSecondary ??
    "#aaa";
  const accentColor =
    globalStyles["--db-accent-color"] ?? globalStyles.accentColor ?? "#4fc3f7";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `1px solid ${fontColorSecondary}33`,
          flexShrink: 0,
        }}
      >
        {sorted.map((child, i) => {
          const isActive = i === activeIndex;
          const iconPath = child.tabIcon
            ? getIconPath(child.tabIcon)
            : undefined;
          const comp = components[child.componentId];
          const label =
            child.tabLabel || (comp ? "Tab " + (i + 1) : "Tab");

          return (
            <button
              key={child.id}
              onClick={() => setActiveIndex(i)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: isActive
                  ? `2px solid ${accentColor}`
                  : "2px solid transparent",
                padding: "8px 16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: isActive ? accentColor : fontColorSecondary,
                fontFamily: "inherit",
                fontSize: "inherit",
                transition: "color 0.2s, border-color 0.2s",
              }}
            >
              {iconPath && (
                <Icon
                  path={iconPath}
                  size={0.7}
                  color={isActive ? accentColor : fontColorSecondary}
                />
              )}
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {activeChild && (
          <TabChildRenderer
            child={activeChild}
            components={components}
            entities={entities}
            globalStyles={globalStyles}
            globExpansions={globExpansions}
          />
        )}
      </div>
    </div>
  );
}

function TabChildRenderer({
  child,
  components,
  entities,
  globalStyles,
  globExpansions,
}: {
  child: ChildInstance;
  components: Record<number, ComponentDef>;
  entities: Record<string, EntityState>;
  globalStyles: Record<string, string>;
  globExpansions: Record<string, string[]>;
}) {
  const comp = components[child.componentId];
  const entityIds = useMemo(
    () => getInstanceEntityIds(child.entityBindings, child.visibilityRules, globExpansions, child.id),
    [child.entityBindings, child.visibilityRules, globExpansions, child.id]
  );
  const [entitySubset, addDerivedIds] = useEntitySubsetWithDerived(entities, entityIds);
  const parameterValues = useMemo(
    () => ({ ...child.entityBindings, ...child.parameterValues }),
    [child.entityBindings, child.parameterValues]
  );

  if (!comp) return null;

  return (
    <VisibilityGate rules={child.visibilityRules} entities={entitySubset}>
      <ComponentRenderer
        template={comp.template}
        styles={comp.styles}
        entities={entitySubset}
        parameterValues={parameterValues}
        globalStyles={globalStyles}
        globExpansions={globExpansions}
        instanceId={child.id}
        onDerivedEntities={addDerivedIds}
      />
    </VisibilityGate>
  );
}
