# Themes, Region Chrome, Asset Folders & Cleanup — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract dashboard styling into reusable themes, move component chrome to region-level, add asset folders, simplify popups to ephemeral-only, add cascade reloads and delete protection with usage counts.

**Architecture:** New `themes` table replaces dashboard-level styling. Region `applyChromeTo` field controls whether theme chrome wraps individual components or entire regions. Popups table dropped; trigger endpoint becomes standalone. All entity list endpoints gain computed usage counts; delete endpoints return 409 when in use. Saving components/layouts/themes triggers reload on affected dashboards.

**Tech Stack:** SQLite + Drizzle ORM, Fastify, React + Ant Design, Zod validation

---

### Task 1: Add themes table and migrate dashboard styles

**Files:**
- Modify: `packages/server/src/db/schema.ts`
- Modify: `packages/shared/src/types/index.ts`

**Step 1: Add themes table to schema**

In `packages/server/src/db/schema.ts`, add after the `dashboards` table definition (after line 42):

```typescript
export const themes = sqliteTable("themes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  standardVariables: text("standard_variables", { mode: "json" })
    .$type<Record<string, string>>()
    .notNull()
    .default(sql`'{}'`),
  globalStyles: text("global_styles", { mode: "json" })
    .$type<Record<string, string>>()
    .notNull()
    .default(sql`'{}'`),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
```

**Step 2: Add themeId to dashboards, remove style columns**

In the `dashboards` table definition, remove:
- `globalStyles` (lines 20-23)
- `standardVariables` (lines 24-27)

Add:
```typescript
themeId: integer("theme_id").references(() => themes.id),
```

**Step 3: Remove PopupContent from shared types**

In `packages/shared/src/types/index.ts`, remove the `PopupContent` interface (lines 46-50). It's no longer needed since popups won't be persisted.

**Step 4: Generate the migration**

Run: `pnpm -w run db:generate`

This will generate a migration that:
- Creates the `themes` table
- Adds `theme_id` column to `dashboards`
- Drops `global_styles` and `standard_variables` from `dashboards`
- Drops the `popups` table (from Task 4)

**Important:** The auto-generated migration won't handle data migration. We need a manual step.

**Step 5: Edit the generated migration to migrate existing data**

Before the `ALTER TABLE dashboards DROP COLUMN` statements, add SQL to:
1. Create themes from existing dashboard styles
2. Link dashboards to their new themes

Add this before the column drops:

```sql
-- Migrate existing dashboard styles to themes
INSERT INTO themes (name, standard_variables, global_styles, created_at, updated_at)
SELECT
  name || ' Theme',
  standard_variables,
  global_styles,
  datetime('now'),
  datetime('now')
FROM dashboards
WHERE standard_variables != '{}' OR global_styles != '{}';

-- Link dashboards to their themes (match by name)
UPDATE dashboards SET theme_id = (
  SELECT t.id FROM themes t
  WHERE t.name = dashboards.name || ' Theme'
) WHERE standard_variables != '{}' OR global_styles != '{}';
```

**Step 6: Commit**

```bash
git add packages/server/src/db/schema.ts packages/shared/src/types/index.ts drizzle/
git commit -m "feat: add themes table, migrate dashboard styles to themes"
```

---

### Task 2: Theme CRUD routes with usage counts and delete protection

**Files:**
- Create: `packages/server/src/routes/themes.ts`
- Modify: `packages/server/src/index.ts`

**Step 1: Create theme routes**

Create `packages/server/src/routes/themes.ts`:

```typescript
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/connection.js";
import { themes, dashboards } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { broadcastReloadForDashboards } from "../ws/popup-broadcast.js";

const createSchema = z.object({
  name: z.string().min(1),
  standardVariables: z.record(z.string()).default({}),
  globalStyles: z.record(z.string()).default({}),
});

const updateSchema = createSchema.partial();

export async function themeRoutes(app: FastifyInstance) {
  // List with usage counts
  app.get("/api/themes", async () => {
    const rows = await db.select().from(themes);
    const counts = await db
      .select({
        themeId: dashboards.themeId,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(dashboards)
      .where(sql`${dashboards.themeId} IS NOT NULL`)
      .groupBy(dashboards.themeId);

    const countMap = new Map(counts.map((c) => [c.themeId, c.count]));
    return rows.map((r) => ({ ...r, usageCount: countMap.get(r.id) ?? 0 }));
  });

  app.get<{ Params: { id: string } }>(
    "/api/themes/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [row] = await db.select().from(themes).where(eq(themes.id, id));
      if (!row) return reply.code(404).send({ error: "Not found" });
      return row;
    }
  );

  app.post("/api/themes", async (req, reply) => {
    const body = createSchema.parse(req.body);
    const [row] = await db.insert(themes).values(body).returning();
    return reply.code(201).send(row);
  });

  app.put<{ Params: { id: string } }>(
    "/api/themes/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const body = updateSchema.parse(req.body);
      const [row] = await db
        .update(themes)
        .set({ ...body, updatedAt: new Date().toISOString() })
        .where(eq(themes.id, id))
        .returning();
      if (!row) return reply.code(404).send({ error: "Not found" });

      // Cascade reload
      const affected = await db
        .select({ id: dashboards.id })
        .from(dashboards)
        .where(eq(dashboards.themeId, id));
      broadcastReloadForDashboards(affected.map((d) => d.id));

      return row;
    }
  );

  app.post<{ Params: { id: string } }>(
    "/api/themes/:id/copy",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [source] = await db.select().from(themes).where(eq(themes.id, id));
      if (!source) return reply.code(404).send({ error: "Not found" });
      const [row] = await db
        .insert(themes)
        .values({
          name: `Copy of ${source.name}`,
          standardVariables: source.standardVariables,
          globalStyles: source.globalStyles,
        })
        .returning();
      return reply.code(201).send(row);
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/api/themes/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [usage] = await db
        .select({ count: sql<number>`count(*)` })
        .from(dashboards)
        .where(eq(dashboards.themeId, id));
      if (usage.count > 0) {
        return reply.code(409).send({
          error: "Theme is in use by dashboards and cannot be deleted",
          usageCount: usage.count,
        });
      }
      const [row] = await db.delete(themes).where(eq(themes.id, id)).returning();
      if (!row) return reply.code(404).send({ error: "Not found" });
      return { success: true };
    }
  );
}
```

