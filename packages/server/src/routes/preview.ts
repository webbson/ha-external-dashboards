import { FastifyInstance } from "fastify";
import { z } from "zod";
import { haClient } from "../ws/ha-client.js";
import Handlebars from "handlebars";
import { STANDARD_VARIABLE_DEFAULTS, STANDARD_VARIABLE_CSS_MAP } from "@ha-dashboards/shared";
import type { StandardVariables } from "@ha-dashboards/shared";

// Register the same helpers server-side for preview rendering
import "../template/helpers.js";

const renderSchema = z.object({
  template: z.string(),
  styles: z.string().default(""),
  entityBindings: z.record(z.union([z.string(), z.array(z.string())])).default({}),
  parameterValues: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
  globalStyles: z.record(z.string()).default({}),
  standardVariables: z.record(z.string()).default({}),
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

    // Resolve entity bindings to actual states
    const entities: Record<string, unknown> = {};
    for (const [key, binding] of Object.entries(body.entityBindings)) {
      if (Array.isArray(binding)) {
        for (const entityId of binding) {
          const state = haClient.getState(entityId);
          if (state) entities[entityId] = state;
        }
        entities[key] = binding.map((id) => haClient.getState(id)).filter(Boolean);
      } else {
        const state = haClient.getState(binding);
        if (state) {
          entities[binding] = state;
          entities[key] = state;
        }
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
