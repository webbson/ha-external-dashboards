import { RegionRenderer } from "./RegionRenderer.js";
import type { EntityState } from "../template/engine.js";

interface LayoutStructure {
  gridTemplate: string;
  regions: { id: string; label: string; gridArea?: string }[];
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
}

export function LayoutRenderer({
  structure,
  instances,
  components,
  entities,
  globalStyles,
}: LayoutRendererProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplate: structure.gridTemplate,
        width: "100%",
        height: "100%",
        gap: 8,
      }}
    >
      {structure.regions.map((region) => (
        <div key={region.id} style={{ gridArea: region.gridArea ?? region.id, overflow: "hidden" }}>
          <RegionRenderer
            regionId={region.id}
            instances={instances}
            components={components}
            entities={entities}
            globalStyles={globalStyles}
          />
        </div>
      ))}
    </div>
  );
}
