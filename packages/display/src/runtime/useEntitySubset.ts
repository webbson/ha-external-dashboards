import { useRef } from "react";
import type { EntityState } from "../template/engine.js";

/**
 * Returns a stable object reference containing only the specified entities.
 * The reference only changes when one of the relevant entities actually changes,
 * preventing unnecessary re-renders of memoized consumers.
 */
export function useEntitySubset(
  allEntities: Record<string, EntityState>,
  entityIds: Set<string>
): Record<string, EntityState> {
  const ref = useRef<Record<string, EntityState>>({});

  let changed = false;
  const subset: Record<string, EntityState> = {};

  for (const id of entityIds) {
    const entity = allEntities[id];
    if (entity) {
      subset[id] = entity;
      if (entity !== ref.current[id]) changed = true;
    } else if (id in ref.current) {
      changed = true;
    }
  }

  if (Object.keys(ref.current).length !== Object.keys(subset).length) {
    changed = true;
  }

  if (changed) {
    ref.current = subset;
  }

  return ref.current;
}

/** Extract all entity IDs referenced by a component instance's bindings and visibility rules. */
export function getInstanceEntityIds(
  entityBindings: Record<string, string | string[]>,
  visibilityRules: { entityId: string }[]
): Set<string> {
  const ids = new Set<string>();
  for (const val of Object.values(entityBindings)) {
    if (Array.isArray(val)) {
      for (const v of val) ids.add(v);
    } else if (typeof val === "string" && val.includes(".")) {
      ids.add(val);
    }
  }
  for (const rule of visibilityRules) {
    ids.add(rule.entityId);
  }
  return ids;
}