**Step 2: Register theme routes in server**

In `packages/server/src/index.ts`, add import:
```typescript
import { themeRoutes } from "./routes/themes.js";
```

Register after component routes (after line 60):
```typescript
await admin.register(themeRoutes);
```

**Step 3: Commit**

```bash
git add packages/server/src/routes/themes.ts packages/server/src/index.ts
git commit -m "feat: add theme CRUD routes with usage counts and delete protection"
```

---

### Task 3: Add cascade reloads and delete protection to components and layouts

**Files:**
- Modify: `packages/server/src/ws/popup-broadcast.ts`
- Modify: `packages/server/src/routes/components.ts`
- Modify: `packages/server/src/routes/layouts.ts`

**Step 1: Add broadcastReloadForDashboards helper**

In `packages/server/src/ws/popup-broadcast.ts`, add:

```typescript
export function broadcastReloadForDashboards(dashboardIds: number[]) {
  for (const id of dashboardIds) {
    broadcastReload(id);
  }
}
```

**Step 2: Add usage counts and delete protection to component routes**

In `packages/server/src/routes/components.ts`:

Add imports:
```typescript
import { components, componentInstances, dashboardLayouts } from "../db/schema.js";
import { eq, sql, inArray } from "drizzle-orm";
import { broadcastReloadForDashboards } from "../ws/popup-broadcast.js";
```

Replace the GET list endpoint to include usage counts:
```typescript
app.get("/api/components", async () => {
  const rows = await db.select().from(components);
  const counts = await db
    .select({
      componentId: componentInstances.componentId,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(componentInstances)
    .groupBy(componentInstances.componentId);

  const countMap = new Map(counts.map((c) => [c.componentId, c.count]));
  return rows.map((r) => ({ ...r, usageCount: countMap.get(r.id) ?? 0 }));
});
```

Add cascade reload to PUT:
```typescript
// After the update succeeds, find affected dashboards
const affectedDls = await db
  .select({ dashboardId: dashboardLayouts.dashboardId })
  .from(componentInstances)
  .innerJoin(dashboardLayouts, eq(componentInstances.dashboardLayoutId, dashboardLayouts.id))
  .where(eq(componentInstances.componentId, id));
const dashIds = [...new Set(affectedDls.map((d) => d.dashboardId))];
broadcastReloadForDashboards(dashIds);
```

Add delete protection:
```typescript
app.delete<{ Params: { id: string } }>(
  "/api/components/:id",
  async (req, reply) => {
    const id = parseInt(req.params.id);
    const [usage] = await db
      .select({ count: sql<number>`count(*)` })
      .from(componentInstances)
      .where(eq(componentInstances.componentId, id));
    if (usage.count > 0) {
      return reply.code(409).send({
        error: "Component is in use and cannot be deleted",
        usageCount: usage.count,
      });
    }
    const [row] = await db
      .delete(components)
      .where(eq(components.id, id))
      .returning();
    if (!row) return reply.code(404).send({ error: "Not found" });
    return { success: true };
  }
);
```

**Step 3: Add usage counts and delete protection to layout routes**

In `packages/server/src/routes/layouts.ts`:

Add imports:
```typescript
import { layouts, dashboardLayouts } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { broadcastReloadForDashboards } from "../ws/popup-broadcast.js";
```

Replace GET list endpoint:
```typescript
app.get("/api/layouts", async () => {
  const rows = await db.select().from(layouts);
  const counts = await db
    .select({
      layoutId: dashboardLayouts.layoutId,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(dashboardLayouts)
    .groupBy(dashboardLayouts.layoutId);

  const countMap = new Map(counts.map((c) => [c.layoutId, c.count]));
  return rows.map((r) => ({ ...r, usageCount: countMap.get(r.id) ?? 0 }));
});
```

Add cascade reload to PUT:
```typescript
// After update succeeds
const affected = await db
  .select({ dashboardId: dashboardLayouts.dashboardId })
  .from(dashboardLayouts)
  .where(eq(dashboardLayouts.layoutId, id));
broadcastReloadForDashboards(affected.map((d) => d.dashboardId));
```

Add delete protection:
```typescript
app.delete<{ Params: { id: string } }>(
  "/api/layouts/:id",
  async (req, reply) => {
    const id = parseInt(req.params.id);
    const [usage] = await db
      .select({ count: sql<number>`count(*)` })
      .from(dashboardLayouts)
      .where(eq(dashboardLayouts.layoutId, id));
    if (usage.count > 0) {
      return reply.code(409).send({
        error: "Layout is in use and cannot be deleted",
        usageCount: usage.count,
      });
    }
    const [row] = await db
      .delete(layouts)
      .where(eq(layouts.id, id))
      .returning();
    if (!row) return reply.code(404).send({ error: "Not found" });
    return { success: true };
  }
);
```

**Step 4: Commit**

```bash
git add packages/server/src/ws/popup-broadcast.ts packages/server/src/routes/components.ts packages/server/src/routes/layouts.ts
git commit -m "feat: cascade reloads and delete protection for components and layouts"
```

---

### Task 4: Remove popups table and simplify to ephemeral trigger

**Files:**
- Modify: `packages/server/src/db/schema.ts` (remove `popups` table — already done in Task 1)
- Modify: `packages/server/src/routes/popup-trigger.ts`
- Delete: `packages/server/src/routes/popups.ts`
- Modify: `packages/server/src/index.ts`

**Step 1: Simplify popup trigger to inline-only**

Replace `packages/server/src/routes/popup-trigger.ts`:

```typescript
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { broadcastPopup } from "../ws/popup-broadcast.js";

const triggerSchema = z.object({
  content: z.object({
    type: z.enum(["text", "image", "video"]),
    body: z.string().optional(),
    mediaUrl: z.string().optional(),
  }),
  timeout: z.number().int().positive().default(10),
  targetDashboardIds: z.array(z.number().int()).default([]),
});

export async function popupTriggerRoutes(app: FastifyInstance) {
  app.post("/api/trigger/popup", async (req, reply) => {
    const body = triggerSchema.parse(req.body);
    broadcastPopup(body.targetDashboardIds, {
      content: body.content,
      timeout: body.timeout,
    });
    return { success: true };
  });
}
```

