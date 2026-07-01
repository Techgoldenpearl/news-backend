import { db } from "../config/db.js";
import { articles } from "../../drizzle/schema.js";
import { eq, and, lte } from "drizzle-orm";

export function startScheduler() {
  const INTERVAL = 60 * 1000;

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

  publishScheduled();
  setInterval(publishScheduled, INTERVAL);
  console.log("[Scheduler] Started — checking for scheduled articles every 60s");
}
