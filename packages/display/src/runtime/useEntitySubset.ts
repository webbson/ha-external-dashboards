import { useRef, useState, useCallback } from "react";
import type { EntityState } from "../template/engine.js";

function isGlobPattern(value: string): boolean {
  return value.includes("*") || value.includes("?");
}

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

/**
 * Like useEntitySubset, but also includes dynamically discovered derived entities.
 * Returns the subset plus a callback to add derived entity IDs after render.
 */
export function useEntitySubsetWithDerived(
  allEntities: Record<string, EntityState>,
  entityIds: Set<string>
): [Record<string, EntityState>, (ids: string[]) => void] {
  const ref = useRef<Record<string, EntityState>>({});
  const [derivedIds, setDerivedIds] = useState<Set<string>>(new Set());

  const addDerivedIds = useCallback((ids: string[]) => {
    setDerivedIds((prev) => {
      const hasNew = ids.some((id) => !prev.has(id));
      if (!hasNew) return prev;
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  let changed = false;
  const subset: Record<string, EntityState> = {};

  // Include bound entities
  for (const id of entityIds) {
    const entity = allEntities[id];
    if (entity) {
      subset[id] = entity;
      if (entity !== ref.current[id]) changed = true;
    } else if (id in ref.current) {
      changed = true;
    }
  }

  // Include derived entities
  for (const id of derivedIds) {
    if (entityIds.has(id)) continue; // already handled
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

  return [ref.current, addDerivedIds];
}

/** Extract all entity IDs referenced by a component instance's bindings and visibility rules. */
export function getInstanceEntityIds(
  entityBindings: Record<string, string | string[]>,
  visibilityRules: { entityId: string }[],
  globExpansions?: Record<string, string[]>,
  instanceId?: number
): Set<string> {
  const ids = new Set<string>();
  for (const [selectorName, val] of Object.entries(entityBindings)) {
    if (Array.isArray(val)) {
      for (const v of val) ids.add(v);
    } else if (typeof val === "string" && isGlobPattern(val)) {
      // Expand using server-provided instance-scoped expansions
      const key = instanceId != null ? `${instanceId}:${selectorName}` : val;
      const expanded = globExpansions?.[key] ?? [];
      for (const id of expanded) ids.add(id);
    } else if (typeof val === "string" && val.includes(".")) {
      ids.add(val);
    }
  }
  for (const rule of visibilityRules) {
    ids.add(rule.entityId);
  }
  return ids;
}
