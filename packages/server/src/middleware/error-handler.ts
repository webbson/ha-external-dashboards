import { FastifyInstance } from "fastify";
import { ZodError } from "zod";

export function errorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: "Validation error",
        details: error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      });
    }

    app.log.error(error);
    return reply.code(500).send({ error: "Internal server error" });
  });
}
