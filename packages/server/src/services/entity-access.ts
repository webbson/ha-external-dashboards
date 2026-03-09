import { db } from "../db/connection.js";
import {
  dashboards,
  dashboardLayouts,
  dashboardEntityAccess,
  componentInstances,
  components,
} from "../db/schema.js";
import { eq, inArray } from "drizzle-orm";
import { isGlobPattern, matchGlob } from "@ha-external-dashboards/shared";
import { parseDeriveEntityCalls } from "./derive-parser.js";

// Re-export for tests and other consumers
export { parseDeriveEntityCalls } from "./derive-parser.js";

interface AccessEntry {
  pattern: string;
  type: "entity" | "glob" | "derived" | "derived_glob";
  source: string;
}

/**
 * Apply a deriveEntity transformation to a concrete entity ID.
 * sensor.kitchen_temp + ("binary_sensor", "_status") → binary_sensor.kitchen_temp_status
 */
function deriveEntityId(entityId: string, newDomain: string, suffix: string): string {
  const dotIdx = entityId.indexOf(".");
  const baseName = dotIdx >= 0 ? entityId.slice(dotIdx + 1) : entityId;
  return `${newDomain}.${baseName}${suffix}`;
}

/**
 * Apply a deriveEntity transformation to a glob pattern.
 * sensor.cpd_* + ("binary_sensor", "_status") → binary_sensor.cpd_*_status
 */
function deriveGlobPattern(globPattern: string, newDomain: string, suffix: string): string {
  const dotIdx = globPattern.indexOf(".");
  const globBase = dotIdx >= 0 ? globPattern.slice(dotIdx + 1) : globPattern;
  return `${newDomain}.${globBase}${suffix}`;
}

/**
 * Collect all entity access entries for a single dashboard.
 */
