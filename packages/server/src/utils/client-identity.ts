import { execFile } from "node:child_process";
import dns from "node:dns";
import type { FastifyRequest } from "fastify";

/**
 * Utilities for identifying display clients by stable network properties.
 *
 * Primary identifier: MAC address via `ip neigh show <ip>`. Works when the
 * add-on has access to the host's ARP table — i.e. same LAN and, typically,
 * `host_network: true` in config.yaml. In bridge-network mode (default) the
 * container's own ARP cache is used, which usually returns nothing. Falls
 * back to IP-based identity in that case.
 *
 * Secondary enrichment: reverse-DNS hostname. Best-effort, 250ms timeout.
 */

const MAC_RE = /lladdr\s+([0-9a-f]{2}(?::[0-9a-f]{2}){5})/i;
const LOCAL_IPS = new Set(["127.0.0.1", "::1", "localhost"]);

/**
 * Extract a usable client IP from a Fastify request. Strips IPv6-mapped
 * IPv4 prefix (::ffff:) and trusts X-Forwarded-For's first hop when present.
 */
export function extractClientIp(req: FastifyRequest): string | null {
  const xff = req.headers["x-forwarded-for"];
  const xffFirst = Array.isArray(xff) ? xff[0] : xff?.split(",")[0];
  const raw = (xffFirst?.trim() || req.socket.remoteAddress || "").trim();
  if (!raw) return null;
  // Unwrap IPv4-mapped IPv6 (e.g. "::ffff:192.168.1.10")
  return raw.startsWith("::ffff:") ? raw.slice(7) : raw;
}

function execWithTimeout(
  cmd: string,
  args: string[],
  timeoutMs: number
): Promise<string | null> {
  return new Promise((resolve) => {
    const child = execFile(cmd, args, { timeout: timeoutMs }, (err, stdout) => {
      if (err) return resolve(null);
      resolve(stdout);
    });
    // execFile already honours timeout; this guards against hang before spawn.
    const t = setTimeout(() => {
      child.kill();
      resolve(null);
    }, timeoutMs + 50);
    child.on("exit", () => clearTimeout(t));
  });
}

/**
 * Resolve the MAC address for a given IP using the kernel's neighbour table.
 * Returns null if the IP is local/loopback, the command isn't available, the
 * IP is not in the ARP cache, or the lookup times out.
 */
export async function resolveMac(ip: string | null): Promise<string | null> {
  if (!ip || LOCAL_IPS.has(ip)) return null;
  const out = await execWithTimeout("ip", ["neigh", "show", ip], 250);
  if (!out) return null;
  const match = out.match(MAC_RE);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Attempt reverse-DNS resolution of a client IP. Returns null on failure
 * or if it takes longer than the timeout.
 */
export async function reverseDns(ip: string | null): Promise<string | null> {
  if (!ip || LOCAL_IPS.has(ip)) return null;
  try {
    const result = await Promise.race([
      dns.promises.reverse(ip),
      new Promise<string[]>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 250)
      ),
    ]);
    return result?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Compute the stable identity string for a client.
 *   "mac:aa:bb:cc:dd:ee:ff" when MAC is known
 *   "ip:192.168.1.42"        as a fallback
 */
export function computeIdentity(mac: string | null, ip: string | null): string {
  if (mac) return `mac:${mac}`;
  if (ip) return `ip:${ip}`;
  return "ip:unknown";
}
