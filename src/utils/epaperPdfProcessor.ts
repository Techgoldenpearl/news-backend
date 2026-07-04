import { db } from "../config/db.js";
import { epaperIssues, epaperPages } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { rasterizePdf } from "./pdfRasterizer.js";
import { optimizeImage } from "./imageOptimizer.js";
import { uploadToS3 } from "../config/storage.js";

// Runs fully in-process, fire-and-forget from the upload route. All-or-nothing: if any page
// fails to rasterize/optimize/upload, no pages are persisted and the issue is marked failed —
// simpler and safer than partial-resume for a first version of this pipeline.
export async function processPdfIssue(issueId: number, pdfBuffer: Buffer): Promise<void> {
  try {
    const pageBuffers = await rasterizePdf(pdfBuffer);

    const inserts: { pageNumber: number; imageUrl: string; thumbnailUrl: string }[] = [];

    for (let i = 0; i < pageBuffers.length; i++) {
      const pageNumber = i + 1;
      const optimized = await optimizeImage(pageBuffers[i], "image/png");

      const { url: imageUrl } = await uploadToS3(
        `epaper-pages/${issueId}/${pageNumber}.webp`,
        optimized.original,
        optimized.originalMime
      );
      const { url: thumbnailUrl } = await uploadToS3(
        `epaper-pages/${issueId}/${pageNumber}-thumb.webp`,
        optimized.thumbnail,
        optimized.thumbnailMime
      );

      inserts.push({ pageNumber, imageUrl, thumbnailUrl });
    }

    await db.insert(epaperPages).values(inserts.map((p) => ({ issueId, ...p })));

    await db.update(epaperIssues)
      .set({ processingStatus: "completed", updatedAt: new Date() })
      .where(eq(epaperIssues.id, issueId));
  } catch (err: any) {
    await db.update(epaperIssues)
      .set({
        processingStatus: "failed",
        processingError: err?.message ?? "Unknown error during PDF processing",
        updatedAt: new Date(),
      })
      .where(eq(epaperIssues.id, issueId));
  }
}
