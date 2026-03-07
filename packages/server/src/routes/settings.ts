import { FastifyInstance } from "fastify";

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/api/settings", async () => {
    return {
      externalBaseUrl: process.env.EXTERNAL_BASE_URL ?? null,
      devMode: process.env.NODE_ENV === "development",
    };
  });
}
