import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/connection.js";
import { dashboards } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/jwt.js";

export async function dashboardAuth(
  req: FastifyRequest<{ Params: { slug: string } }>,
  reply: FastifyReply
) {
  const { slug } = req.params;
  const [dashboard] = await db
    .select()
    .from(dashboards)
    .where(eq(dashboards.slug, slug));

  if (!dashboard) {
    return reply.code(404).send({ error: "Dashboard not found" });
  }

  if (dashboard.accessMode === "public") {
    (req as unknown as Record<string, unknown>).dashboard = dashboard;
    return;
  }

  if (dashboard.accessMode === "header") {
    const headerVal = req.headers[dashboard.headerName?.toLowerCase() ?? ""];
    if (headerVal !== dashboard.headerValue) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    (req as unknown as Record<string, unknown>).dashboard = dashboard;
    return;
  }

  if (dashboard.accessMode === "password") {
    // Check for JWT token in cookie or Authorization header
    const token =
      req.headers.authorization?.replace("Bearer ", "") ??
      (req.headers.cookie
        ?.split(";")
        .find((c) => c.trim().startsWith("dash_token="))
        ?.split("=")[1] ?? "");

    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET) as {
          dashboardId: number;
        };
        if (payload.dashboardId === dashboard.id) {
          (req as unknown as Record<string, unknown>).dashboard = dashboard;
          return;
        }
      } catch {
        // Invalid token, fall through to 401
      }
    }
    return reply.code(401).send({ error: "Authentication required" });
  }
}

export async function dashboardLogin(
  req: FastifyRequest<{ Params: { slug: string } }>,
  reply: FastifyReply
) {
  const { slug } = req.params;
  const { password } = z.object({ password: z.string().min(1) }).parse(req.body);

  const [dashboard] = await db
    .select()
    .from(dashboards)
    .where(eq(dashboards.slug, slug));

  if (!dashboard || dashboard.accessMode !== "password") {
    return reply.code(404).send({ error: "Not found" });
  }

  if (!dashboard.passwordHash) {
    return reply.code(500).send({ error: "No password configured" });
  }

  const valid = await bcrypt.compare(password, dashboard.passwordHash);
  if (!valid) {
    return reply.code(401).send({ error: "Invalid password" });
  }

  const token = jwt.sign({ dashboardId: dashboard.id }, JWT_SECRET, {
    expiresIn: "30d",
  });

  reply
    .header(
      "Set-Cookie",
      `dash_token=${token}; Path=/d/${slug}; HttpOnly; SameSite=Strict; Max-Age=${30 * 86400}`
    )
    .send({ token });
}
