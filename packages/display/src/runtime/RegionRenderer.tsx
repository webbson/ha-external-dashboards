import { useMemo } from "react";
import { ComponentRenderer } from "./ComponentRenderer.js";
import { TabsContainer } from "./TabsContainer.js";
import { AutoRotateContainer } from "./AutoRotateContainer.js";
import { VisibilityGate } from "./VisibilityGate.js";
import { useEntitySubset, getInstanceEntityIds } from "./useEntitySubset.js";
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
  applyChrome?: boolean;
}

export function RegionRenderer({
  regionId,
  instances,
  components,
  entities,
  globalStyles,
  flexGrow,
  applyChrome,
}: RegionRendererProps) {
  const regionInstances = instances
    .filter((i) => i.regionId === regionId && i.parentInstanceId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      {regionInstances.map((inst) => {
        const comp = components[inst.componentId];
        if (!comp) return null;

        return (
          <InstanceRenderer
            key={inst.id}
            inst={inst}
            comp={comp}
            allInstances={instances}
            components={components}
            entities={entities}
            globalStyles={globalStyles}
            flexGrow={flexGrow}
            applyChrome={applyChrome}
          />
        );
      })}
    </>
  );
}

interface InstanceRendererProps {
  inst: ComponentInstance;
  comp: ComponentDef;
  allInstances: ComponentInstance[];
  components: Record<number, ComponentDef>;
  entities: Record<string, EntityState>;
  globalStyles: Record<string, string>;
  flexGrow?: boolean;
  applyChrome?: boolean;
}

function InstanceRenderer({
  inst,
  comp,
  allInstances,
  components,
  entities,
  globalStyles,
  flexGrow,
  applyChrome,
}: InstanceRendererProps) {
  const entityIds = useMemo(
    () => getInstanceEntityIds(inst.entityBindings, inst.visibilityRules),
    [inst.entityBindings, inst.visibilityRules]
  );
  const entitySubset = useEntitySubset(entities, entityIds);
  const parameterValues = useMemo(
    () => ({ ...inst.entityBindings, ...inst.parameterValues }),
    [inst.entityBindings, inst.parameterValues]
  );

  if (comp.isContainer && comp.containerConfig) {
    const childInstances = allInstances
      .filter((i) => i.parentInstanceId === inst.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const containerContent =
      comp.containerConfig.type === "tabs" ? (
        <TabsContainer
          children={childInstances}
          components={components}
          entities={entities}
          globalStyles={globalStyles}
        />
      ) : comp.containerConfig.type === "auto-rotate" ? (
        <AutoRotateContainer
          children={childInstances}
          components={components}
          entities={entities}
          globalStyles={globalStyles}
          rotateInterval={comp.containerConfig.rotateInterval ?? 10}
        />
      ) : null;

    if (!containerContent) return null;

    const wrapped = (
      <VisibilityGate rules={inst.visibilityRules} entities={entitySubset}>
        {containerContent}
      </VisibilityGate>
    );

    if (flexGrow) {
      return (
        <div style={{ flexGrow: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {wrapped}
        </div>
      );
    }
    return wrapped;
  }

  const content = (
    <VisibilityGate rules={inst.visibilityRules} entities={entitySubset}>
      <ComponentRenderer
        template={comp.template}
        styles={comp.styles}
        entities={entitySubset}
        parameterValues={parameterValues}
        globalStyles={globalStyles}
        instanceId={inst.id}
        fillRegion={flexGrow}
        applyChrome={applyChrome}
      />
    </VisibilityGate>
  );

  if (flexGrow) {
    return (
      <div style={{ flexGrow: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {content}
      </div>
    );
  }

  return content;
}
