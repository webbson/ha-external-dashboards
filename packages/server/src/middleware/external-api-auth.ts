import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/connection.js";
import { dashboards } from "../db/schema.js";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/jwt.js";

/**
 * Middleware for external server API routes.
 * Validates ext_session cookie (JWT with {dashboardId, slug}) or
 * Authorization: Bearer <accessKey> fallback.
 * On success, sets req.dashboard on the request.
 */
export async function externalApiAuth(
  req: FastifyRequest,
  reply: FastifyReply
) {
  // Try ext_session cookie first
  const cookieToken = req.headers.cookie
    ?.split(";")
    .find((c) => c.trim().startsWith("ext_session="))
    ?.trim()
    .slice("ext_session=".length);

  if (cookieToken) {
    try {
      const payload = jwt.verify(cookieToken, JWT_SECRET) as {
        dashboardId: number;
        slug: string;
      };
      const [dashboard] = await db
        .select()
        .from(dashboards)
        .where(eq(dashboards.id, payload.dashboardId));
      if (dashboard) {
        (req as unknown as Record<string, unknown>).dashboard = dashboard;
        // Attach dashboard context to log scope so downstream handlers inherit it.
        (req as unknown as { log: typeof req.log }).log = req.log.child({
          dashboardId: dashboard.id,
          dashboardSlug: dashboard.slug,
        });
        return;
      }
    } catch (err) {
      req.log.warn({ err, source: "ext_session" }, "JWT verify failed");
    }
  }

  // Fallback: Authorization: Bearer <accessKey>
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const accessKey = authHeader.slice(7);
    const [dashboard] = await db
      .select()
      .from(dashboards)
      .where(eq(dashboards.accessKey, accessKey));
    if (dashboard) {
      (req as unknown as Record<string, unknown>).dashboard = dashboard;
      (req as unknown as { log: typeof req.log }).log = req.log.child({
        dashboardId: dashboard.id,
        dashboardSlug: dashboard.slug,
      });
      return;
    }
  }

  return reply.code(401).send({ error: "Unauthorized" });
}
