import { ComponentRenderer } from "./ComponentRenderer.js";
import { TabsContainer } from "./TabsContainer.js";
import { AutoRotateContainer } from "./AutoRotateContainer.js";
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
  tabLabel: string | null;
  tabIcon: string | null;
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
  flexGrow?: boolean;
}

export function RegionRenderer({
  regionId,
  instances,
  components,
  entities,
  globalStyles,
  flexGrow,
}: RegionRendererProps) {
  const regionInstances = instances
    .filter((i) => i.regionId === regionId && i.parentInstanceId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      {regionInstances.map((inst) => {
        const comp = components[inst.componentId];
        if (!comp) return null;

        if (comp.isContainer && comp.containerConfig) {
          const childInstances = instances
            .filter((i) => i.parentInstanceId === inst.id)
            .sort((a, b) => a.sortOrder - b.sortOrder);

          const containerContent =
            comp.containerConfig.type === "tabs" ? (
              <TabsContainer
                key={inst.id}
                children={childInstances}
                components={components}
                entities={entities}
                globalStyles={globalStyles}
              />
            ) : comp.containerConfig.type === "auto-rotate" ? (
              <AutoRotateContainer
                key={inst.id}
                children={childInstances}
                components={components}
                entities={entities}
                globalStyles={globalStyles}
                rotateInterval={comp.containerConfig.rotateInterval ?? 10}
              />
            ) : null;

          if (!containerContent) return null;

          const wrapped = (
            <VisibilityGate key={inst.id} rules={inst.visibilityRules} entities={entities}>
              {containerContent}
            </VisibilityGate>
          );

          if (flexGrow) {
            return (
              <div key={inst.id} style={{ flexGrow: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column" }}>
                {wrapped}
              </div>
            );
          }
          return wrapped;
        }

        const content = (
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
              fillRegion={flexGrow}
            />
          </VisibilityGate>
        );

        if (flexGrow) {
          return (
            <div key={inst.id} style={{ flexGrow: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column" }}>
              {content}
            </div>
          );
        }

        return content;
      })}
    </>
  );
}
