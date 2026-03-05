# Standard Dashboard Variables & Background Picker — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a fixed set of standard CSS variables (colors, typography, borders, layout) and a background picker (color/image) to every dashboard, injected as CSS custom properties.

**Architecture:** New `standardVariables` JSON column on dashboards table. Shared types/defaults in `packages/shared`. Admin form in the Global Styles tab (structured controls above existing custom key-value pairs). Display app injects CSS custom properties on root element. Variables also exposed via `{{style}}` Handlebars helper.

**Tech Stack:** TypeScript, Drizzle ORM (SQLite), Fastify, React + Ant Design, Handlebars

---

### Task 1: Shared Types and Defaults

**Files:**
- Modify: `packages/shared/src/types/index.ts`
- Modify: `packages/shared/src/index.ts`

**Step 1: Add StandardVariables interface and defaults to shared types**

In `packages/shared/src/types/index.ts`, append at the end:

```typescript
export interface StandardVariables {
  componentBg: string;
  fontColor: string;
  fontColorSecondary: string;
  accentColor: string;
  fontFamily: string;
  fontSize: string;
  borderStyle: string;
  borderRadius: string;
  componentPadding: string;
  componentGap: string;
  backgroundType: "color" | "image";
  backgroundColor: string;
  backgroundImage: string;
}

export const STANDARD_VARIABLE_DEFAULTS: StandardVariables = {
  componentBg: "transparent",
  fontColor: "#ffffff",
  fontColorSecondary: "#aaaaaa",
  accentColor: "#1890ff",
  fontFamily: "inherit",
  fontSize: "16px",
  borderStyle: "none",
  borderRadius: "0px",
  componentPadding: "0px",
  componentGap: "0px",
  backgroundType: "color",
  backgroundColor: "#000000",
  backgroundImage: "",
};

/** Maps StandardVariables keys to CSS custom property names */
export const STANDARD_VARIABLE_CSS_MAP: Record<keyof Omit<StandardVariables, "backgroundType" | "backgroundImage">, string> = {
  componentBg: "--db-component-bg",
  fontColor: "--db-font-color",
  fontColorSecondary: "--db-font-color-secondary",
  accentColor: "--db-accent-color",
  fontFamily: "--db-font-family",
  fontSize: "--db-font-size",
  borderStyle: "--db-border-style",
  borderRadius: "--db-border-radius",
  componentPadding: "--db-component-padding",
  componentGap: "--db-component-gap",
  backgroundColor: "--db-background-color",
};
```

**Step 2: Build shared package**

Run: `cd packages/shared && pnpm build`
Expected: Clean build, no errors.

**Step 3: Commit**

```bash
git add packages/shared/src/types/index.ts
git commit -m "feat: add StandardVariables type, defaults, and CSS map to shared"
```

---

### Task 2: Database Schema and Migration

**Files:**
- Modify: `packages/server/src/db/schema.ts:4-36` (dashboards table)
- Generated: `drizzle/` (new migration SQL)

**Step 1: Add standardVariables column to schema**

In `packages/server/src/db/schema.ts`, add this column to the `dashboards` table definition, after the `globalStyles` field (line 23):

```typescript
  standardVariables: text("standard_variables", { mode: "json" })
    .$type<import("@ha-dashboards/shared").StandardVariables>()
    .notNull()
    .default(sql`'{}'`),
```

Also add the import at the top of the file (or use the inline import as shown above).

**Step 2: Generate migration**

Run: `pnpm -w run db:generate`
Expected: A new SQL migration file created in `drizzle/` that adds the `standard_variables` column to `dashboards`.

**Step 3: Verify migration SQL**

Read the generated migration file and confirm it contains an `ALTER TABLE dashboards ADD COLUMN standard_variables text NOT NULL DEFAULT '{}'` statement.

**Step 4: Commit**

```bash
git add packages/server/src/db/schema.ts drizzle/
git commit -m "feat: add standard_variables column to dashboards table"
```

---

### Task 3: Server Routes — Dashboard CRUD

**Files:**
- Modify: `packages/server/src/routes/dashboards.ts:10-23` (Zod schemas)
- Modify: `packages/server/src/routes/dashboards.ts:49-71` (create handler)
- Modify: `packages/server/src/routes/display-data.ts:74-88` (display config response)

