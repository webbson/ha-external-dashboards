import type { FastifyInstance } from "fastify";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatResponse } from "../server.js";

export function registerAdminTools(mcp: McpServer, adminApp: FastifyInstance) {
  mcp.tool(
    "admin_backup",
    "Download a full JSON backup of the dashboard database (themes, layouts, components, dashboards, dashboard_layouts, component_instances, assets, dashboard_entity_access).",
    {},
    async () => {
      const res = await adminApp.inject({
        method: "GET",
        url: "/api/admin/backup",
      });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "admin_restore",
    "Restore the dashboard database from a backup JSON payload. Destroys all existing data and replaces it. Rate-limited to 1/min per IP.",
    {
      backup: z
        .string()
        .describe(
          "Full backup payload as a JSON string — must match the output of admin_backup (version 1)",
        ),
    },
    async ({ backup }) => {
      try {
        const payload = JSON.parse(backup);
        const res = await adminApp.inject({
          method: "POST",
          url: "/api/admin/restore",
          payload,
        });
        return formatResponse(res);
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Invalid JSON in backup argument: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  mcp.tool(
    "admin_diagnostics",
    "Get runtime diagnostics: HA WebSocket status, connected display clients per dashboard, DB size and table counts, entity count, server uptime and version.",
    {},
    async () => {
      const res = await adminApp.inject({
        method: "GET",
        url: "/api/admin/diagnostics",
      });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "clients_list",
    "List known display clients (persistent rows in display_clients) with their aliases, hostnames, last-seen timestamps, and current connected status.",
    {},
    async () => {
      const res = await adminApp.inject({
        method: "GET",
        url: "/api/admin/clients",
      });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "clients_set_alias",
    "Set or clear the human-readable alias for a known display client.",
    {
      id: z.number().int().positive().describe("Client row id from clients_list"),
      alias: z
        .string()
        .nullable()
        .describe("Alias text. Pass null or empty string to clear."),
    },
    async ({ id, alias }) => {
      const res = await adminApp.inject({
        method: "PATCH",
        url: `/api/admin/clients/${id}`,
        payload: { alias },
      });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "clients_forget",
    "Delete a known display client. If the client is currently connected, the row will be recreated on the next WS connect — without the alias.",
    {
      id: z.number().int().positive().describe("Client row id from clients_list"),
    },
    async ({ id }) => {
      const res = await adminApp.inject({
        method: "DELETE",
        url: `/api/admin/clients/${id}`,
      });
      return formatResponse(res);
    },
  );
}