**Step 2: Remove popup CRUD routes from server**

In `packages/server/src/index.ts`:
- Remove import: `import { popupRoutes } from "./routes/popups.js";` (line 15)
- Remove registration: `await admin.register(popupRoutes);` (line 61)

Delete the file: `packages/server/src/routes/popups.ts`

**Step 3: Commit**

```bash
git rm packages/server/src/routes/popups.ts
git add packages/server/src/routes/popup-trigger.ts packages/server/src/index.ts
git commit -m "feat: simplify popups to ephemeral trigger only, remove CRUD"
```

---

### Task 5: Update dashboard routes for theme reference

**Files:**
- Modify: `packages/server/src/routes/dashboards.ts`

**Step 1: Update create/update schemas**

Remove `globalStyles` and `standardVariables` from both schemas. Add `themeId`:

```typescript
const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  accessMode: z.enum(["public", "password", "header"]).default("public"),
  password: z.string().optional(),
  headerName: z.string().optional(),
  headerValue: z.string().optional(),
  interactiveMode: z.boolean().default(false),
  maxWidth: z.string().nullable().optional(),
  padding: z.string().nullable().optional(),
  themeId: z.number().int().nullable().optional(),
  layoutSwitchMode: z.enum(["tabs", "auto-rotate"]).default("tabs"),
  layoutRotateInterval: z.number().int().positive().default(30),
});
```

**Step 2: Update create handler**

In the POST handler, replace `globalStyles` and `standardVariables` fields with `themeId: body.themeId ?? null`.

**Step 3: Update the PUT handler**

Remove `globalStyles` and `standardVariables` from the values object. Add `themeId` handling.

**Step 4: Commit**

```bash
git add packages/server/src/routes/dashboards.ts
git commit -m "feat: update dashboard routes to use themeId instead of inline styles"
```

---

### Task 6: Update display data route to resolve theme

**Files:**
- Modify: `packages/server/src/routes/display-data.ts`

**Step 1: Join theme data into display response**

Add import for `themes` table. After fetching dashboard, fetch its theme:

```typescript
import { themes } from "../db/schema.js";

// After fetching dashboard, resolve theme
let themeData = { standardVariables: {} as Record<string, string>, globalStyles: {} as Record<string, string> };
if (dashboard.themeId) {
  const [theme] = await db.select().from(themes).where(eq(themes.id, dashboard.themeId));
  if (theme) {
    themeData = { standardVariables: theme.standardVariables as Record<string, string>, globalStyles: theme.globalStyles as Record<string, string> };
  }
}
```

Update the return object — replace `globalStyles` and `standardVariables` with theme data:

```typescript
return {
  dashboard: {
    id: dashboard.id,
    name: dashboard.name,
    slug: dashboard.slug,
    accessKey: dashboard.accessKey,
    accessMode: dashboard.accessMode,
    interactiveMode: dashboard.interactiveMode,
    maxWidth: dashboard.maxWidth,
    padding: dashboard.padding,
    globalStyles: themeData.globalStyles,
    standardVariables: themeData.standardVariables,
    layoutSwitchMode: dashboard.layoutSwitchMode,
    layoutRotateInterval: dashboard.layoutRotateInterval,
  },
  layouts: dashLayoutsWithData.sort((a, b) => a.sortOrder - b.sortOrder),
  components: componentDefs,
};
```

**Step 2: Commit**

```bash
git add packages/server/src/routes/display-data.ts
git commit -m "feat: resolve theme in display data endpoint"
```

---

### Task 7: Region chrome — update types and schema

**Files:**
- Modify: `packages/shared/src/types/index.ts`
- Modify: `packages/server/src/db/schema.ts`
- Modify: `packages/server/src/routes/layouts.ts`

**Step 1: Update LayoutRegion type**

In `packages/shared/src/types/index.ts`, update `LayoutRegion`:

```typescript
export interface LayoutRegion {
  id: string;
  applyChromeTo?: "components" | "region";
  flexDirection?: "column" | "row";
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  alignItems?: "stretch" | "flex-start" | "center" | "flex-end";
  flexGrow?: boolean;
}
```

Remove the `label` field entirely.

**Step 2: Update layout schema type**

In `packages/server/src/db/schema.ts`, update the layouts table `structure` type (line 48-51):

```typescript
.$type<{
  gridTemplate: string;
  regions: { id: string; applyChromeTo?: "components" | "region" }[];
}>()
```

**Step 3: Update layout route Zod schema**

In `packages/server/src/routes/layouts.ts`, update the `regionSchema`:

```typescript
const regionSchema = z.object({
  id: z.string(),
  applyChromeTo: z.enum(["components", "region"]).optional(),
  flexDirection: z.enum(["column", "row"]).optional(),
  justifyContent: z.enum(["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"]).optional(),
  alignItems: z.enum(["stretch", "flex-start", "center", "flex-end"]).optional(),
  flexGrow: z.boolean().optional(),
});
```

**Step 4: Commit**

```bash
git add packages/shared/src/types/index.ts packages/server/src/db/schema.ts packages/server/src/routes/layouts.ts
git commit -m "feat: replace region label with applyChromeTo field"
```

---

### Task 8: Region chrome — display runtime

**Files:**
- Modify: `packages/display/src/runtime/LayoutRenderer.tsx`
- Modify: `packages/display/src/runtime/RegionRenderer.tsx`
- Modify: `packages/display/src/runtime/ComponentRenderer.tsx`

**Step 1: Pass applyChromeTo through LayoutRenderer**

In `packages/display/src/runtime/LayoutRenderer.tsx`, update the region interface:

```typescript
regions: {
  id: string;
  gridArea?: string;
  applyChromeTo?: "components" | "region";
  flexDirection?: "column" | "row";
  justifyContent?: string;
  alignItems?: string;
  flexGrow?: boolean;
}[];
```

Remove `label` from the interface.

When `applyChromeTo === "region"`, apply chrome styles to the region div. Pass `applyChromeTo` to `RegionRenderer`:

```typescript
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
        ...(chromeOnRegion
          ? {
              background: "var(--db-component-bg, transparent)",
              border: "var(--db-border-style, none)",
              borderRadius: "var(--db-border-radius, 0px)",
              padding: "var(--db-component-padding, 0px)",
            }
          : {}),
      }}
    >
      <RegionRenderer
        regionId={region.id}
        instances={instances}
        components={components}
        entities={entities}
        globalStyles={globalStyles}
        flexGrow={region.flexGrow}
        applyChrome={!chromeOnRegion}
      />
    </div>
  );
})}
```

