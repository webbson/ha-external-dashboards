import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import fastifyCors from "@fastify/cors";
import fastifyWebsocket from "@fastify/websocket";
import fastifyRateLimit from "@fastify/rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { runMigrations } from "./db/migrate.js";
import { haClient } from "./ws/ha-client.js";
import { connectionManager } from "./ws/manager.js";
import { setupWebSocketProxy } from "./ws/proxy.js";
import { dashboardRoutes } from "./routes/dashboards.js";
import { layoutRoutes } from "./routes/layouts.js";
import { componentRoutes } from "./routes/components.js";
import { themeRoutes } from "./routes/themes.js";
import { assetRoutes } from "./routes/assets.js";
import { haProxyRoutes, haImageProxyRoutes, haHistoryProxyRoutes, haStatisticsProxyRoutes } from "./routes/ha-proxy.js";
import { externalHaProxyRoutes } from "./routes/external-ha-proxy.js";
import { previewRoutes } from "./routes/preview.js";
import { settingsRoutes } from "./routes/settings.js";
import { popupTriggerRoutes } from "./routes/popup-trigger.js";
import { switchLayoutTriggerRoutes } from "./routes/switch-layout-trigger.js";
import { displayDataRoutes } from "./routes/display-data.js";
import { iconRoutes } from "./routes/icons.js";
import { backupRoutes } from "./routes/admin/backup.js";
import { restoreRoutes } from "./routes/admin/restore.js";
import { diagnosticsRoutes } from "./routes/admin/diagnostics.js";
import { clientsRoutes } from "./routes/admin/clients.js";
import { ingressAuth } from "./middleware/auth.js";
import { dashboardLogin } from "./middleware/dashboard-auth.js";
import { seedPrebuiltComponents } from "./prebuilt/index.js";
import { errorHandler } from "./middleware/error-handler.js";
import { recomputeAllEntityAccess } from "./services/entity-access.js";
import { mcpPlugin } from "./mcp/server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INGRESS_PORT = parseInt(process.env.INGRESS_PORT ?? "8080");
const EXTERNAL_PORT = parseInt(process.env.EXTERNAL_PORT ?? "8099");
const isDev = process.env.NODE_ENV === "development";

// Validate critical env vars at startup
if (!isDev && !process.env.SUPERVISOR_TOKEN) {
  console.warn("[WARN] SUPERVISOR_TOKEN not set — HA integration will be unavailable");
}
if (!process.env.JWT_SECRET) {
  console.warn("[WARN] JWT_SECRET not set — dashboard auth tokens will not survive restarts");
}
if (!process.env.MCP_API_KEY) {
  console.warn("[WARN] MCP_API_KEY not set — MCP endpoint will be unavailable outside dev mode");
}

