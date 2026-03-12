import { useState, useEffect } from "react";
import { RegionRenderer } from "./RegionRenderer.js";
import type { EntityState } from "../template/engine.js";

const BREAKPOINTS = [
  { name: "tv" as const, min: 1600 },
  { name: "desktop" as const, min: 1024 },
  { name: "tablet" as const, min: 600 },
  { name: "mobile" as const, min: 0 },
] as const;

interface LayoutStructure {
  gridTemplate?: string;
  gridTemplates?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
    tv?: string;
  };
  regions: {
    id: string;
    gridArea?: string;
    flexDirection?: "column" | "row";
    justifyContent?: string;
    alignItems?: string;
    flexGrow?: boolean;
    applyChromeTo?: "components" | "region";
  }[];
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

interface LayoutRendererProps {
  structure: LayoutStructure;
  instances: ComponentInstance[];
  components: Record<number, ComponentDef>;
  entities: Record<string, EntityState>;
  globalStyles: Record<string, string>;
  globExpansions: Record<string, string[]>;
}

function resolveGridTemplate(structure: LayoutStructure, viewportWidth: number): string {
  if (structure.gridTemplates) {
    for (const bp of BREAKPOINTS) {
      if (viewportWidth >= bp.min && structure.gridTemplates[bp.name]) {
        return structure.gridTemplates[bp.name]!;
      }
    }
  }
  return structure.gridTemplate ?? "";
}

export function LayoutRenderer({
  structure,
  instances,
  components,
  entities,
  globalStyles,
  globExpansions,
}: LayoutRendererProps) {
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const handler = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return (
    <div
      style={{
        display: "grid",
        gridTemplate: resolveGridTemplate(structure, viewportWidth),
        width: "100%",
        height: "100%",
        gap: 8,
      }}
    >
      {structure.regions.map((region) => {
        const chromeOnRegion = region.applyChromeTo === "region";
        return (
        <div
          key={region.id}
          style={{
            gridArea: region.gridArea ?? region.id,
            overflow: "hidden",
            display: "flex",
            flexDirection: region.flexDirection ?? "column",
            justifyContent: region.justifyContent ?? "flex-start",
            alignItems: region.alignItems ?? "stretch",
            gap: "var(--db-component-gap, 0px)",
            ...(chromeOnRegion ? {
              background: "var(--db-component-bg, transparent)",
              border: "var(--db-border-style, none)",
              borderRadius: "var(--db-border-radius, 0px)",
              padding: "var(--db-component-padding, 0px)",
            } : {}),
          }}
        >
          <RegionRenderer
            regionId={region.id}
            instances={instances}
            components={components}
            entities={entities}
            globalStyles={globalStyles}
            globExpansions={globExpansions}
            flexGrow={region.flexGrow}
            applyChrome={!chromeOnRegion}
          />
        </div>
        );
      })}
    </div>
  );
}
