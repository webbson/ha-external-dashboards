import { FastifyInstance } from "fastify";
import { z } from "zod";
import { haClient } from "../ws/ha-client.js";
import Handlebars from "handlebars";
import {
  STANDARD_VARIABLE_DEFAULTS,
  STANDARD_VARIABLE_CSS_MAP,
  isGlobPattern,
  matchGlob,
} from "@ha-external-dashboards/shared";
import type { StandardVariables } from "@ha-external-dashboards/shared";

// Register the same helpers server-side for preview rendering
import "../template/helpers.js";

const renderSchema = z.object({
  template: z.string(),
  styles: z.string().default(""),
  entityBindings: z.record(z.union([z.string(), z.array(z.string())])).default({}),
  parameterValues: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
  globalStyles: z.record(z.string()).default({}),
  standardVariables: z.record(z.string()).default({}),
  entityFilters: z
    .record(
      z.object({
        attributeFilters: z
          .array(z.object({ attribute: z.string(), operator: z.string(), value: z.string() }))
          .optional(),
        stateFilters: z
          .array(z.object({ operator: z.string(), value: z.string() }))
          .optional(),
      })
    )
    .default({}),
});

function buildStandardVarsCss(vars: Partial<StandardVariables>): string {
  const merged = { ...STANDARD_VARIABLE_DEFAULTS, ...vars };
  const lines: string[] = [];
  for (const [key, cssProp] of Object.entries(STANDARD_VARIABLE_CSS_MAP)) {
    const value = merged[key as keyof typeof STANDARD_VARIABLE_CSS_MAP];
    if (value) lines.push(`  ${cssProp}: ${value};`);
  }
  return `:root {\n${lines.join("\n")}\n}`;
}

export async function previewRoutes(app: FastifyInstance) {
  app.post("/api/preview/render", async (req) => {
    const body = renderSchema.parse(req.body);

    // Make ALL HA entity states available to the template context.
    // Preview renders server-side so this has no serialization cost.
    // This ensures deriveEntity + attr/state lookups always resolve,
    // even for entities outside the direct binding/glob expansion.
    const entities: Record<string, unknown> = {};
    for (const [id, st] of haClient.getAllStates()) {
      entities[id] = st;
    }

    // Resolve glob expansions (filters control what eachEntity iterates over)
    const globExpansions: Record<string, string[]> = {};
    for (const [key, binding] of Object.entries(body.entityBindings)) {
      if (Array.isArray(binding)) {
        // nothing extra needed — entities already in context
      } else if (isGlobPattern(binding)) {
        const allIds = Array.from(haClient.getAllStates().keys());
        let expanded = matchGlob(binding, allIds);

        // Apply server-side filters to reduce the eachEntity iteration set
        const selectorFilters = body.entityFilters[key];
        const attrFilters = selectorFilters?.attributeFilters;
        const stFilters = selectorFilters?.stateFilters;
        if (
          (attrFilters && attrFilters.length > 0) ||
          (stFilters && stFilters.length > 0)
        ) {
          expanded = expanded.filter((id) => {
            const st = haClient.getState(id);
            if (!st) return false;
            if (attrFilters && attrFilters.length > 0) {
              const passes = attrFilters.every((f) => {
                const val = String(st.attributes?.[f.attribute] ?? "");
                switch (f.operator) {
                  case "eq": return val === f.value;
                  case "neq": return val !== f.value;
                  case "contains": return val.includes(f.value);
                  case "startsWith": return val.startsWith(f.value);
                  default: return true;
                }
              });
              if (!passes) return false;
            }
            if (stFilters && stFilters.length > 0) {
              const passes = stFilters.every((f) => {
                switch (f.operator) {
                  case "eq": return st.state === f.value;
                  case "neq": return st.state !== f.value;
                  case "contains": return st.state?.includes(f.value);
                  case "startsWith": return st.state?.startsWith(f.value);
                  default: return true;
                }
              });
              if (!passes) return false;
            }
            return true;
          });
        }

        globExpansions[binding] = expanded;
      }
    }

    try {
      const compiled = Handlebars.compile(body.template);
      // Merge entity binding values into params so templates can use
      // {{state (param "entity")}} — (param "entity") resolves the entity_id
      // string, then state looks it up in the entities map.
      const params: Record<string, string | number | boolean | string[]> = {
        ...body.entityBindings,
        ...body.parameterValues,
      };

      const html = compiled({
        entities,
        params,
        globalStyles: body.globalStyles,
        globExpansions,
      });

      const standardCss = buildStandardVarsCss(body.standardVariables as Partial<StandardVariables>);
      return {
        html,
        styles: `${standardCss}\n${body.styles}`,
      };
    } catch (err) {
      return {
        html: `<div style="color:red">Template error: ${(err as Error).message}</div>`,
        styles: "",
      };
    }
  });
}