**Step 1: Update Zod validation schemas**

In `packages/server/src/routes/dashboards.ts`, add to the `createSchema` (after line 18, the `globalStyles` field):

```typescript
  standardVariables: z.object({
    componentBg: z.string(),
    fontColor: z.string(),
    fontColorSecondary: z.string(),
    accentColor: z.string(),
    fontFamily: z.string(),
    fontSize: z.string(),
    borderStyle: z.string(),
    borderRadius: z.string(),
    componentPadding: z.string(),
    componentGap: z.string(),
    backgroundType: z.enum(["color", "image"]),
    backgroundColor: z.string(),
    backgroundImage: z.string(),
  }).partial().default({}),
```

The `updateSchema` is already `createSchema.partial()` so it inherits this.

**Step 2: Add standardVariables to create handler**

In the `app.post("/api/dashboards")` handler (line 55-70), add `standardVariables: body.standardVariables` to the `.values()` object, after `globalStyles`:

```typescript
        standardVariables: body.standardVariables,
```

The update handler already spreads `body` into values (line 79), so it will include `standardVariables` automatically.

**Step 3: Add standardVariables to display config response**

In `packages/server/src/routes/display-data.ts`, add `standardVariables` to the returned dashboard object (after line 82, `globalStyles`):

```typescript
          standardVariables: dashboard.standardVariables,
```

**Step 4: Build server to verify**

Run: `cd packages/server && pnpm build`
Expected: Clean build.

**Step 5: Commit**

```bash
git add packages/server/src/routes/dashboards.ts packages/server/src/routes/display-data.ts
git commit -m "feat: add standardVariables to dashboard CRUD and display API"
```

---

### Task 4: Server — Preview Route CSS Injection

**Files:**
- Modify: `packages/server/src/routes/preview.ts`

**Step 1: Update preview schema and rendering**

In `packages/server/src/routes/preview.ts`:

1. Add the Zod field to `renderSchema` (after `globalStyles`, line 14):

```typescript
  standardVariables: z.record(z.string()).default({}),
```

2. Add a helper function before `previewRoutes` to generate CSS custom properties:

```typescript
import { STANDARD_VARIABLE_DEFAULTS, STANDARD_VARIABLE_CSS_MAP } from "@ha-dashboards/shared";
import type { StandardVariables } from "@ha-dashboards/shared";

function buildStandardVarsCss(vars: Partial<StandardVariables>): string {
  const merged = { ...STANDARD_VARIABLE_DEFAULTS, ...vars };
  const lines: string[] = [];
  for (const [key, cssProp] of Object.entries(STANDARD_VARIABLE_CSS_MAP)) {
    const value = merged[key as keyof typeof STANDARD_VARIABLE_CSS_MAP];
    if (value) lines.push(`  ${cssProp}: ${value};`);
  }
  return `:root {\n${lines.join("\n")}\n}`;
}
```

3. In the handler response (line 55-58), prepend the CSS vars to the styles:

```typescript
      const standardCss = buildStandardVarsCss(body.standardVariables as Partial<StandardVariables>);

      return {
        html,
        styles: `${standardCss}\n${body.styles}`,
      };
```

**Step 2: Build server**

Run: `cd packages/server && pnpm build`
Expected: Clean build.

**Step 3: Commit**

```bash
git add packages/server/src/routes/preview.ts
git commit -m "feat: inject standard CSS variables in preview rendering"
```

---

### Task 5: Admin — StandardVariablesForm Component

**Files:**
- Create: `packages/admin/src/components/dashboard/StandardVariablesForm.tsx`

**Step 1: Create the form component**

Create `packages/admin/src/components/dashboard/StandardVariablesForm.tsx`:

