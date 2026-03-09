import { FastifyInstance } from "fastify";
import { z } from "zod";
import { broadcastPopup } from "../ws/popup-broadcast.js";

const triggerSchema = z.object({
  content: z.object({
    type: z.enum(["text", "image", "video"]),
    body: z.string().optional(),
    mediaUrl: z.string().optional(),
  }),
  timeout: z.number().int().positive().default(10),
  targetDashboardIds: z.array(z.number().int()).default([]),
});

export async function popupTriggerRoutes(app: FastifyInstance) {
  app.post("/api/trigger/popup", {
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
