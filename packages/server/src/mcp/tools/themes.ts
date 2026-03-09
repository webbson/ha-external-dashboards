import type { FastifyInstance } from "fastify";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatResponse } from "../server.js";

export function registerThemeTools(mcp: McpServer, adminApp: FastifyInstance) {
  mcp.tool("theme_list", "List all themes with their usage counts", {}, async () => {
    const res = await adminApp.inject({ method: "GET", url: "/api/themes" });
    return formatResponse(res);
  });

  mcp.tool(
    "theme_get",
    "Get a theme by ID including its standard variables and global styles",
    { id: z.number().describe("Theme ID") },
    async ({ id }) => {
      const res = await adminApp.inject({ method: "GET", url: `/api/themes/${id}` });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "theme_create",
    "Create a new theme with standard CSS variables and optional global styles",
    {
      name: z.string().describe("Theme name"),
      standardVariables: z
        .string()
        .optional()
        .describe(
          'JSON object of standard CSS variables. Keys: componentBg, fontColor, fontColorSecondary, accentColor, fontFamily, fontSize, borderStyle, borderRadius, componentPadding, componentGap, backgroundColor, backgroundImage, tabBarBg, tabBarColor, tabBarActiveColor, tabBarActiveBg, tabBarFontSize',
        ),
      globalStyles: z
        .string()
        .optional()
        .describe("JSON object of custom CSS variable name-value pairs"),
    },
    async ({ name, standardVariables, globalStyles }) => {
      const payload: Record<string, unknown> = { name };
      if (standardVariables) payload.standardVariables = JSON.parse(standardVariables);
      if (globalStyles) payload.globalStyles = JSON.parse(globalStyles);

      const res = await adminApp.inject({
        method: "POST",
        url: "/api/themes",
        payload,
      });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "theme_update",
    "Update a theme (partial update). Triggers reload on all dashboards using this theme.",
    {
      id: z.number().describe("Theme ID"),
      name: z.string().optional(),
      standardVariables: z.string().optional().describe("JSON object of standard CSS variables"),
      globalStyles: z.string().optional().describe("JSON object of custom CSS variables"),
    },
    async ({ id, name, standardVariables, globalStyles }) => {
      const payload: Record<string, unknown> = {};
      if (name !== undefined) payload.name = name;
      if (standardVariables !== undefined)
        payload.standardVariables = JSON.parse(standardVariables);
      if (globalStyles !== undefined) payload.globalStyles = JSON.parse(globalStyles);

      const res = await adminApp.inject({
        method: "PUT",
        url: `/api/themes/${id}`,
        payload,
      });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "theme_delete",
    "Delete a theme. Fails with 409 if the theme is in use by any dashboard.",
    { id: z.number().describe("Theme ID") },
    async ({ id }) => {
      const res = await adminApp.inject({ method: "DELETE", url: `/api/themes/${id}` });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "theme_copy",
    "Create a copy of an existing theme",
    { id: z.number().describe("Theme ID to copy") },
    async ({ id }) => {
      const res = await adminApp.inject({
        method: "POST",
        url: `/api/themes/${id}/copy`,
      });
      return formatResponse(res);
    },
  );
}