async function start() {
  // Run database migrations
  runMigrations();

  // Seed prebuilt components
  await seedPrebuiltComponents();

  // Backfill entity access table for all dashboards
  await recomputeAllEntityAccess();

  // Connect to HA WebSocket + forward state changes to display clients
  haClient.setOnStateChanged((entityId, newState) => {
    connectionManager.sendStateUpdate(entityId, newState, newState.attributes);
  });
  haClient.connect().catch((err) => {
    console.warn("HA WebSocket initial connection failed:", err.message);
  });

  // Structured logger config — request IDs for correlation, compact serializers.
  const loggerConfig = {
    level: "info",
    serializers: {
      req: (req: { id: string; method: string; url: string }) => ({
        id: req.id,
        method: req.method,
        url: req.url,
      }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
  };

  // --- Admin/Ingress server ---
  const admin = Fastify({
    logger: loggerConfig,
    genReqId: () => randomUUID(),
  });
  errorHandler(admin);
  await admin.register(fastifyCors);
  await admin.register(fastifyMultipart);
  await admin.register(fastifyRateLimit, { global: false });

  if (!isDev) {
    await admin.register(ingressAuth);
  }

  // API routes
  await admin.register(dashboardRoutes);
  await admin.register(layoutRoutes);
  await admin.register(componentRoutes);
  await admin.register(themeRoutes);
  await admin.register(assetRoutes);
  await admin.register(haProxyRoutes);
  await admin.register(haImageProxyRoutes);
  await admin.register(haHistoryProxyRoutes);
  await admin.register(haStatisticsProxyRoutes);
  await admin.register(previewRoutes);
  await admin.register(popupTriggerRoutes);
  await admin.register(switchLayoutTriggerRoutes);
  await admin.register(settingsRoutes);
  await admin.register(iconRoutes);
  await admin.register(backupRoutes);
  await admin.register(restoreRoutes);
  await admin.register(diagnosticsRoutes);
  await admin.register(clientsRoutes);

  // Shared assets path
  const assetsDir = path.resolve(__dirname, "../../..", process.env.ASSETS_DIR ?? "/config/assets");

  // Serve assets on admin server (for preview background images etc.)
  await admin.register(fastifyStatic, {
    root: assetsDir,
    prefix: "/assets/",
    wildcard: false,
  });

  // Serve admin SPA
  const adminDir = isDev
    ? path.resolve(__dirname, "../../admin/dist")
    : path.resolve(__dirname, "../admin");

  await admin.register(fastifyStatic, {
    root: adminDir,
    prefix: "/",
    decorateReply: false,
    wildcard: false,
  });

  // SPA fallback
  admin.setNotFoundHandler(async (req, reply) => {
    if (req.url.startsWith("/api/")) {
      return reply.code(404).send({ error: "Not found" });
    }
    return reply.sendFile("index.html");
  });

  await admin.listen({ port: INGRESS_PORT, host: "0.0.0.0" });
  console.log(`Admin server listening on port ${INGRESS_PORT}`);

  // --- External display server ---
  const external = Fastify({
    logger: loggerConfig,
    genReqId: () => randomUUID(),
  });
  errorHandler(external);
  await external.register(fastifyCors);
  await external.register(fastifyRateLimit, { global: false });
  await external.register(fastifyWebsocket);

  // WebSocket proxy for display clients
  await setupWebSocketProxy(external);

  // Dashboard login endpoint (rate-limited to prevent brute force)
  external.post<{ Params: { slug: string } }>(
    "/d/:slug/login",
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "1 minute",
        },
      },
    },
    dashboardLogin
  );

  // HA image proxy for display (requires auth via ext_session cookie)
  await external.register((app) => haImageProxyRoutes(app, { isExternal: true }));

  // HA entity proxy for display (entity-scoped, requires auth)
  await external.register(externalHaProxyRoutes);

  // HA history proxy for graph components (entity-scoped, requires auth)
  await external.register((app) => haHistoryProxyRoutes(app, { isExternal: true }));
  await external.register((app) => haStatisticsProxyRoutes(app, { isExternal: true }));

  // Display data API (serves dashboard config to display app)
  await external.register(displayDataRoutes);

  // Icon resolution API (so display doesn't need to bundle @mdi/js)
  await external.register(iconRoutes);

  // MCP server endpoint (registered on external server, injects into admin for API calls)
  await external.register((app) => mcpPlugin(app, admin));

  // Serve display SPA
  const displayDir = isDev
    ? path.resolve(__dirname, "../../display/dist")
    : path.resolve(__dirname, "../display");

  await external.register(fastifyStatic, {
    root: displayDir,
    prefix: "/",
    wildcard: false,
  });

  // Serve assets
  await external.register(fastifyStatic, {
    root: assetsDir,
    prefix: "/assets/",
    decorateReply: false,
  });

  // Display SPA route
  external.get("/d/:slug", async (_req, reply) => {
    return reply.sendFile("index.html", displayDir);
  });
  external.get("/d/:slug/*", async (_req, reply) => {
    return reply.sendFile("index.html", displayDir);
  });

  await external.listen({ port: EXTERNAL_PORT, host: "0.0.0.0" });
  console.log(`External display server listening on port ${EXTERNAL_PORT}`);
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
