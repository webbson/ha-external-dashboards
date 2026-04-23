import { FastifyInstance } from "fastify";

let cachedSupervisorUrl: string | undefined; // undefined = not yet succeeded
let lastSupervisorAttempt = 0;
const SUPERVISOR_RETRY_MS = 30_000;

async function detectSupervisorBaseUrl(): Promise<string | null> {
  const token = process.env.SUPERVISOR_TOKEN;
  if (!token) {
    console.debug("EXTERNAL_BASE_URL: no SUPERVISOR_TOKEN, skipping supervisor detection");
    return null;
  }
  try {
    const res = await fetch("http://supervisor/network/info", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      console.warn(`EXTERNAL_BASE_URL: supervisor /network/info returned ${res.status}`);
      return null;
    }
    const body = (await res.json()) as {
      data?: { interfaces?: Array<{ primary?: boolean; ipv4?: { address?: string[] } }> };
    };
    const ifaces = body.data?.interfaces ?? [];
    const primary = ifaces.find((i) => i.primary) ?? ifaces[0];
    const cidr = primary?.ipv4?.address?.[0];
    if (!cidr) {
      console.warn("EXTERNAL_BASE_URL: supervisor returned no IPv4 address on primary interface");
      return null;
    }
    const ip = cidr.split("/")[0];
    const port = process.env.EXTERNAL_PORT ?? "8099";
    return `http://${ip}:${port}`;
  } catch (err) {
    console.warn("EXTERNAL_BASE_URL: supervisor detection failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/api/settings", async () => {
    const devMode = process.env.NODE_ENV === "development";

    let externalBaseUrl: string | null = process.env.EXTERNAL_BASE_URL?.trim() || null;
    if (!externalBaseUrl) {
      if (!cachedSupervisorUrl && Date.now() - lastSupervisorAttempt > SUPERVISOR_RETRY_MS) {
        lastSupervisorAttempt = Date.now();
        const detected = await detectSupervisorBaseUrl();
        if (detected) cachedSupervisorUrl = detected;
      }
      externalBaseUrl = cachedSupervisorUrl ?? null;
    }

    return {
      externalBaseUrl,
      devMode,
      mcpEnabled: !!process.env.MCP_API_KEY || devMode,
      mcpApiKey: process.env.MCP_API_KEY ?? null,
      hostNetwork: process.env.HOST_NETWORK === "true",
    };
  });
}
