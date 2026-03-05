import { ComponentRenderer } from "./ComponentRenderer.js";
import { VisibilityGate } from "./VisibilityGate.js";
import type { EntityState } from "../template/engine.js";

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

interface RegionRendererProps {
  regionId: string;
  instances: ComponentInstance[];
  components: Record<number, ComponentDef>;
  entities: Record<string, EntityState>;
  globalStyles: Record<string, string>;
}

export function RegionRenderer({
  regionId,
  instances,
  components,
  entities,
  globalStyles,
}: RegionRendererProps) {
  const regionInstances = instances
    .filter((i) => i.regionId === regionId && i.parentInstanceId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      {regionInstances.map((inst) => {
        const comp = components[inst.componentId];
        if (!comp) return null;

        return (
          <VisibilityGate
            key={inst.id}
            rules={inst.visibilityRules}
            entities={entities}
          >
            <ComponentRenderer
              template={comp.template}
              styles={comp.styles}
              entities={entities}
              parameterValues={{ ...inst.entityBindings, ...inst.parameterValues }}
              globalStyles={globalStyles}
              instanceId={inst.id}
            />
          </VisibilityGate>
        );
      })}
    </div>
  );
}
