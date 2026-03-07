import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export async function ingressAuth(app: FastifyInstance) {
  app.addHook(
    "onRequest",
    async (req: FastifyRequest, reply: FastifyReply) => {
      // In HA ingress mode, the Supervisor handles auth via the ingress token.
      // The X-Ingress-Path header is set by the Supervisor proxy.
      // In development, skip auth check.
      if (process.env.NODE_ENV === "development") return;

      const ingressPath = req.headers["x-ingress-path"];
      if (!ingressPath) {
        return reply.code(401).send({ error: "Unauthorized: not via ingress" });
      }
    }
  );
}
