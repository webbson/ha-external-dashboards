import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/connection.js";
import { popups } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { broadcastPopup } from "../ws/popup-broadcast.js";

const triggerSchema = z.object({
  popupId: z.number().int().optional(),
  content: z
    .object({
      type: z.enum(["text", "image", "video"]),
      body: z.string().optional(),
      mediaUrl: z.string().optional(),
    })
    .optional(),
  timeout: z.number().int().positive().default(10),
  targetDashboardIds: z.array(z.number().int()).default([]),
});

export async function popupTriggerRoutes(app: FastifyInstance) {
  // Trigger a popup — can reference an existing popup by ID or provide inline content
  app.post("/api/trigger/popup", async (req, reply) => {
    const body = triggerSchema.parse(req.body);

    if (body.popupId) {
      const [popup] = await db
        .select()
        .from(popups)
        .where(eq(popups.id, body.popupId));

      if (!popup) {
        return reply.code(404).send({ error: "Popup not found" });
      }

      broadcastPopup(
        popup.targetDashboardIds as number[],
        {
          content: popup.content as { type: string; body?: string; mediaUrl?: string },
          timeout: popup.timeout,
        }
      );
    } else if (body.content) {
      broadcastPopup(body.targetDashboardIds, {
        content: body.content,
        timeout: body.timeout,
      });
    } else {
      return reply
        .code(400)
        .send({ error: "Provide popupId or content" });
    }

    return { success: true };
  });
}
