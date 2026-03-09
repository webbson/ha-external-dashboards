import type { FastifyInstance } from "fastify";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatResponse } from "../server.js";

export function registerDashboardTools(mcp: McpServer, adminApp: FastifyInstance) {
  mcp.tool("dashboard_list", "List all dashboards with entity/glob counts", {}, async () => {
    const res = await adminApp.inject({ method: "GET", url: "/api/dashboards" });
    return formatResponse(res);
  });

  mcp.tool(
    "dashboard_get",
    "Get a dashboard by ID, including its layouts and settings",
    { id: z.number().describe("Dashboard ID") },
    async ({ id }) => {
      const res = await adminApp.inject({ method: "GET", url: `/api/dashboards/${id}` });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "dashboard_create",
    "Create a new dashboard with slug, access mode, theme, and layout settings",
    {
      name: z.string().describe("Dashboard display name"),
      slug: z.string().describe("URL slug (lowercase alphanumeric and hyphens)"),
      accessMode: z
        .enum(["public", "password", "header", "disabled"])
        .optional()
        .describe("Access mode (default: disabled)"),
      password: z.string().optional().describe("Password for password access mode"),
      headerName: z.string().optional().describe("Header name for header access mode"),
      headerValue: z.string().optional().describe("Header value for header access mode"),
      interactiveMode: z.boolean().optional().describe("Enable interactive mode"),
      maxWidth: z.string().optional().describe("Max width CSS value (e.g. '1200px')"),
      padding: z.string().optional().describe("Padding CSS value"),
      themeId: z.number().optional().describe("Theme ID to apply"),
      layoutSwitchMode: z
        .enum(["tabs", "auto-rotate"])
        .optional()
        .describe("How to switch between layouts"),
      layoutRotateInterval: z.number().optional().describe("Auto-rotate interval in seconds"),
      blackoutEntity: z.string().optional().describe("Binary sensor entity ID for blackout"),
      blackoutStartTime: z
        .string()
        .optional()
        .describe("Blackout start time (HH:MM format)"),
      blackoutEndTime: z
        .string()
        .optional()
        .describe("Blackout end time (HH:MM format)"),
    },
    async (params) => {
      const res = await adminApp.inject({
        method: "POST",
        url: "/api/dashboards",
        payload: params,
      });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "dashboard_update",
    "Update a dashboard's settings (partial update)",
    {
      id: z.number().describe("Dashboard ID"),
      name: z.string().optional(),
      slug: z.string().optional(),
      accessMode: z.enum(["public", "password", "header", "disabled"]).optional(),
      password: z.string().optional(),
      headerName: z.string().optional(),
      headerValue: z.string().optional(),
      interactiveMode: z.boolean().optional(),
      maxWidth: z.string().optional(),
      padding: z.string().optional(),
      themeId: z.number().optional(),
      layoutSwitchMode: z.enum(["tabs", "auto-rotate"]).optional(),
      layoutRotateInterval: z.number().optional(),
      blackoutEntity: z.string().optional(),
      blackoutStartTime: z.string().optional(),
      blackoutEndTime: z.string().optional(),
    },
    async ({ id, ...body }) => {
      const res = await adminApp.inject({
        method: "PUT",
        url: `/api/dashboards/${id}`,
        payload: body,
      });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "dashboard_delete",
    "Delete a dashboard",
    { id: z.number().describe("Dashboard ID") },
    async ({ id }) => {
      const res = await adminApp.inject({ method: "DELETE", url: `/api/dashboards/${id}` });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "dashboard_regenerate_key",
    "Regenerate the access key for a dashboard",
    { id: z.number().describe("Dashboard ID") },
    async ({ id }) => {
      const res = await adminApp.inject({
        method: "POST",
        url: `/api/dashboards/${id}/regenerate-key`,
      });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "dashboard_reload",
    "Reload all display clients currently showing a specific dashboard",
    { id: z.number().describe("Dashboard ID") },
    async ({ id }) => {
      const res = await adminApp.inject({
        method: "POST",
        url: `/api/dashboards/${id}/reload`,
      });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "dashboard_copy",
    "Deep copy a dashboard including all layouts and component instances",
    { id: z.number().describe("Dashboard ID to copy") },
    async ({ id }) => {
      const res = await adminApp.inject({
        method: "POST",
        url: `/api/dashboards/${id}/copy`,
      });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "dashboard_set_layouts",
    "Set the layouts (tabs) for a dashboard. Each layout entry needs a layoutId and sortOrder, plus an optional label and/or icon.",
    {
      id: z.number().describe("Dashboard ID"),
      layouts: z
        .string()
        .describe(
          'JSON array of layout entries, e.g. [{"layoutId":1,"sortOrder":0,"label":"Main","icon":null}]',
        ),
    },
    async ({ id, layouts }) => {
      const res = await adminApp.inject({
        method: "PUT",
        url: `/api/dashboards/${id}/layouts`,
        payload: JSON.parse(layouts),
      });
      return formatResponse(res);
    },
  );

  // --- Component Instance tools ---

  mcp.tool(
    "instance_list",
    "List all component instances in a dashboard layout",
    { dashboardLayoutId: z.number().describe("Dashboard-layout join table ID") },
    async ({ dashboardLayoutId }) => {
      const res = await adminApp.inject({
        method: "GET",
        url: `/api/dashboard-layouts/${dashboardLayoutId}/instances`,
      });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "instance_create",
    "Add a component instance to a dashboard layout region",
    {
      dashboardLayoutId: z.number().describe("Dashboard-layout join table ID"),
      componentId: z.number().describe("Component ID to instantiate"),
      regionId: z.string().describe("Layout region ID to place the instance in"),
      sortOrder: z.number().optional().describe("Sort order within the region (default: 0)"),
      parameterValues: z
        .string()
        .optional()
        .describe('JSON object of parameter values, e.g. {"title":"Hello","showIcon":true}'),
      entityBindings: z
        .string()
        .optional()
        .describe(
          'JSON object of entity bindings, e.g. {"entity":"light.bedroom"} or {"entities":["sensor.a","sensor.b"]}',
        ),
      visibilityRules: z
        .string()
        .optional()
        .describe(
          'JSON array of visibility rules, e.g. [{"entityId":"binary_sensor.x","operator":"eq","value":"on"}]',
        ),
      entityFilters: z
        .string()
        .optional()
        .describe("JSON object of entity filters per selector name"),
      parentInstanceId: z
        .number()
        .optional()
        .describe("Parent container instance ID for nesting"),
      tabLabel: z.string().optional().describe("Tab label when inside a tabs container"),
      tabIcon: z.string().optional().describe("Tab icon when inside a tabs container"),
    },
    async ({ dashboardLayoutId, parameterValues, entityBindings, visibilityRules, entityFilters, ...rest }) => {
      const payload: Record<string, unknown> = { ...rest };
      if (parameterValues) payload.parameterValues = JSON.parse(parameterValues);
      if (entityBindings) payload.entityBindings = JSON.parse(entityBindings);
      if (visibilityRules) payload.visibilityRules = JSON.parse(visibilityRules);
      if (entityFilters) payload.entityFilters = JSON.parse(entityFilters);

      const res = await adminApp.inject({
        method: "POST",
        url: `/api/dashboard-layouts/${dashboardLayoutId}/instances`,
        payload,
      });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "instance_update",
    "Update a component instance (partial update)",
    {
      instanceId: z.number().describe("Component instance ID"),
      componentId: z.number().optional().describe("Change the component"),
      regionId: z.string().optional().describe("Move to a different region"),
      sortOrder: z.number().optional(),
      parameterValues: z.string().optional().describe("JSON object of parameter values"),
      entityBindings: z.string().optional().describe("JSON object of entity bindings"),
      visibilityRules: z.string().optional().describe("JSON array of visibility rules"),
      entityFilters: z.string().optional().describe("JSON object of entity filters"),
      parentInstanceId: z.number().optional(),
      tabLabel: z.string().optional(),
      tabIcon: z.string().optional(),
    },
    async ({ instanceId, parameterValues, entityBindings, visibilityRules, entityFilters, ...rest }) => {
      const payload: Record<string, unknown> = { ...rest };
      if (parameterValues) payload.parameterValues = JSON.parse(parameterValues);
      if (entityBindings) payload.entityBindings = JSON.parse(entityBindings);
      if (visibilityRules) payload.visibilityRules = JSON.parse(visibilityRules);
      if (entityFilters) payload.entityFilters = JSON.parse(entityFilters);

      const res = await adminApp.inject({
        method: "PUT",
        url: `/api/instances/${instanceId}`,
        payload,
      });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "instance_delete",
    "Delete a component instance (cascades to children in containers)",
    { instanceId: z.number().describe("Component instance ID") },
    async ({ instanceId }) => {
      const res = await adminApp.inject({
        method: "DELETE",
        url: `/api/instances/${instanceId}`,
      });
      return formatResponse(res);
    },
  );
}
