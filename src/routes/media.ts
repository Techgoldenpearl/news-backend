import { Router, Request, Response } from "express";
import { db } from "../config/db.js";
import { articleMedia } from "../../drizzle/schema.js";
import { desc, eq, count } from "drizzle-orm";
import { requireAuth, requireEditor } from "../middleware/auth.js";
import { uploadToS3, deleteFromS3 } from "../config/storage.js";
import { parsePagination } from "../utils/helpers.js";
import { mediaUploadSchema } from "../validations/index.js";
import { validateBody } from "../middleware/validate.js";
import { optimizeImage } from "../utils/imageOptimizer.js";

const MAX_BASE64_SIZE = 15_000_000;

const router = Router();

// GET /api/media — list all media
router.get("/", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const [items, [total]] = await Promise.all([
      db.select().from(articleMedia).orderBy(desc(articleMedia.createdAt)).limit(limit).offset(offset),
      db.select({ c: count() }).from(articleMedia),
    ]);
    res.json({ items, total: Number(total?.c ?? 0) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch media" });
  }
});

// POST /api/media/upload — upload image via base64, auto-optimizes to WebP + generates thumbnail
router.post("/upload", requireAuth, requireEditor, validateBody(mediaUploadSchema), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { base64, fileName, mimeType } = req.body;

    if (base64.length > MAX_BASE64_SIZE) {
      return res.status(400).json({ error: "File too large (max 11MB)" });
    }

    const rawBuffer = Buffer.from(base64, "base64");
    const ts = Date.now();
    const id = Math.random().toString(36).slice(2);

    let optimized;
    try {
      optimized = await optimizeImage(rawBuffer, mimeType);
    } catch {
      optimized = null;
    }

    const mainBuffer = optimized?.original ?? rawBuffer;
    const mainMime = optimized?.originalMime ?? mimeType;
    const mainExt = optimized ? "webp" : (mimeType === "image/png" ? "png" : mimeType === "image/gif" ? "gif" : "jpg");

    const mainKey = `${ts}-${id}.${mainExt}`;
    const { url } = await uploadToS3(mainKey, mainBuffer, mainMime);

    let thumbnailUrl: string | null = null;
    if (optimized) {
      const thumbKey = `${ts}-${id}-thumb.webp`;
      const thumbResult = await uploadToS3(thumbKey, optimized.thumbnail, optimized.thumbnailMime);
      thumbnailUrl = thumbResult.url;
    }

    const [media] = await db
      .insert(articleMedia)
      .values({
        url,
        fileKey: mainKey,
        fileName: fileName || mainKey,
        mimeType: mainMime,
        fileSize: mainBuffer.length,
        mediaType: "image",
        uploadedBy: user.id,
      })
      .returning();

    res.status(201).json({ ...media, thumbnailUrl });
  } catch (err) {
    console.error("[Media] Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// DELETE /api/media/:id
router.delete("/:id", requireAuth, requireEditor, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [media] = await db.select().from(articleMedia).where(eq(articleMedia.id, id)).limit(1);
    if (!media) return res.status(404).json({ error: "Media not found" });

    if (media.fileKey) {
      await deleteFromS3(media.fileKey).catch(() => {});
      const thumbKey = media.fileKey.replace(/\.\w+$/, "-thumb.webp");
      await deleteFromS3(thumbKey).catch(() => {});
    }

    await db.delete(articleMedia).where(eq(articleMedia.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete media" });
  }
});

export default router;