**Step 2: Add applyChrome prop to RegionRenderer**

In `packages/display/src/runtime/RegionRenderer.tsx`, add `applyChrome` to the props interface:

```typescript
interface RegionRendererProps {
  regionId: string;
  instances: ComponentInstance[];
  components: Record<number, ComponentDef>;
  entities: Record<string, EntityState>;
  globalStyles: Record<string, string>;
  flexGrow?: boolean;
  applyChrome?: boolean;
}
```

Pass `applyChrome` to `ComponentRenderer`:

```typescript
<ComponentRenderer
  template={comp.template}
  styles={comp.styles}
  entities={entities}
  parameterValues={{ ...inst.entityBindings, ...inst.parameterValues }}
  globalStyles={globalStyles}
  instanceId={inst.id}
  fillRegion={flexGrow}
  applyChrome={applyChrome}
/>
```

**Step 3: Apply chrome in ComponentRenderer**

In `packages/display/src/runtime/ComponentRenderer.tsx`, add `applyChrome` prop:

```typescript
interface ComponentRendererProps {
  template: string;
  styles: string;
  entities: Record<string, EntityState>;
  parameterValues: Record<string, string | number | boolean>;
  globalStyles: Record<string, string>;
  instanceId: number;
  fillRegion?: boolean;
  applyChrome?: boolean;
}
```

Apply chrome styles to the wrapper div when `applyChrome` is true (default: true for backwards compat):

```typescript
const chromeStyles = applyChrome !== false
  ? {
      background: "var(--db-component-bg, transparent)",
      border: "var(--db-border-style, none)",
      borderRadius: "var(--db-border-radius, 0px)",
      padding: "var(--db-component-padding, 0px)",
      fontFamily: "var(--db-font-family, inherit)",
      fontSize: "var(--db-font-size, 16px)",
    }
  : {};

// In the render:
<div
  ref={containerRef}
  data-instance={instanceId}
  style={{
    ...(fillRegion ? { flex: 1, minHeight: 0 } : {}),
    ...chromeStyles,
  }}
  dangerouslySetInnerHTML={{ __html: html }}
/>
```

**Step 4: Commit**

```bash
git add packages/display/src/runtime/LayoutRenderer.tsx packages/display/src/runtime/RegionRenderer.tsx packages/display/src/runtime/ComponentRenderer.tsx
git commit -m "feat: region-level chrome application in display runtime"
```

---

### Task 9: Strip base chrome from prebuilt component styles

**Files:**
- Modify: `packages/server/src/prebuilt/index.ts`

**Step 1: Remove :host chrome block from all prebuilt styles**

Remove the `:host { background: var(--db-component-bg...); ... }` line from each prebuilt component's styles. Keep only the content-specific styles.

Clock styles becomes:
```css
.clock { text-align: center; padding: 20px; }
.clock-time { font-size: 4em; font-weight: 200; color: var(--db-font-color, #fff); }
.clock-date { font-size: 1.2em; color: var(--db-font-color-secondary, #aaa); margin-top: 8px; }
```

Entity Value styles becomes:
```css
.entity-value { padding: 16px; text-align: center; }
.entity-label { font-size: 0.9em; color: var(--db-font-color-secondary, #aaa); margin-bottom: 4px; }
.entity-state { font-size: 2.5em; font-weight: 300; color: var(--db-font-color, #fff); }
.unit { font-size: 0.4em; color: var(--db-font-color-secondary, #aaa); }
```

Weather Card styles becomes:
```css
.weather-card { padding: 20px; }
.weather-main { text-align: center; margin-bottom: 16px; }
.weather-temp { font-size: 3.5em; font-weight: 200; color: var(--db-font-color, #fff); }
.weather-condition { color: var(--db-font-color-secondary, #aaa); }
.weather-details { display: flex; justify-content: space-around; }
.weather-detail { text-align: center; }
.detail-label { display: block; font-size: 0.8em; color: var(--db-font-color-secondary, #aaa); }
.detail-value { font-size: 1.2em; color: var(--db-font-color, #fff); }
```

Media Player styles becomes:
```css
.media-player { padding: 16px; }
.media-title { font-size: 1.3em; font-weight: 500; color: var(--db-font-color, #fff); }
.media-artist { color: var(--db-font-color-secondary, #aaa); margin-top: 4px; }
.media-state { margin-top: 8px; font-size: 0.85em; color: var(--db-accent-color, #4fc3f7); text-transform: capitalize; }
```

Image Slideshow styles becomes:
```css
.slideshow { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.slideshow-img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: var(--db-border-radius, 0px); }
```

Container styles stay the same (no :host block).

**Step 2: Remove Image Slideshow from seed list**

Remove the entire Image Slideshow entry from the `prebuiltComponents` array (lines 126-153).

**Step 3: Commit**

```bash
git add packages/server/src/prebuilt/index.ts
git commit -m "feat: strip base chrome from prebuilt components, remove Image Slideshow"
```

---

### Task 10: Add folder support to assets

**Files:**
- Modify: `packages/server/src/db/schema.ts`
- Modify: `packages/server/src/routes/assets.ts`

**Step 1: Add folder column to assets schema**

In `packages/server/src/db/schema.ts`, add to the `assets` table:

```typescript
folder: text("folder"),
```

**Step 2: Update asset routes**

In `packages/server/src/routes/assets.ts`:

Update the list endpoint to support folder filtering and return folders:
```typescript
app.get("/api/assets", async (req) => {
  const folder = (req.query as Record<string, string>).folder;
  const query = folder !== undefined
    ? db.select().from(assets).where(eq(assets.folder, folder || null))
    : db.select().from(assets);
  return query;
});

app.get("/api/assets/folders", async () => {
  const rows = await db
    .selectDistinct({ folder: assets.folder })
    .from(assets)
    .where(sql`${assets.folder} IS NOT NULL`);
  return rows.map((r) => r.folder).sort();
});
```