```tsx
import { ColorPicker, Input, Radio, Select, Space } from "antd";
import { useEffect, useState } from "react";
import type { StandardVariables } from "@ha-dashboards/shared";
import { STANDARD_VARIABLE_DEFAULTS } from "@ha-dashboards/shared";
import { api } from "../../api.js";

interface Asset {
  id: number;
  name: string;
  fileName: string;
  mimeType: string;
}

interface StandardVariablesFormProps {
  value: Partial<StandardVariables>;
  onChange: (value: Partial<StandardVariables>) => void;
}

export function StandardVariablesForm({ value, onChange }: StandardVariablesFormProps) {
  const [imageAssets, setImageAssets] = useState<Asset[]>([]);
  const merged = { ...STANDARD_VARIABLE_DEFAULTS, ...value };

  useEffect(() => {
    api.get<Asset[]>("/api/assets").then((assets) => {
      setImageAssets(assets.filter((a) => a.mimeType.startsWith("image/")));
    });
  }, []);

  const update = (key: keyof StandardVariables, val: string) => {
    onChange({ ...value, [key]: val });
  };

  const colorField = (label: string, key: keyof StandardVariables) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>{label}</div>
      <ColorPicker
        value={merged[key]}
        onChange={(_, hex) => update(key, hex)}
        showText
      />
    </div>
  );

  const textField = (label: string, key: keyof StandardVariables, placeholder?: string) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>{label}</div>
      <Input
        value={merged[key]}
        onChange={(e) => update(key, e.target.value)}
        placeholder={placeholder ?? STANDARD_VARIABLE_DEFAULTS[key]}
        style={{ width: 200 }}
      />
    </div>
  );

  return (
    <div>
      <div style={{ fontWeight: 500, marginBottom: 12 }}>Standard Variables</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
        <div>
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Colors</div>
          {colorField("Component Background", "componentBg")}
          {colorField("Primary Font Color", "fontColor")}
          {colorField("Secondary Font Color", "fontColorSecondary")}
          {colorField("Accent Color", "accentColor")}
        </div>

        <div>
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Typography</div>
          {textField("Font Family", "fontFamily", "inherit")}
          {textField("Font Size", "fontSize", "16px")}
        </div>

        <div>
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Component Chrome</div>
          {textField("Border Style", "borderStyle", "none")}
          {textField("Border Radius", "borderRadius", "0px")}
          {textField("Component Padding", "componentPadding", "0px")}
        </div>

        <div>
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Layout</div>
          {textField("Component Gap", "componentGap", "0px")}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>Background</div>
        <Radio.Group
          value={merged.backgroundType}
          onChange={(e) => update("backgroundType", e.target.value)}
          style={{ marginBottom: 12 }}
        >
          <Radio value="color">Color</Radio>
          <Radio value="image">Image</Radio>
        </Radio.Group>

        {merged.backgroundType === "color" ? (
          <div>
            <ColorPicker
              value={merged.backgroundColor}
              onChange={(_, hex) => update("backgroundColor", hex)}
              showText
            />
          </div>
        ) : (
          <div>
            <Select
              value={merged.backgroundImage || undefined}
              onChange={(v) => update("backgroundImage", v)}
              placeholder="Select an image asset"
              style={{ width: 300 }}
              allowClear
              options={imageAssets.map((a) => ({
                value: a.fileName,
                label: a.name,
              }))}
            />
            {merged.backgroundImage && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={`/assets/${merged.backgroundImage}`}
                  alt="Background preview"
                  style={{
                    maxWidth: 200,
                    maxHeight: 120,
                    borderRadius: 4,
                    border: "1px solid #333",
                    objectFit: "cover",
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/admin/src/components/dashboard/StandardVariablesForm.tsx
git commit -m "feat: add StandardVariablesForm admin component"
```

---

### Task 6: Admin — Integrate Form into DashboardEditor

**Files:**
- Modify: `packages/admin/src/pages/DashboardEditor.tsx`

**Step 1: Add state and import**

At the top of `DashboardEditor.tsx`, add the import:

```typescript
import { StandardVariablesForm } from "../components/dashboard/StandardVariablesForm.js";
import type { StandardVariables } from "@ha-dashboards/shared";
```

Add state after `globalStyleEntries` (line 107):

```typescript
const [standardVariables, setStandardVariables] = useState<Partial<StandardVariables>>({});
```

**Step 2: Load standardVariables from API response**

In the `useEffect` that loads dashboard data (line 127-141), after `setGlobalStyleEntries(...)` (line 136), add:

