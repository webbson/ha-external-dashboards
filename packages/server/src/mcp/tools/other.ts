import type { FastifyInstance } from "fastify";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatResponse } from "../server.js";

export function registerOtherTools(mcp: McpServer, adminApp: FastifyInstance) {
  mcp.tool(
    "preview_render",
    "Server-side render a Handlebars template with entity data and theme variables. Returns rendered HTML and resolved styles.",
    {
      template: z.string().describe("Handlebars template HTML"),
      styles: z.string().optional().describe("CSS styles"),
      entityBindings: z
        .string()
        .optional()
        .describe("JSON object of entity bindings"),
      parameterValues: z
        .string()
        .optional()
        .describe("JSON object of parameter values"),
      standardVariables: z
        .string()
        .optional()
        .describe("JSON object of theme standard variables"),
      globalStyles: z
        .string()
        .optional()
        .describe("JSON object of theme global styles (custom CSS variables)"),
      entityFilters: z
        .string()
        .optional()
        .describe("JSON object of entity filters per selector"),
    },
    async ({ template, styles, entityBindings, parameterValues, standardVariables, globalStyles, entityFilters }) => {
      const payload: Record<string, unknown> = { template };
      if (styles !== undefined) payload.styles = styles;
      if (entityBindings) payload.entityBindings = JSON.parse(entityBindings);
      if (parameterValues) payload.parameterValues = JSON.parse(parameterValues);
      if (standardVariables) payload.standardVariables = JSON.parse(standardVariables);
      if (globalStyles) payload.globalStyles = JSON.parse(globalStyles);
      if (entityFilters) payload.entityFilters = JSON.parse(entityFilters);

      const res = await adminApp.inject({
        method: "POST",
        url: "/api/preview/render",
        payload,
      });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "popup_trigger",
    "Broadcast a popup to one or more dashboards. Content can be text, image, or video.",
    {
      contentType: z.enum(["text", "image", "video"]).describe("Popup content type"),
      body: z.string().optional().describe("Text body (for text type)"),
      mediaUrl: z.string().optional().describe("Media URL (for image/video type)"),
      timeout: z.number().optional().describe("Display duration in seconds (default: 10)"),
      targetDashboardIds: z
        .string()
        .optional()
        .describe("JSON array of dashboard IDs to target (empty = all dashboards)"),
    },
    async ({ contentType, body, mediaUrl, timeout, targetDashboardIds }) => {
      const payload: Record<string, unknown> = {
        content: { type: contentType, body, mediaUrl },
      };
      if (timeout !== undefined) payload.timeout = timeout;
      if (targetDashboardIds) payload.targetDashboardIds = JSON.parse(targetDashboardIds);

      const res = await adminApp.inject({
        method: "POST",
        url: "/api/trigger/popup",
        payload,
      });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "ha_entities_list",
    "List available Home Assistant entities with optional filtering by domain, state, attributes, or search term. Returns entity IDs, current states, and attributes.",
    {
      domain: z
        .string()
        .optional()
        .describe("Filter by entity domain (e.g. 'light', 'sensor', 'binary_sensor')"),
      state: z
        .string()
        .optional()
        .describe("Filter by current state value (e.g. 'on', 'off')"),
      stateNot: z
        .string()
        .optional()
        .describe("Exclude entities with this state (e.g. 'unavailable')"),
      attribute: z
        .string()
        .optional()
        .describe("Attribute name to filter on (use with attributeValue)"),
      attributeValue: z
        .string()
        .optional()
        .describe("Required attribute value (used with attribute)"),
      search: z
        .string()
        .optional()
        .describe("Free-text search across entity_id and friendly_name"),
      limit: z
        .number()
        .optional()
        .describe("Max results to return (default 200, max 1000)"),
    },
    async (params) => {
      const qs = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) qs.set(key, String(value));
      }
      const url = `/api/ha/entities${qs.size ? `?${qs}` : ""}`;
      const res = await adminApp.inject({ method: "GET", url });
      return formatResponse(res);
    },
  );

  mcp.tool("settings_get", "Get server settings (external base URL, dev mode status)", {}, async () => {
    const res = await adminApp.inject({ method: "GET", url: "/api/settings" });
    return formatResponse(res);
  });
}
