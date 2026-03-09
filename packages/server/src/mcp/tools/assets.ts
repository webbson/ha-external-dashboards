import type { FastifyInstance } from "fastify";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatResponse } from "../server.js";

function buildMultipartPayload(
  boundary: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string,
  folder?: string,
): Buffer {
  const CRLF = "\r\n";
  const parts: Buffer[] = [];

  // File field
  parts.push(
    Buffer.from(
      `--${boundary}${CRLF}Content-Disposition: form-data; name="file"; filename="${fileName}"${CRLF}Content-Type: ${mimeType}${CRLF}${CRLF}`,
    ),
  );
  parts.push(buffer);
  parts.push(Buffer.from(CRLF));

  // Folder field
  if (folder) {
    parts.push(
      Buffer.from(
        `--${boundary}${CRLF}Content-Disposition: form-data; name="folder"${CRLF}${CRLF}${folder}${CRLF}`,
      ),
    );
  }

  // Closing boundary
  parts.push(Buffer.from(`--${boundary}--${CRLF}`));

  return Buffer.concat(parts);
}

export function registerAssetTools(mcp: McpServer, adminApp: FastifyInstance) {
  mcp.tool(
    "asset_list",
    "List all assets, optionally filtered by folder",
    { folder: z.string().optional().describe("Filter by virtual folder name") },
    async ({ folder }) => {
      const query = folder ? `?folder=${encodeURIComponent(folder)}` : "";
      const res = await adminApp.inject({ method: "GET", url: `/api/assets${query}` });
      return formatResponse(res);
    },
  );

  mcp.tool("asset_list_folders", "List all distinct asset folder names", {}, async () => {
    const res = await adminApp.inject({ method: "GET", url: "/api/assets/folders" });
    return formatResponse(res);
  });

  mcp.tool(
    "asset_get",
    "Get asset metadata by ID",
    { id: z.number().describe("Asset ID") },
    async ({ id }) => {
      const res = await adminApp.inject({ method: "GET", url: `/api/assets/${id}` });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "asset_upload",
    "Upload a file asset (provide base64-encoded content)",
    {
      fileName: z.string().describe("File name with extension (e.g. 'background.png')"),
      base64Content: z.string().describe("Base64-encoded file content"),
      mimeType: z.string().describe("MIME type (e.g. 'image/png', 'image/svg+xml')"),
      folder: z.string().optional().describe("Virtual folder name for organization"),
    },
    async ({ fileName, base64Content, mimeType, folder }) => {
      const boundary = "----mcpuploadboundary";
      const buffer = Buffer.from(base64Content, "base64");
      const payload = buildMultipartPayload(boundary, fileName, buffer, mimeType, folder);

      const res = await adminApp.inject({
        method: "POST",
        url: "/api/assets/upload",
        headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
        payload,
      });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "asset_move",
    "Move an asset to a different folder",
    {
      id: z.number().describe("Asset ID"),
      folder: z.string().describe("Target folder name (or empty string for root)"),
    },
    async ({ id, folder }) => {
      const res = await adminApp.inject({
        method: "PUT",
        url: `/api/assets/${id}`,
        payload: { folder: folder || null },
      });
      return formatResponse(res);
    },
  );

  mcp.tool(
    "asset_delete",
    "Delete an asset and its physical file",
    { id: z.number().describe("Asset ID") },
    async ({ id }) => {
      const res = await adminApp.inject({ method: "DELETE", url: `/api/assets/${id}` });
      return formatResponse(res);
    },
  );
}
