import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import fastifyCors from "@fastify/cors";
import fastifyWebsocket from "@fastify/websocket";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrations } from "./db/migrate.js";
import { haClient } from "./ws/ha-client.js";
import { connectionManager } from "./ws/manager.js";
import { setupWebSocketProxy } from "./ws/proxy.js";
import { dashboardRoutes } from "./routes/dashboards.js";
import { layoutRoutes } from "./routes/layouts.js";
import { componentRoutes } from "./routes/components.js";
import { themeRoutes } from "./routes/themes.js";
import { assetRoutes } from "./routes/assets.js";
import { haProxyRoutes } from "./routes/ha-proxy.js";
import { previewRoutes } from "./routes/preview.js";
import { settingsRoutes } from "./routes/settings.js";
import { popupTriggerRoutes } from "./routes/popup-trigger.js";
import { displayDataRoutes } from "./routes/display-data.js";
import { ingressAuth } from "./middleware/auth.js";
import { dashboardLogin } from "./middleware/dashboard-auth.js";
import { seedPrebuiltComponents } from "./prebuilt/index.js";
import { errorHandler } from "./middleware/error-handler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INGRESS_PORT = parseInt(process.env.INGRESS_PORT ?? "8080");
const EXTERNAL_PORT = parseInt(process.env.EXTERNAL_PORT ?? "8099");
const isDev = process.env.NODE_ENV === "development";

async function start() {
  // Run database migrations
  runMigrations();

  // Seed prebuilt components
  await seedPrebuiltComponents();

  // Connect to HA WebSocket + forward state changes to display clients
  haClient.setOnStateChanged((entityId, newState) => {
    connectionManager.sendStateUpdate(entityId, newState);
  });
  haClient.connect().catch((err) => {
    console.warn("HA WebSocket initial connection failed:", err.message);
  });

  // --- Admin/Ingress server ---
  const admin = Fastify({ logger: true });
  await admin.register(errorHandler);
  await admin.register(fastifyCors);
  await admin.register(fastifyMultipart);

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
  await admin.register(previewRoutes);
  await admin.register(popupTriggerRoutes);
  await admin.register(settingsRoutes);

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
  const external = Fastify({ logger: true });
  await external.register(errorHandler);
  await external.register(fastifyCors);
  await external.register(fastifyWebsocket);

  // WebSocket proxy for display clients
  await setupWebSocketProxy(external);

  // Dashboard login endpoint
  external.post<{ Params: { slug: string } }>(
    "/d/:slug/login",
    dashboardLogin
  );

  // Display data API (serves dashboard config to display app)
  await external.register(displayDataRoutes);

  // Popup trigger endpoint (for HA rest_command)
  await external.register(popupTriggerRoutes);

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