async function collectAccessEntries(dashboardId: number): Promise<AccessEntry[]> {
  const entries: AccessEntry[] = [];
  const seen = new Set<string>();

  function add(pattern: string, type: AccessEntry["type"], source: string) {
    const key = `${type}:${pattern}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({ pattern, type, source });
  }

  // Get dashboard for blackout entity
  const [dashboard] = await db
    .select()
    .from(dashboards)
    .where(eq(dashboards.id, dashboardId));

  if (!dashboard) return entries;

  // Blackout entity
  if (dashboard.blackoutEntity) {
    add(dashboard.blackoutEntity, "entity", "blackout");
  }

  // Get all dashboard layouts
  const dls = await db
    .select()
    .from(dashboardLayouts)
    .where(eq(dashboardLayouts.dashboardId, dashboardId));

  if (dls.length === 0) return entries;

  // Get all component instances across all layouts
  const dlIds = dls.map((dl) => dl.id);
  const instances = await db
    .select()
    .from(componentInstances)
    .where(inArray(componentInstances.dashboardLayoutId, dlIds));

  // Load component templates for deriveEntity parsing (batch)
  const componentIds = [...new Set(instances.map((i) => i.componentId))];
  const componentMap = new Map<number, string>();
  if (componentIds.length > 0) {
    const comps = await db
      .select({ id: components.id, template: components.template })
      .from(components)
      .where(inArray(components.id, componentIds));
    for (const c of comps) {
      componentMap.set(c.id, c.template);
    }
  }

  for (const inst of instances) {
    const bindings = inst.entityBindings as Record<string, string | string[]>;
    const template = componentMap.get(inst.componentId) ?? "";
    const deriveCalls = template ? parseDeriveEntityCalls(template) : [];

    for (const [selectorName, val] of Object.entries(bindings)) {
      if (Array.isArray(val)) {
        // Multiple entity bindings
        for (const entityId of val) {
          add(entityId, "entity", `binding:${selectorName}`);
        }
        // Apply derives to each element
        for (const dc of deriveCalls) {
          if (dc.selectorName === selectorName) {
            for (const entityId of val) {
              const derived = deriveEntityId(entityId, dc.newDomain, dc.suffix);
              add(derived, "derived", `derive:${dc.newDomain}+${dc.suffix}`);
            }
          }
        }
      } else if (isGlobPattern(val)) {
        // Glob pattern binding
        add(val, "glob", `binding:${selectorName}`);
        // Apply derives to glob
        for (const dc of deriveCalls) {
          if (dc.selectorName === selectorName) {
            const derivedGlob = deriveGlobPattern(val, dc.newDomain, dc.suffix);
            add(derivedGlob, "derived_glob", `derive:${dc.newDomain}+${dc.suffix}`);
          }
        }
      } else {
        // Single entity binding
        add(val, "entity", `binding:${selectorName}`);
        // Apply derives to concrete entity
        for (const dc of deriveCalls) {
          if (dc.selectorName === selectorName) {
            const derived = deriveEntityId(val, dc.newDomain, dc.suffix);
            add(derived, "derived", `derive:${dc.newDomain}+${dc.suffix}`);
          }
        }
      }
    }

    // Visibility rule entities
    const rules = inst.visibilityRules as { entityId: string }[];
    for (const rule of rules) {
      add(rule.entityId, "entity", "visibility");
    }
  }

  return entries;
}

/**
 * Recompute entity access for a single dashboard.
 * Deletes all existing rows and re-inserts.
 */
export async function recomputeEntityAccess(dashboardId: number): Promise<void> {
  const entries = await collectAccessEntries(dashboardId);

  await db.delete(dashboardEntityAccess).where(
    eq(dashboardEntityAccess.dashboardId, dashboardId)
  );

  if (entries.length > 0) {
    await db.insert(dashboardEntityAccess).values(
      entries.map((e) => ({
        dashboardId,
        pattern: e.pattern,
        type: e.type,
        source: e.source,
      }))
    );
  }
}

/**
 * Batch recompute entity access for multiple dashboards.
 */
export async function recomputeEntityAccessForDashboards(dashboardIds: number[]): Promise<void> {
  for (const id of dashboardIds) {
    await recomputeEntityAccess(id);
  }
}

/**
 * Recompute entity access for ALL dashboards (startup backfill).
 */
export async function recomputeAllEntityAccess(): Promise<void> {
  const allDashboards = await db.select({ id: dashboards.id }).from(dashboards);
  for (const d of allDashboards) {
    await recomputeEntityAccess(d.id);
  }
  console.log(`[entity-access] Backfilled access for ${allDashboards.length} dashboards`);
}

/**
 * Get entity access patterns for a dashboard.
 * Returns concrete entities and glob patterns separately for efficient checking.
 */
export async function getEntityAccessPatterns(dashboardId: number): Promise<{
  entities: Set<string>;
  globs: string[];
}> {
  const rows = await db
    .select()
    .from(dashboardEntityAccess)
    .where(eq(dashboardEntityAccess.dashboardId, dashboardId));

  const entities = new Set<string>();
  const globs: string[] = [];

  for (const row of rows) {
    if (row.type === "entity" || row.type === "derived") {
      entities.add(row.pattern);
    } else {
      globs.push(row.pattern);
    }
  }

  return { entities, globs };
}

/**
 * Check if a single entity is allowed for a dashboard.
 */
export async function isEntityAllowed(dashboardId: number, entityId: string): Promise<boolean> {
  const { entities, globs } = await getEntityAccessPatterns(dashboardId);
  if (entities.has(entityId)) return true;
  return globs.some((g) => matchGlob(g, [entityId]).length > 0);
}

/**
 * Filter a list of entity IDs to only those allowed for a dashboard.
 */
export async function filterAllowedEntities(dashboardId: number, entityIds: string[]): Promise<string[]> {
  const { entities, globs } = await getEntityAccessPatterns(dashboardId);
  return entityIds.filter((id) => {
    if (entities.has(id)) return true;
    return globs.some((g) => matchGlob(g, [id]).length > 0);
  });
}

/**
 * Find all dashboard IDs affected by a component change.
 */
export async function findDashboardsByComponent(componentId: number): Promise<number[]> {
  const affected = await db
    .selectDistinct({ dashboardId: dashboardLayouts.dashboardId })
    .from(componentInstances)
    .innerJoin(
      dashboardLayouts,
      eq(componentInstances.dashboardLayoutId, dashboardLayouts.id)
    )
    .where(eq(componentInstances.componentId, componentId));
  return affected.map((r) => r.dashboardId);
}

/**
 * Find all dashboard IDs affected by a layout change.
 */
export async function findDashboardsByLayout(layoutId: number): Promise<number[]> {
  const affected = await db
    .selectDistinct({ dashboardId: dashboardLayouts.dashboardId })
    .from(dashboardLayouts)
    .where(eq(dashboardLayouts.layoutId, layoutId));
  return affected.map((r) => r.dashboardId);
}

/**
 * Find the dashboard ID for a given dashboard layout ID.
 */
export async function findDashboardByLayoutId(dashboardLayoutId: number): Promise<number | null> {
  const [row] = await db
    .select({ dashboardId: dashboardLayouts.dashboardId })
    .from(dashboardLayouts)
    .where(eq(dashboardLayouts.id, dashboardLayoutId));
  return row?.dashboardId ?? null;
}
