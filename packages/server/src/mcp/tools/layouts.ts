import type { FastifyInstance } from "fastify";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatResponse } from "../server.js";

export function registerLayoutTools(mcp: McpServer, adminApp: FastifyInstance) {
  mcp.tool("layout_list", "List all layouts with their usage counts", {}, async () => {
    const res = await adminApp.inject({ method: "GET", url: "/api/layouts" });
    return formatResponse(res);
  });

  mcp.tool(
    "layout_get",
    "Get a layout by ID including its grid template and region definitions",
    { id: z.number().describe("Layout ID") },
    async ({ id }) => {
      const res = await adminApp.inject({ method: "GET", url: `/api/layouts/${id}` });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "layout_create",
    "Create a new layout with a CSS grid template and region definitions",
    {
      name: z.string().describe("Layout name"),
      structure: z
        .string()
        .describe(
          'JSON object with gridTemplate (CSS grid-template-areas/rows/columns) and regions array. Example: {"gridTemplate":"\'header header\' \'left right\' / 1fr 1fr","regions":[{"id":"header"},{"id":"left"},{"id":"right"}]}. Region options: applyChromeTo ("components"|"region"), flexDirection, justifyContent, alignItems, flexGrow',
        ),
    },
    async ({ name, structure }) => {
      const res = await adminApp.inject({
        method: "POST",
        url: "/api/layouts",
        payload: { name, structure: JSON.parse(structure) },
      });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "layout_update",
    "Update a layout (partial update)",
    {
      id: z.number().describe("Layout ID"),
      name: z.string().optional(),
      structure: z.string().optional().describe("JSON object with gridTemplate and regions"),
    },
    async ({ id, name, structure }) => {
      const payload: Record<string, unknown> = {};
      if (name !== undefined) payload.name = name;
      if (structure !== undefined) payload.structure = JSON.parse(structure);

      const res = await adminApp.inject({
        method: "PUT",
        url: `/api/layouts/${id}`,
        payload,
      });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "layout_delete",
    "Delete a layout. Fails with 409 if the layout is in use by any dashboard.",
    { id: z.number().describe("Layout ID") },
    async ({ id }) => {
      const res = await adminApp.inject({ method: "DELETE", url: `/api/layouts/${id}` });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "layout_import",
    "Import a layout from an exported JSON definition",
    {
      exportData: z
        .string()
        .describe("JSON string of the exported layout definition (as returned by layout export)"),
    },
    async ({ exportData }) => {
      const res = await adminApp.inject({
        method: "POST",
        url: "/api/layouts/import",
        payload: JSON.parse(exportData),
      });
      return formatResponse(res);
    },
  );
}
