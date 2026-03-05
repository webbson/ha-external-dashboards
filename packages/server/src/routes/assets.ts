import { FastifyInstance } from "fastify";
import "@fastify/multipart";
import { db } from "../db/connection.js";
import { assets } from "../db/schema.js";
import { eq } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(__dirname, "../../../..", process.env.ASSETS_DIR ?? "/config/assets");

function ensureAssetsDir() {
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }
}

export async function assetRoutes(app: FastifyInstance) {
  app.get("/api/assets", async () => {
    return db.select().from(assets);
  });

  app.get<{ Params: { id: string } }>(
    "/api/assets/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [row] = await db
        .select()
        .from(assets)
        .where(eq(assets.id, id));
      if (!row) return reply.code(404).send({ error: "Not found" });
      return row;
    }
  );

  // Serve asset file by ID (for admin preview)
  app.get<{ Params: { id: string } }>(
    "/api/assets/:id/file",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [row] = await db
        .select()
        .from(assets)
        .where(eq(assets.id, id));
      if (!row) return reply.code(404).send({ error: "Not found" });

      const filePath = path.join(ASSETS_DIR, row.fileName);
      if (!fs.existsSync(filePath)) {
        return reply.code(404).send({ error: "File not found" });
      }

      reply.header("Content-Type", row.mimeType);
      reply.header("Cache-Control", "public, max-age=3600");
      return reply.send(fs.createReadStream(filePath));
    }
  );

  app.post("/api/assets/upload", async (req, reply) => {
    ensureAssetsDir();
    const data = await req.file();
    if (!data) return reply.code(400).send({ error: "No file uploaded" });

    const buffer = await data.toBuffer();
    const fileName = `${Date.now()}-${data.filename}`;
    const filePath = path.join(ASSETS_DIR, fileName);
    fs.writeFileSync(filePath, buffer);

    const [row] = await db
      .insert(assets)
      .values({
        name: data.filename,
        fileName,
        mimeType: data.mimetype,
        fileSize: buffer.length,
      })
      .returning();

    return reply.code(201).send(row);
  });

  app.delete<{ Params: { id: string } }>(
    "/api/assets/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [row] = await db
        .delete(assets)
        .where(eq(assets.id, id))
        .returning();
      if (!row) return reply.code(404).send({ error: "Not found" });

      const filePath = path.join(ASSETS_DIR, row.fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return { success: true };
    }
  );
}
