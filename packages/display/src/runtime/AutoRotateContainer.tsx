import { useState, useEffect, useMemo } from "react";
import { ComponentRenderer } from "./ComponentRenderer.js";
import { VisibilityGate } from "./VisibilityGate.js";
import { useEntitySubset, getInstanceEntityIds } from "./useEntitySubset.js";
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
}

interface ComponentDef {
  id: number;
  template: string;
  styles: string;
}

interface AutoRotateContainerProps {
  children: ChildInstance[];
  components: Record<number, ComponentDef>;
  entities: Record<string, EntityState>;
  globalStyles: Record<string, string>;
  rotateInterval: number;
}

export function AutoRotateContainer({
  children,
  components,
  entities,
  globalStyles,
  rotateInterval,
}: AutoRotateContainerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const sorted = [...children].sort((a, b) => a.sortOrder - b.sortOrder);

  useEffect(() => {
    if (sorted.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % sorted.length);
    }, rotateInterval * 1000);
    return () => clearInterval(timer);
  }, [sorted.length, rotateInterval]);

  if (sorted.length === 0) return null;

  const activeChild = sorted[activeIndex % sorted.length];
  const comp = components[activeChild?.componentId];
  if (!activeChild || !comp) return null;

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <AutoRotateChildRenderer
        child={activeChild}
        comp={comp}
        entities={entities}
        globalStyles={globalStyles}
      />
    </div>
  );
}

function AutoRotateChildRenderer({
  child,
  comp,
  entities,
  globalStyles,
}: {
  child: ChildInstance;
  comp: ComponentDef;
  entities: Record<string, EntityState>;
  globalStyles: Record<string, string>;
}) {
  const entityIds = useMemo(
    () => getInstanceEntityIds(child.entityBindings, child.visibilityRules),
    [child.entityBindings, child.visibilityRules]
  );
  const entitySubset = useEntitySubset(entities, entityIds);
  const parameterValues = useMemo(
    () => ({ ...child.entityBindings, ...child.parameterValues }),
    [child.entityBindings, child.parameterValues]
  );

  return (
    <VisibilityGate rules={child.visibilityRules} entities={entitySubset}>
      <ComponentRenderer
        template={comp.template}
        styles={comp.styles}
        entities={entitySubset}
        parameterValues={parameterValues}
        globalStyles={globalStyles}
        instanceId={child.id}
      />
    </VisibilityGate>
  );
}