```typescript
          setStandardVariables(data.standardVariables ?? {});
```

Also update the `Dashboard` interface (line 22-35) to add:

```typescript
  standardVariables?: Partial<StandardVariables>;
```

**Step 3: Include standardVariables in save payload**

In the `onFinish` function (line 155-175), update the payload (line 162) to include standardVariables:

```typescript
      const payload = { ...values, globalStyles, standardVariables };
```

**Step 4: Update the Global Styles tab content**

In the tab with key `"styles"` (lines 527-580), wrap the existing content with the StandardVariablesForm above it:

```tsx
children: (
  <div>
    <StandardVariablesForm
      value={standardVariables}
      onChange={setStandardVariables}
    />

    <div style={{ marginTop: 24, borderTop: "1px solid #303030", paddingTop: 16 }}>
      <div style={{ fontWeight: 500, marginBottom: 12 }}>Custom Variables</div>
      {/* ...existing globalStyleEntries code unchanged... */}
    </div>
  </div>
),
```

**Step 5: Pass merged styles to ComponentConfigModal**

Update the `globalStyles` prop passed to `ComponentConfigModal` (line 518) to merge standard variables into it. Import `STANDARD_VARIABLE_DEFAULTS` from shared, then:

```typescript
globalStyles={{
  ...Object.fromEntries(
    Object.entries({ ...STANDARD_VARIABLE_DEFAULTS, ...standardVariables })
      .filter(([k]) => k !== "backgroundType" && k !== "backgroundImage")
  ),
  ...(form.getFieldValue("globalStyles") ?? {}),
  ...Object.fromEntries(
    globalStyleEntries.filter((e) => e.key).map((e) => [e.key, e.value])
  ),
}}
```

**Step 6: Build admin**

Run: `cd packages/admin && pnpm build`
Expected: Clean build.

**Step 7: Commit**

```bash
git add packages/admin/src/pages/DashboardEditor.tsx
git commit -m "feat: integrate StandardVariablesForm into dashboard editor"
```

---

### Task 7: Display — CSS Custom Property Injection

**Files:**
- Modify: `packages/display/src/DisplayApp.tsx`

**Step 1: Update DashboardConfig interface**

In `DisplayApp.tsx`, add to the `dashboard` interface (after line 15, `globalStyles`):

```typescript
    standardVariables?: Record<string, string>;
```

**Step 2: Add CSS injection effect**

After the existing `useEffect` that calls `loadConfig` (line 107-109), add a new effect:

```typescript
  // Inject standard variables as CSS custom properties
  useEffect(() => {
    if (!config?.dashboard.standardVariables) return;

    const vars = config.dashboard.standardVariables;
    const defaults: Record<string, string> = {
      componentBg: "transparent",
      fontColor: "#ffffff",
      fontColorSecondary: "#aaaaaa",
      accentColor: "#1890ff",
      fontFamily: "inherit",
      fontSize: "16px",
      borderStyle: "none",
      borderRadius: "0px",
      componentPadding: "0px",
      componentGap: "0px",
      backgroundColor: "#000000",
    };
    const cssMap: Record<string, string> = {
      componentBg: "--db-component-bg",
      fontColor: "--db-font-color",
      fontColorSecondary: "--db-font-color-secondary",
      accentColor: "--db-accent-color",
      fontFamily: "--db-font-family",
      fontSize: "--db-font-size",
      borderStyle: "--db-border-style",
      borderRadius: "--db-border-radius",
      componentPadding: "--db-component-padding",
      componentGap: "--db-component-gap",
      backgroundColor: "--db-background-color",
    };

    const merged = { ...defaults, ...vars };
    const root = document.documentElement;
    for (const [key, cssProp] of Object.entries(cssMap)) {
      root.style.setProperty(cssProp, merged[key] ?? defaults[key]);
    }

    // Apply background
    const bgType = (vars.backgroundType as string) || "color";
    if (bgType === "image" && vars.backgroundImage) {
      document.body.style.backgroundColor = "";
      document.body.style.backgroundImage = `url(/assets/${vars.backgroundImage})`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
    } else {
      document.body.style.backgroundImage = "";
      document.body.style.backgroundColor = `var(--db-background-color)`;
    }

    return () => {
      for (const cssProp of Object.values(cssMap)) {
        root.style.removeProperty(cssProp);
      }
      document.body.style.backgroundImage = "";
      document.body.style.backgroundColor = "";
    };
  }, [config]);
```

