import { FastifyInstance } from "fastify";

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/api/settings", async () => {
    const devMode = process.env.NODE_ENV === "development";
    return {
      externalBaseUrl: process.env.EXTERNAL_BASE_URL ?? null,
      devMode,
      mcpEnabled: !!process.env.MCP_API_KEY || devMode,
      mcpApiKey: process.env.MCP_API_KEY ?? null,
    };
  });
}