Update upload to accept folder:
```typescript
app.post("/api/assets/upload", async (req, reply) => {
  ensureAssetsDir();
  const data = await req.file();
  if (!data) return reply.code(400).send({ error: "No file uploaded" });

  const buffer = await data.toBuffer();
  const fileName = `${Date.now()}-${data.filename}`;
  const filePath = path.join(ASSETS_DIR, fileName);
  fs.writeFileSync(filePath, buffer);

  // Get folder from fields
  const folder = data.fields?.folder
    ? (data.fields.folder as { value: string }).value || null
    : null;

  const [row] = await db
    .insert(assets)
    .values({
      name: data.filename,
      fileName,
      mimeType: data.mimetype,
      fileSize: buffer.length,
      folder,
    })
    .returning();

  return reply.code(201).send(row);
});
```

Add endpoint to move an asset to a different folder:
```typescript
app.put<{ Params: { id: string } }>(
  "/api/assets/:id",
  async (req, reply) => {
    const id = parseInt(req.params.id);
    const body = z.object({ folder: z.string().nullable() }).parse(req.body);
    const [row] = await db
      .update(assets)
      .set({ folder: body.folder })
      .where(eq(assets.id, id))
      .returning();
    if (!row) return reply.code(404).send({ error: "Not found" });
    return row;
  }
);
```

**Step 3: Commit**

```bash
git add packages/server/src/db/schema.ts packages/server/src/routes/assets.ts
git commit -m "feat: add virtual folder support to assets"
```

---

### Task 11: Admin — Theme editor pages

**Files:**
- Create: `packages/admin/src/pages/ThemeList.tsx`
- Create: `packages/admin/src/pages/ThemeEditor.tsx`
- Modify: `packages/admin/src/App.tsx`

**Step 1: Create ThemeList page**

Create `packages/admin/src/pages/ThemeList.tsx`:

```typescript
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Table, Button, Space, Popconfirm, Tag, message } from "antd";
import { PlusOutlined, CopyOutlined } from "@ant-design/icons";
import { api } from "../api.js";

interface Theme {
  id: number;
  name: string;
  usageCount: number;
  createdAt: string;
}

export function ThemeList() {
  const [data, setData] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api.get<Theme[]>("/api/themes").then(setData).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCopy = async (id: number) => {
    const copied = await api.post<Theme>(`/api/themes/${id}/copy`, {});
    message.success("Theme copied");
    navigate(`/themes/${copied.id}`);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/themes/${id}`);
      message.success("Theme deleted");
      load();
    } catch (err) {
      message.error((err as Error).message);
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/themes/new")}>
          New Theme
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={[
          { title: "Name", dataIndex: "name" },
          {
            title: "Usage",
            dataIndex: "usageCount",
            render: (v: number) => <Tag>{v} dashboard{v !== 1 ? "s" : ""}</Tag>,
          },
          {
            title: "Actions",
            render: (_, record) => (
              <Space>
                <Button size="small" onClick={() => navigate(`/themes/${record.id}`)}>Edit</Button>
                <Button size="small" onClick={() => handleCopy(record.id)}>Copy</Button>
                <Popconfirm
                  title="Delete this theme?"
                  onConfirm={() => handleDelete(record.id)}
                  disabled={record.usageCount > 0}
                >
                  <Button size="small" danger disabled={record.usageCount > 0}>
                    Delete
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
    </>
  );
}
```

**Step 2: Create ThemeEditor page**

Create `packages/admin/src/pages/ThemeEditor.tsx`:

```typescript
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Form, Input, Button, Card, Space, message } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { StandardVariablesForm } from "../components/dashboard/StandardVariablesForm.js";
import type { StandardVariables } from "@ha-external-dashboards/shared";
import { api } from "../api.js";

interface ThemeData {
  id?: number;
  name: string;
  standardVariables: Record<string, string>;
  globalStyles: Record<string, string>;
}

export function ThemeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm<{ name: string }>();
  const [loading, setLoading] = useState(false);
  const [standardVariables, setStandardVariables] = useState<Partial<StandardVariables>>({});
  const [globalStyleEntries, setGlobalStyleEntries] = useState<{ key: string; value: string }[]>([]);
  const isNew = !id;

  useEffect(() => {
    if (!isNew) {
      setLoading(true);
      api
        .get<ThemeData>(`/api/themes/${id}`)
        .then((data) => {
          form.setFieldsValue({ name: data.name });
          setStandardVariables(data.standardVariables ?? {});
          const gs = data.globalStyles ?? {};
          setGlobalStyleEntries(Object.entries(gs).map(([key, value]) => ({ key, value })));
        })
        .finally(() => setLoading(false));
    }
  }, [id, isNew, form]);

  const onFinish = async (values: { name: string }) => {
    setLoading(true);
    try {
      const globalStyles: Record<string, string> = {};
      for (const e of globalStyleEntries) {
        if (e.key) globalStyles[e.key] = e.value;
      }
      const payload = { name: values.name, standardVariables, globalStyles };

      if (isNew) {
        await api.post("/api/themes", payload);
        message.success("Theme created");
      } else {
        await api.put(`/api/themes/${id}`, payload);
        message.success("Theme updated");
      }
      navigate("/themes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={isNew ? "New Theme" : "Edit Theme"} loading={loading}>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <StandardVariablesForm value={standardVariables} onChange={setStandardVariables} />

        <div style={{ marginTop: 24, borderTop: "1px solid #303030", paddingTop: 16 }}>
          <div style={{ fontWeight: 500, marginBottom: 12 }}>Custom Variables</div>
          {globalStyleEntries.map((entry, i) => (
            <Space key={i} style={{ display: "flex", marginBottom: 8 }}>
              <Input
                placeholder="Variable name"
                value={entry.key}
                onChange={(e) => {
                  const next = [...globalStyleEntries];
                  next[i] = { ...next[i], key: e.target.value };
                  setGlobalStyleEntries(next);
                }}
                style={{ width: 200 }}
              />
              <Input
                placeholder="Value"
                value={entry.value}
                onChange={(e) => {
                  const next = [...globalStyleEntries];
                  next[i] = { ...next[i], value: e.target.value };
                  setGlobalStyleEntries(next);
                }}
                style={{ width: 200 }}
              />
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => setGlobalStyleEntries(globalStyleEntries.filter((_, j) => j !== i))}
              />
            </Space>
          ))}
          <Button
            icon={<PlusOutlined />}
            onClick={() => setGlobalStyleEntries([...globalStyleEntries, { key: "", value: "" }])}
          >
            Add Style Variable
          </Button>
        </div>

        <Form.Item style={{ marginTop: 16 }}>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isNew ? "Create" : "Save"}
            </Button>
            <Button onClick={() => navigate("/themes")}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
```

**Step 3: Update App.tsx routing**

In `packages/admin/src/App.tsx`:

Add imports:
```typescript
import { ThemeList } from "./pages/ThemeList.js";
import { ThemeEditor } from "./pages/ThemeEditor.js";
import { FormatPainterOutlined } from "@ant-design/icons";
```

Add to menuItems (after Dashboards):
```typescript
{ key: "/themes", icon: <FormatPainterOutlined />, label: "Themes" },
```

Add routes:
```typescript
<Route path="/themes" element={<ThemeList />} />
<Route path="/themes/new" element={<ThemeEditor />} />
<Route path="/themes/:id" element={<ThemeEditor />} />
```

**Step 4: Commit**

```bash
git add packages/admin/src/pages/ThemeList.tsx packages/admin/src/pages/ThemeEditor.tsx packages/admin/src/App.tsx
git commit -m "feat: add theme list and editor admin pages"
```

---

### Task 12: Admin — Update dashboard editor for theme selector

**Files:**
- Modify: `packages/admin/src/pages/DashboardEditor.tsx`

**Step 1: Replace styles tab with theme selector**

Remove:
- `StandardVariablesForm` import and usage
- `STANDARD_VARIABLE_DEFAULTS` import
- `globalStyleEntries` state
- `standardVariables` state
- The entire "Global Styles" tab

Add theme state and fetching:
```typescript
const [allThemes, setAllThemes] = useState<{ id: number; name: string }[]>([]);

// In the useEffect that fetches layouts:
api.get<{ id: number; name: string }[]>("/api/themes").then(setAllThemes);
```

Add a Theme selector to the Settings tab (after layoutRotateInterval):
```typescript
<Form.Item name="themeId" label="Theme">
  <Select
    allowClear
    placeholder="No theme"
    options={allThemes.map((t) => ({ value: t.id, label: t.name }))}
  />
</Form.Item>
```

Update `onFinish` to remove globalStyles/standardVariables and just send the form values (which now include themeId).

Update `componentConfigModal` `globalStyles` prop — since styles now come from theme, fetch the selected theme's data or pass empty. For the preview to work:

```typescript
// Fetch theme data when themeId changes
const [selectedTheme, setSelectedTheme] = useState<{ standardVariables: Record<string, string>; globalStyles: Record<string, string> } | null>(null);
const themeId = Form.useWatch("themeId", form);

useEffect(() => {
  if (themeId) {
    api.get<{ standardVariables: Record<string, string>; globalStyles: Record<string, string> }>(`/api/themes/${themeId}`).then(setSelectedTheme);
  } else {
    setSelectedTheme(null);
  }
}, [themeId]);
```

Pass to ComponentConfigModal:
```typescript
globalStyles={{
  ...Object.fromEntries(
    Object.entries({ ...STANDARD_VARIABLE_DEFAULTS, ...(selectedTheme?.standardVariables ?? {}) })
      .filter(([k]) => k !== "backgroundType" && k !== "backgroundImage")
  ),
  ...(selectedTheme?.globalStyles ?? {}),
}}
standardVariables={(selectedTheme?.standardVariables ?? {}) as Record<string, string>}
```

**Step 2: Remove the "Global Styles" tab entirely**

Remove the `styles` tab from the Tabs items array.

**Step 3: Commit**

```bash
git add packages/admin/src/pages/DashboardEditor.tsx
git commit -m "feat: replace dashboard global styles with theme selector dropdown"
```

---

### Task 13: Admin — Update layout editor (remove label, add applyChromeTo)

**Files:**
- Modify: `packages/admin/src/pages/LayoutEditor.tsx`

**Step 1: Remove label state and input**

Remove:
- `regionLabels` state (line 105)
- Label usage in `regions` memo (replace `label: regionLabels[area] ?? area` with just `id: area`)
- Label `<Input>` in the detected regions section (lines 222-232)

**Step 2: Add applyChromeTo to region settings**

Update the `Region` interface:
```typescript
interface Region {
  id: string;
  applyChromeTo?: "components" | "region";
  flexDirection?: "column" | "row";
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  alignItems?: "stretch" | "flex-start" | "center" | "flex-end";
  flexGrow?: boolean;
}
```

Update `regionSettings` type to include `applyChromeTo`. Add a Select for it in each region row:

```typescript
<Select
  size="small"
  style={{ width: 150 }}
  value={regionSettings[area]?.applyChromeTo ?? "components"}
  onChange={(val) =>
    setRegionSettings((prev) => ({
      ...prev,
      [area]: { ...prev[area], applyChromeTo: val },
    }))
  }
  options={[
    { label: "Chrome → Components", value: "components" },
    { label: "Chrome → Region", value: "region" },
  ]}
/>
```

**Step 3: Update GridPreview**

Replace `{r.label || r.id}` with `{r.id}` in the preview cells.

**Step 4: Update data loading**

In the useEffect that loads existing layout data, update to read `applyChromeTo` instead of `label`:

```typescript
settings[r.id] = {
  applyChromeTo: r.applyChromeTo,
  flexDirection: r.flexDirection,
  justifyContent: r.justifyContent,
  alignItems: r.alignItems,
  flexGrow: r.flexGrow,
};
```

**Step 5: Commit**

```bash
git add packages/admin/src/pages/LayoutEditor.tsx
git commit -m "feat: remove region label, add applyChromeTo toggle in layout editor"
```

---

### Task 14: Admin — Update popup page to ephemeral trigger form

**Files:**
- Create: `packages/admin/src/pages/PopupTrigger.tsx`
- Delete: `packages/admin/src/pages/PopupList.tsx`
- Delete: `packages/admin/src/pages/PopupEditor.tsx`
- Modify: `packages/admin/src/App.tsx`

**Step 1: Create PopupTrigger page**

Create `packages/admin/src/pages/PopupTrigger.tsx`:

```typescript
import { useEffect, useState } from "react";
import { Form, Input, InputNumber, Select, Button, Card, Alert, Typography, message } from "antd";
import { SendOutlined } from "@ant-design/icons";
import { api } from "../api.js";

const { Text, Paragraph } = Typography;

interface Dashboard {
  id: number;
  name: string;
}

export function PopupTrigger() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);

  const contentType = Form.useWatch(["content", "type"], form);

  useEffect(() => {
    api.get<Dashboard[]>("/api/dashboards").then(setDashboards);
  }, []);

  const onFinish = async (values: {
    content: { type: string; body?: string; mediaUrl?: string };
    timeout: number;
    targetDashboardIds: number[];
  }) => {
    setLoading(true);
    try {
      await api.post("/api/trigger/popup", values);
      message.success("Popup sent to displays");
    } catch {
      message.error("Failed to send popup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Send Popup">
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          content: { type: "text" },
          timeout: 10,
          targetDashboardIds: [],
        }}
      >
        <Form.Item name={["content", "type"]} label="Content Type">
          <Select
            options={[
              { value: "text", label: "Text" },
              { value: "image", label: "Image" },
              { value: "video", label: "Video" },
            ]}
          />
        </Form.Item>
        {contentType === "text" && (
          <Form.Item name={["content", "body"]} label="Body" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
        )}
        {(contentType === "image" || contentType === "video") && (
          <Form.Item name={["content", "mediaUrl"]} label="Media URL" rules={[{ required: true }]}>
            <Input placeholder="/assets/image.png" />
          </Form.Item>
        )}
        <Form.Item name="timeout" label="Timeout (seconds)">
          <InputNumber min={1} />
        </Form.Item>
        <Form.Item
          name="targetDashboardIds"
          label="Target Dashboards"
          extra="Leave empty to broadcast to all dashboards"
        >
          <Select
            mode="multiple"
            placeholder="All dashboards"
            options={dashboards.map((d) => ({ value: d.id, label: d.name }))}
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} icon={<SendOutlined />}>
            Send Popup
          </Button>
        </Form.Item>
      </Form>

      <Alert
        type="info"
        style={{ marginTop: 16 }}
        message="Home Assistant Integration"
        description={
          <div>
            <Paragraph>
              <Text>
                Add this to your HA <Text code>configuration.yaml</Text>:
              </Text>
            </Paragraph>
            <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, fontSize: 12 }}>
{`rest_command:
  trigger_popup:
    url: "http://localhost:8099/api/trigger/popup"
    method: POST
    content_type: "application/json"
    payload: '{"content":{"type":"text","body":"{{ message }}"},"timeout":10}'`}
            </pre>
          </div>
        }
      />
    </Card>
  );
}
```

**Step 2: Update App.tsx**

Replace imports:
```typescript
// Remove:
import { PopupList } from "./pages/PopupList.js";
import { PopupEditor } from "./pages/PopupEditor.js";
// Add:
import { PopupTrigger } from "./pages/PopupTrigger.js";
```

Replace routes:
```typescript
// Remove:
<Route path="/popups" element={<PopupList />} />
<Route path="/popups/new" element={<PopupEditor />} />
<Route path="/popups/:id" element={<PopupEditor />} />
// Add:
<Route path="/popups" element={<PopupTrigger />} />
```

**Step 3: Delete old files**

```bash
rm packages/admin/src/pages/PopupList.tsx packages/admin/src/pages/PopupEditor.tsx
```

**Step 4: Commit**

```bash
git rm packages/admin/src/pages/PopupList.tsx packages/admin/src/pages/PopupEditor.tsx
git add packages/admin/src/pages/PopupTrigger.tsx packages/admin/src/App.tsx
git commit -m "feat: replace popup CRUD with ephemeral trigger form"
```

---

### Task 15: Admin — Usage counts and delete protection in list pages

**Files:**
- Modify: `packages/admin/src/pages/ComponentList.tsx`
- Modify: `packages/admin/src/pages/LayoutList.tsx`

**Step 1: Add usage count column to ComponentList**

In `packages/admin/src/pages/ComponentList.tsx`, add `usageCount` to the interface:
```typescript
interface Component {
  id: number;
  name: string;
  isContainer: boolean;
  isPrebuilt: boolean;
  usageCount: number;
  createdAt: string;
}
```

Add column after "Source":
```typescript
{
  title: "Usage",
  dataIndex: "usageCount",
  render: (v: number) => <Tag>{v} instance{v !== 1 ? "s" : ""}</Tag>,
},
```

Update delete handler to catch 409:
```typescript
const handleDelete = async (id: number) => {
  try {
    await api.delete(`/api/components/${id}`);
    message.success("Component deleted");
    load();
  } catch (err) {
    message.error((err as Error).message);
  }
};
```

Disable delete button when in use:
```typescript
<Popconfirm
  title="Delete this component?"
  onConfirm={() => handleDelete(record.id)}
  disabled={record.usageCount > 0}