**Step 3: Also merge standardVariables into the globalStyles passed to DashboardRenderer**

Update the `globalStyles` prop on `DashboardRenderer` (line 257) to merge standard variables so `{{style}}` helper works:

```tsx
globalStyles={{
  ...config.dashboard.standardVariables,
  ...config.dashboard.globalStyles,
}}
```

**Step 4: Build display**

Run: `cd packages/display && pnpm build`
Expected: Clean build.

**Step 5: Commit**

```bash
git add packages/display/src/DisplayApp.tsx
git commit -m "feat: inject standard CSS custom properties in display app"
```

---

### Task 8: Preview — Pass Standard Variables in LivePreview

**Files:**
- Modify: `packages/admin/src/components/preview/LivePreview.tsx`

**Step 1: Add standardVariables prop**

Update the `LivePreviewProps` interface to add:

```typescript
  standardVariables?: Record<string, string>;
```

Add it to the destructured props with default `{}`.

**Step 2: Send standardVariables in preview API call**

In the `render` callback (line 28-34), add `standardVariables` to the POST body:

```typescript
        standardVariables,
```

**Step 3: Update ComponentConfigModal to pass standardVariables**

In `packages/admin/src/pages/DashboardEditor.tsx`, the `ComponentConfigModal` passes `globalStyles` to `LivePreview`. Update `ComponentConfigModal.tsx` to also accept and forward `standardVariables`:

In `packages/admin/src/components/dashboard/ComponentConfigModal.tsx`:
- Add `standardVariables?: Record<string, string>` to `ComponentConfigModalProps` (line 64)
- Pass it to `LivePreview` (line 333-341):

```tsx
<LivePreview
  template={component.template}
  styles={component.styles}
  entityBindings={entityBindings}
  parameterValues={parameterValues}
  globalStyles={globalStyles}
  standardVariables={standardVariables}
/>
```

Then in `DashboardEditor.tsx`, pass `standardVariables` to `ComponentConfigModal`:

```tsx
standardVariables={standardVariables as Record<string, string>}
```

**Step 4: Build admin**

Run: `cd packages/admin && pnpm build`
Expected: Clean build.

**Step 5: Commit**

```bash
git add packages/admin/src/components/preview/LivePreview.tsx packages/admin/src/components/dashboard/ComponentConfigModal.tsx packages/admin/src/pages/DashboardEditor.tsx
git commit -m "feat: pass standard variables through preview pipeline"
```

---

### Task 9: Full Build and Manual Test

**Step 1: Full build**

Run: `pnpm build`
Expected: All packages build successfully.

**Step 2: Generate and apply migration**

Run: `pnpm -w run db:generate && pnpm -w run db:migrate`
Expected: Migration applies cleanly.

**Step 3: Manual verification checklist**

- [ ] Open admin, edit a dashboard, see Standard Variables section in Global Styles tab
- [ ] Color pickers work for all color fields
- [ ] Text inputs work for typography/border/padding/gap
- [ ] Background radio toggles between color picker and image asset dropdown
- [ ] Image asset dropdown shows images, thumbnail preview appears after selection
- [ ] Save dashboard, reload — values persist
- [ ] Open display — CSS custom properties appear on `:root` element
- [ ] Background color/image applies to body
- [ ] Component templates using `{{style "componentBg"}}` resolve correctly
- [ ] LivePreview in component config modal reflects standard variables

**Step 4: Commit any fixes, then final commit**

```bash
git add -A
git commit -m "feat: complete standard dashboard variables and background picker"
```

---

### Task 10: Update Documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update CLAUDE.md data model section**

Add `standardVariables` to the dashboards bullet in the Data Model section:

```
- `dashboards` — slug, accessKey, accessMode, globalStyles, standardVariables, layoutSwitchMode
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with standardVariables field"
```
