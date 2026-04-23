import { FastifyInstance } from "fastify";

let cachedSupervisorUrl: string | null | undefined; // undefined = not yet attempted

async function detectSupervisorBaseUrl(): Promise<string | null> {
  const token = process.env.SUPERVISOR_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch("http://supervisor/network/info", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: { interfaces?: Array<{ primary?: boolean; ipv4?: { address?: string[] } }> };
    };
    const ifaces = body.data?.interfaces ?? [];
    const primary = ifaces.find((i) => i.primary) ?? ifaces[0];
    const cidr = primary?.ipv4?.address?.[0];
    if (!cidr) return null;
    const ip = cidr.split("/")[0];
    const port = process.env.EXTERNAL_PORT ?? "8099";
    return `http://${ip}:${port}`;
  } catch {
    return null;
  }
}

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/api/settings", async () => {
    const devMode = process.env.NODE_ENV === "development";

    let externalBaseUrl: string | null = process.env.EXTERNAL_BASE_URL?.trim() || null;
    if (!externalBaseUrl) {
      if (cachedSupervisorUrl === undefined) {
        cachedSupervisorUrl = await detectSupervisorBaseUrl();
      }
      externalBaseUrl = cachedSupervisorUrl;
    }

    return {
      externalBaseUrl,
      devMode,
      mcpEnabled: !!process.env.MCP_API_KEY || devMode,
      mcpApiKey: process.env.MCP_API_KEY ?? null,
    };
  });
}
