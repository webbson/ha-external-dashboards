import type { FastifyInstance } from "fastify";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatResponse } from "../server.js";

export function registerComponentTools(mcp: McpServer, adminApp: FastifyInstance) {
  mcp.tool(
    "component_authoring_guide",
    "Get the full component authoring guide — Handlebars helpers, CSS variables, entity selectors, parameter types, script modes, and examples. Read this before creating or updating components.",
    {},
    async () => {
      const res = await adminApp.inject({ method: "GET", url: "/component-authoring-skill.md" });
      if (res.statusCode >= 400) {
        return { content: [{ type: "text" as const, text: "Guide not found" }], isError: true };
      }
      return { content: [{ type: "text" as const, text: res.body }] };
    },
  );

  mcp.tool("component_list", "List all components with their usage counts", {}, async () => {
    const res = await adminApp.inject({ method: "GET", url: "/api/components" });
    return formatResponse(res);
  });

  mcp.tool(
    "component_get",
    "Get a component by ID including its template, styles, parameter definitions, and entity selector definitions",
    { id: z.number().describe("Component ID") },
    async ({ id }) => {
      const res = await adminApp.inject({ method: "GET", url: `/api/components/${id}` });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "component_create",
    "Create a new component with Handlebars template, CSS styles, parameter definitions, and entity selector definitions",
    {
      name: z.string().describe("Component name"),
      template: z.string().optional().describe("Handlebars template HTML"),
      styles: z.string().optional().describe("CSS styles (internal layout only, no chrome/bg)"),
      parameterDefs: z
        .string()
        .optional()
        .describe(
          'JSON array of parameter definitions, e.g. [{"name":"title","label":"Title","type":"string","default":"Hello"}]. Types: string, number, boolean, color, select, icon',
        ),
      entitySelectorDefs: z
        .string()
        .optional()
        .describe(
          'JSON array of entity selector definitions, e.g. [{"name":"entity","label":"Entity","mode":"single"}]. Modes: single, multiple, glob',
        ),
      isContainer: z.boolean().optional().describe("Whether this component is a container for other components"),
      containerConfig: z
        .string()
        .optional()
        .describe('JSON container config, e.g. {"type":"tabs"} or {"type":"auto-rotate","rotateInterval":10}'),
      testEntityBindings: z
        .string()
        .optional()
        .describe("JSON object of test entity bindings for preview"),
    },
    async ({ parameterDefs, entitySelectorDefs, containerConfig, testEntityBindings, ...rest }) => {
      const payload: Record<string, unknown> = { ...rest };
      if (parameterDefs) payload.parameterDefs = JSON.parse(parameterDefs);
      if (entitySelectorDefs) payload.entitySelectorDefs = JSON.parse(entitySelectorDefs);
      if (containerConfig) payload.containerConfig = JSON.parse(containerConfig);
      if (testEntityBindings) payload.testEntityBindings = JSON.parse(testEntityBindings);

      const res = await adminApp.inject({
        method: "POST",
        url: "/api/components",
        payload,
      });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "component_update",
    "Update a component (partial update). Triggers reload on all dashboards using this component.",
    {
      id: z.number().describe("Component ID"),
      name: z.string().optional(),
      template: z.string().optional(),
      styles: z.string().optional(),
      parameterDefs: z.string().optional().describe("JSON array of parameter definitions"),
      entitySelectorDefs: z.string().optional().describe("JSON array of entity selector definitions"),
      isContainer: z.boolean().optional(),
      containerConfig: z.string().optional().describe("JSON container config or null"),
      testEntityBindings: z.string().optional().describe("JSON object of test entity bindings"),
    },
    async ({ id, parameterDefs, entitySelectorDefs, containerConfig, testEntityBindings, ...rest }) => {
      const payload: Record<string, unknown> = { ...rest };
      if (parameterDefs) payload.parameterDefs = JSON.parse(parameterDefs);
      if (entitySelectorDefs) payload.entitySelectorDefs = JSON.parse(entitySelectorDefs);
      if (containerConfig !== undefined) payload.containerConfig = JSON.parse(containerConfig!);
      if (testEntityBindings !== undefined)
        payload.testEntityBindings = JSON.parse(testEntityBindings!);

      const res = await adminApp.inject({
        method: "PUT",
        url: `/api/components/${id}`,
        payload,
      });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "component_delete",
    "Delete a component. Fails with 409 if the component is in use by any dashboard.",
    { id: z.number().describe("Component ID") },
    async ({ id }) => {
      const res = await adminApp.inject({ method: "DELETE", url: `/api/components/${id}` });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "component_copy",
    "Create a copy of an existing component",
    { id: z.number().describe("Component ID to copy") },
    async ({ id }) => {
      const res = await adminApp.inject({
        method: "POST",
        url: `/api/components/${id}/copy`,
      });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "component_import",
    "Import a component from an exported JSON definition",
    {
      exportData: z
        .string()
        .describe(
          "JSON string of the exported component definition (as returned by component export)",
        ),
    },
    async ({ exportData }) => {
      const res = await adminApp.inject({
        method: "POST",
        url: "/api/components/import",
        payload: JSON.parse(exportData),
      });
      return formatResponse(res);
    },
  );
}
