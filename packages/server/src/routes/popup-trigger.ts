import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { broadcastPopup } from "../ws/popup-broadcast.js";

const POPUP_API_KEY = process.env.POPUP_API_KEY;
const SUPERVISOR_TOKEN = process.env.SUPERVISOR_TOKEN;

const triggerSchema = z.object({
  content: z.object({
    type: z.enum(["text", "image", "video"]),
    body: z.string().optional(),
    mediaUrl: z.string().optional(),
  }),
  timeout: z.number().int().positive().default(10),
  targetDashboardIds: z.array(z.number().int()).default([]),
});

async function popupAuth(req: FastifyRequest, reply: FastifyReply) {
  // Check X-Api-Key header against POPUP_API_KEY
  const apiKey = req.headers["x-api-key"];
  if (POPUP_API_KEY && apiKey === POPUP_API_KEY) return;

  // Fallback: Authorization: Bearer against SUPERVISOR_TOKEN
  const authHeader = req.headers.authorization;
  if (SUPERVISOR_TOKEN && authHeader === `Bearer ${SUPERVISOR_TOKEN}`) return;

  return reply.code(401).send({ error: "Unauthorized — provide X-Api-Key or SUPERVISOR_TOKEN" });
}

export async function popupTriggerRoutes(app: FastifyInstance) {
  app.post("/api/trigger/popup", {
    preHandler: popupAuth,
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 second",
      },
    },
  }, async (req) => {
    const body = triggerSchema.parse(req.body);
    broadcastPopup(body.targetDashboardIds, {
      content: body.content,
      timeout: body.timeout,
    });
    return { success: true };
  });
}
