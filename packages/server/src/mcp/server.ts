import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerDashboardTools } from "./tools/dashboards.js";
import { registerComponentTools } from "./tools/components.js";
import { registerLayoutTools } from "./tools/layouts.js";
import { registerThemeTools } from "./tools/themes.js";
import { registerAssetTools } from "./tools/assets.js";
import { registerOtherTools } from "./tools/other.js";

export type InjectFn = FastifyInstance["inject"];

const isDev = process.env.NODE_ENV === "development";

export function createMcpServer(adminApp: FastifyInstance): McpServer {
  const mcp = new McpServer({
    name: "ha-external-dashboards",
    version: "0.0.1",
  });

  registerDashboardTools(mcp, adminApp);
  registerComponentTools(mcp, adminApp);
  registerLayoutTools(mcp, adminApp);
  registerThemeTools(mcp, adminApp);
  registerAssetTools(mcp, adminApp);
  registerOtherTools(mcp, adminApp);

  return mcp;
}

export function formatResponse(res: { statusCode: number; body: string }) {
  const isError = res.statusCode >= 400;
  let text: string;
  try {
    const parsed = JSON.parse(res.body);
    text = JSON.stringify(parsed, null, 2);
  } catch {
    text = res.body;
  }
  return {
    content: [{ type: "text" as const, text }],
    isError,
  };
}

async function mcpApiKeyAuth(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = process.env.MCP_API_KEY;

  if (!apiKey) {
    if (isDev) return; // skip auth in dev mode with no key
    return reply.code(503).send({ error: "MCP not configured — set MCP_API_KEY" });
  }

  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ") || authHeader.slice(7) !== apiKey) {
    return reply.code(401).send({ error: "Invalid or missing API key" });
  }
}

export async function mcpPlugin(app: FastifyInstance, adminApp: FastifyInstance) {
  // POST /mcp — handle MCP JSON-RPC requests (stateless mode)
  app.post("/mcp", { preHandler: mcpApiKeyAuth }, async (request, reply) => {
    const server = createMcpServer(adminApp);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    reply.hijack();
    await server.connect(transport);
    await transport.handleRequest(request.raw, reply.raw, request.body);
  });

  // GET /mcp — not needed for stateless mode, return 405
  app.get("/mcp", { preHandler: mcpApiKeyAuth }, async (_request, reply) => {
    reply.code(405).send({ error: "SSE sessions not supported in stateless mode" });
  });

  // DELETE /mcp — not needed for stateless mode, return 405
  app.delete("/mcp", { preHandler: mcpApiKeyAuth }, async (_request, reply) => {
    reply.code(405).send({ error: "Session termination not supported in stateless mode" });
  });
}
