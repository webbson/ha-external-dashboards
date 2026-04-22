import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

/**
 * Per HA's ingress spec
 * (https://developers.home-assistant.io/docs/apps/presentation#ingress),
 * the admin server must only accept connections from the Supervisor's
 * ingress proxy. Supervisor connects from the Docker bridge gateway
 * (172.30.32.2 by default) and sets an X-Ingress-Path header on every
 * proxied request. We enforce both so that a misconfigured port mapping
 * or a co-resident container on the same bridge can't reach /api/.
 *
 * 127.0.0.1 is allowed so local healthchecks and the bundled healthcheck
 * command still work.
 */
const ALLOWED_INGRESS_IPS = new Set<string>([
  "172.30.32.2", // HA Supervisor ingress source (default Docker bridge gateway)
  "127.0.0.1",
  "::1",
]);

function unwrapMappedIpv4(ip: string): string {
  return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

export async function ingressAuth(app: FastifyInstance) {
  app.addHook(
    "onRequest",
    async (req: FastifyRequest, reply: FastifyReply) => {
      if (process.env.NODE_ENV === "development") return;

      // Belt: source-IP allowlist.
      const raw = req.socket.remoteAddress ?? "";
      const ip = unwrapMappedIpv4(raw);
      if (ip && !ALLOWED_INGRESS_IPS.has(ip)) {
        req.log.warn(
          { ip, url: req.url },
          "Rejecting non-ingress request to admin server"
        );
        return reply
          .code(403)
          .send({ error: "Forbidden: admin server is ingress-only" });
      }

      // Braces: Supervisor always sets X-Ingress-Path on ingress requests.
      // Healthchecks from 127.0.0.1 are exempt since they don't go through
      // the ingress proxy.
      if (ip === "127.0.0.1" || ip === "::1") return;
      const ingressPath = req.headers["x-ingress-path"];
      if (!ingressPath) {
        return reply.code(401).send({ error: "Unauthorized: not via ingress" });
      }
    }
  );
}