>
  <Button size="small" danger disabled={record.usageCount > 0}>
    Delete
  </Button>
</Popconfirm>
```

**Step 2: Add usage count column to LayoutList**

In `packages/admin/src/pages/LayoutList.tsx`, add `usageCount` to the interface:
```typescript
interface Layout {
  id: number;
  name: string;
  structure: { regions: { id: string }[] };
  usageCount: number;
  createdAt: string;
}
```

Add column and same delete protection pattern as above.

**Step 3: Commit**

```bash
git add packages/admin/src/pages/ComponentList.tsx packages/admin/src/pages/LayoutList.tsx
git commit -m "feat: show usage counts and disable delete for in-use components/layouts"
```

---

### Task 16: Admin — Asset folder UI

**Files:**
- Modify: `packages/admin/src/pages/AssetList.tsx`
- Modify: `packages/admin/src/api.ts`

**Step 1: Update api.ts upload to support folder**

In `packages/admin/src/api.ts`, update the `upload` method to accept optional fields:

```typescript
upload: async <T>(path: string, file: File, fields?: Record<string, string>): Promise<T> => {
  const form = new FormData();
  form.append("file", file);
  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      form.append(key, value);
    }
  }
  const res = await fetch(`${BASE}${path}`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json() as Promise<T>;
},
```

**Step 2: Update AssetList with folder navigation**

Rewrite `packages/admin/src/pages/AssetList.tsx` to add:
- `currentFolder` state
- Fetch folders from `/api/assets/folders`
- Filter view by current folder
- Breadcrumb navigation
- "New Folder" button (Input + creates by uploading to that folder, or just a prompt)
- "Move to folder" action per asset
- Upload targets current folder

```typescript
import { useEffect, useState } from "react";
import { Table, Button, Space, Popconfirm, Upload, Image, Typography, Select, Input, Breadcrumb, message } from "antd";
import { UploadOutlined, FolderOutlined, FolderAddOutlined } from "@ant-design/icons";
import { api } from "../api.js";

