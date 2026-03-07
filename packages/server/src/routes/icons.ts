import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import * as mdiIcons from "@mdi/js";

const iconNamePattern = /^mdi[:\-][a-z0-9-]+$/;

const paramsSchema = z.object({
  names: z
    .string()
    .transform((s) => s.split(","))
    .pipe(
      z.array(z.string().regex(iconNamePattern, "Invalid icon name")).min(1).max(50)
    ),
});

function mdiNameToPath(name: string): string | undefined {
  const stripped = name.replace(/^mdi[:\-]/, "");
  const camelKey =
    "mdi" +
    stripped
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("");
  return (mdiIcons as Record<string, string>)[camelKey];
}

export const iconRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { names: string } }>(
    "/api/icons/:names",
    async (request, reply) => {
      const parsed = paramsSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues });
      }

      const result: Record<string, string> = {};
      for (const name of parsed.data.names) {
        const path = mdiNameToPath(name);
        if (path) {
          result[name] = path;
        }
      }

      reply.header("Cache-Control", "public, max-age=86400");
      return result;
    }
  );
};
