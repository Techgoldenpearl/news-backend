import { db } from "../config/db.js";
import { articles, epaperIssues } from "../../drizzle/schema.js";
import { eq, and, lte } from "drizzle-orm";
import { refreshUtilityData } from "./utilityDataFetcher.js";

export function startScheduler() {
  const INTERVAL = 60 * 1000;
  const UTILITY_DATA_INTERVAL = 15 * 60 * 1000;

  async function publishScheduled() {
    try {
      const now = new Date();
      const result = await db
        .update(articles)
        .set({ status: "published", publishedAt: now, updatedAt: now })
        .where(
          and(
            eq(articles.status, "scheduled"),
            lte(articles.scheduledAt, now)
          )
        )
        .returning({ id: articles.id, title: articles.title });

      if (result.length > 0) {
        console.log(`[Scheduler] Published ${result.length} scheduled article(s):`, result.map((a) => a.title).join(", "));
      }
    } catch (err) {
      console.error("[Scheduler] Error publishing scheduled articles:", err);
    }
  }

  async function cleanupStuckEpaperProcessing() {
    try {
      const cutoff = new Date(Date.now() - 10 * 60 * 1000);
      const result = await db
        .update(epaperIssues)
        .set({
          processingStatus: "failed",
          processingError: "Processing timed out or was interrupted",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(epaperIssues.processingStatus, "processing"),
            lte(epaperIssues.updatedAt, cutoff)
          )
        )
        .returning({ id: epaperIssues.id });

      if (result.length > 0) {
        console.log(`[Scheduler] Marked ${result.length} stuck e-paper processing job(s) as failed:`, result.map((r) => r.id).join(", "));
      }
    } catch (err) {
      console.error("[Scheduler] Error cleaning up stuck e-paper processing jobs:", err);
    }
  }

  publishScheduled();
  cleanupStuckEpaperProcessing();
  refreshUtilityData();
  setInterval(publishScheduled, INTERVAL);
  setInterval(cleanupStuckEpaperProcessing, INTERVAL);
  setInterval(refreshUtilityData, UTILITY_DATA_INTERVAL);
  console.log("[Scheduler] Started — checking for scheduled articles every 60s, refreshing utility data every 15m");
}