const { Text } = Typography;

interface Asset {
  id: number;
  name: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  folder: string | null;
  createdAt: string;
}

export function AssetList() {
  const [data, setData] = useState<Asset[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<Asset[]>(`/api/assets${currentFolder !== null ? `?folder=${encodeURIComponent(currentFolder)}` : ""}`),
      api.get<string[]>("/api/assets/folders"),
    ]).then(([assets, flds]) => {
      setData(assets);
      setFolders(flds);
    }).finally(() => setLoading(false));
  };

  useEffect(load, [currentFolder]);

  const handleDelete = async (id: number) => {
    await api.delete(`/api/assets/${id}`);
    message.success("Asset deleted");
    load();
  };

  const handleUpload = async (file: File) => {
    const fields = currentFolder ? { folder: currentFolder } : undefined;
    await api.upload("/api/assets/upload", file, fields);
    message.success("Asset uploaded");
    load();
    return false;
  };

  const handleMove = async (id: number, folder: string | null) => {
    await api.put(`/api/assets/${id}`, { folder });
    message.success("Asset moved");
    load();
  };

  const breadcrumbParts = currentFolder ? currentFolder.split("/") : [];

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Upload
          showUploadList={false}
          beforeUpload={(file) => { handleUpload(file as unknown as File); return false; }}
        >
          <Button icon={<UploadOutlined />} type="primary">Upload Asset</Button>
        </Upload>
        <Button
          icon={<FolderAddOutlined />}
          onClick={() => setShowNewFolder(true)}
        >
          New Folder
        </Button>
      </Space>

      {showNewFolder && (
        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onPressEnter={() => {
              if (newFolderName) {
                const path = currentFolder ? `${currentFolder}/${newFolderName}` : newFolderName;
                setCurrentFolder(path);
                setNewFolderName("");
                setShowNewFolder(false);
              }
            }}
            style={{ width: 200 }}
          />
          <Button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}>Cancel</Button>
        </Space>
      )}

      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <a onClick={() => setCurrentFolder(null)}>All Assets</a>
        </Breadcrumb.Item>
        {breadcrumbParts.map((part, i) => (
          <Breadcrumb.Item key={i}>
            <a onClick={() => setCurrentFolder(breadcrumbParts.slice(0, i + 1).join("/"))}>
              {part}
            </a>
          </Breadcrumb.Item>
        ))}
      </Breadcrumb>

      {/* Show subfolders */}
      {currentFolder === null && folders.length > 0 && (
        <Space style={{ marginBottom: 16 }} wrap>
          {folders.map((f) => (
            <Button key={f} icon={<FolderOutlined />} onClick={() => setCurrentFolder(f)}>
              {f}
            </Button>
          ))}
        </Space>
      )}

      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={[
          {
            title: "Preview",
            width: 60,
            render: (_, record) =>
              record.mimeType.startsWith("image/") ? (
                <Image
                  src={`/api/assets/${record.id}/file`}
                  width={40}
                  height={40}
                  style={{ objectFit: "cover", borderRadius: 4 }}
                  fallback="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>"
                />
              ) : null,
          },
          { title: "Name", dataIndex: "name" },
          { title: "Type", dataIndex: "mimeType" },
          {
            title: "Size",
            dataIndex: "fileSize",
            render: (v: number) => v > 1048576 ? `${(v / 1048576).toFixed(1)} MB` : `${(v / 1024).toFixed(1)} KB`,
          },
          {
            title: "Path",
            render: (_, record) => (
              <Text code copyable={{ text: `/assets/${record.fileName}` }}>
                /assets/{record.fileName}
              </Text>
            ),
          },
          {
            title: "Actions",
            render: (_, record) => (
              <Space>
                <Select
                  size="small"
                  style={{ width: 120 }}
                  placeholder="Move to..."
                  value={undefined}
                  allowClear
                  onChange={(v) => handleMove(record.id, v ?? null)}
                  options={[
                    { value: "", label: "Root" },
                    ...folders.map((f) => ({ value: f, label: f })),
                  ]}
                />
                <Popconfirm title="Delete this asset?" onConfirm={() => handleDelete(record.id)}>
                  <Button size="small" danger>Delete</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
    </>
  );
}
```

**Step 3: Commit**

```bash
git add packages/admin/src/pages/AssetList.tsx packages/admin/src/api.ts
git commit -m "feat: add folder navigation and management to asset list"
```

---

### Task 17: Build, test, and verify

**Step 1: Build shared package**

Run: `pnpm --filter @ha-external-dashboards/shared build`

Expected: Clean build

**Step 2: Build admin package**

Run: `pnpm --filter @ha-external-dashboards/admin build`

Expected: Clean build (check for TypeScript errors from removed fields)

**Step 3: Build display package**

Run: `pnpm --filter @ha-external-dashboards/display build`

Expected: Clean build

**Step 4: Build server package**

Run: `pnpm --filter @ha-external-dashboards/server build`

Expected: Clean build

**Step 5: Run migrations**

Run: `pnpm -w run db:generate`

Verify the generated migration SQL is correct.

**Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build errors from refactoring"
```

---

### Task 18: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update data model section**

Update the `dashboards` description: remove `globalStyles, standardVariables`, add `themeId`.

Add `themes` entry: `name, standardVariables (JSON), globalStyles (JSON)`.

Update `layouts` entry: mention `applyChromeTo` on regions, no label.

Remove `popups` from the data model.

Add note about `assets` having `folder` field.

**Step 2: Add notes about cascade reloads**

Add to relevant section: saving components, layouts, or themes triggers reload on affected dashboards.

**Step 3: Add notes about delete protection**

Add: Components, layouts, and themes cannot be deleted while in use (409 response).

**Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for themes, region chrome, and cleanup changes"
```
