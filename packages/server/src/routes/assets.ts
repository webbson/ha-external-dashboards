import { FastifyInstance } from "fastify";
import "@fastify/multipart";
import { db } from "../db/connection.js";
import { assets } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
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
  app.get("/api/assets", async (req) => {
    const folder = (req.query as Record<string, string>).folder;
    if (folder !== undefined) {
      return db.select().from(assets).where(folder === "" ? sql`${assets.folder} IS NULL` : eq(assets.folder, folder));
    }
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

      const filePath = path.resolve(ASSETS_DIR, row.fileName);
      if (!filePath.startsWith(path.resolve(ASSETS_DIR) + path.sep)) {
        return reply.code(403).send({ error: "Forbidden" });
      }
      if (!fs.existsSync(filePath)) {
        return reply.code(404).send({ error: "File not found" });
      }

      reply.header("Content-Type", row.mimeType);
      reply.header("Cache-Control", "public, max-age=3600");
      return reply.send(fs.createReadStream(filePath));
    }
  );

  app.get("/api/assets/folders", async () => {
    const rows = await db
      .selectDistinct({ folder: assets.folder })
      .from(assets)
      .where(sql`${assets.folder} IS NOT NULL`);
    return rows.map((r) => r.folder).sort();
  });

  app.post("/api/assets/upload", async (req, reply) => {
    ensureAssetsDir();
    const data = await req.file();
    if (!data) return reply.code(400).send({ error: "No file uploaded" });

    const buffer = await data.toBuffer();
    const safeName = path.basename(data.filename).replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${Date.now()}-${safeName}`;
    const folder = data.fields?.folder
      ? (data.fields.folder as { value: string }).value || null
      : null;
    const filePath = path.join(ASSETS_DIR, fileName);
    fs.writeFileSync(filePath, buffer);

    const [row] = await db
      .insert(assets)
      .values({
        name: data.filename,
        fileName,
        mimeType: data.mimetype,
        fileSize: buffer.length,
        folder,
      })
      .returning();

    return reply.code(201).send(row);
  });

  app.put<{ Params: { id: string } }>(
    "/api/assets/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const body = z.object({ folder: z.string().nullable() }).parse(req.body);
      const [row] = await db
        .update(assets)
        .set({ folder: body.folder })
        .where(eq(assets.id, id))
        .returning();
      if (!row) return reply.code(404).send({ error: "Not found" });
      return row;
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/api/assets/:id",
    async (req, reply) => {
      const id = parseInt(req.params.id);
      const [row] = await db
        .delete(assets)
        .where(eq(assets.id, id))
        .returning();
      if (!row) return reply.code(404).send({ error: "Not found" });

      const filePath = path.resolve(ASSETS_DIR, row.fileName);
      if (filePath.startsWith(path.resolve(ASSETS_DIR) + path.sep) && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return { success: true };
    }
  );
}
