import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { pushSubscriptions } from "../../drizzle/schema.js";
import { ENV } from "../config/env.js";

let configured = false;

export function setupWebPush() {
  if (!ENV.vapidPublicKey || !ENV.vapidPrivateKey) {
    console.warn("[Push] VAPID keys not configured — push notifications disabled");
    return;
  }
  webpush.setVapidDetails(ENV.vapidEmail, ENV.vapidPublicKey, ENV.vapidPrivateKey);
  configured = true;
  console.log("[Push] Web push configured");
}

export async function sendPushToAll(title: string, body: string, url?: string) {
  if (!configured) return;

  const subs = await db.select().from(pushSubscriptions);
  if (subs.length === 0) return;

  const payload = JSON.stringify({
    title,
    body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-96x96.png",
    url: url || "/",
    timestamp: Date.now(),
  });

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dhKey || "", auth: sub.authKey || "" },
        },
        payload
      );
      sent++;
    } catch (err: any) {
      failed++;
      if (err.statusCode === 410 || err.statusCode === 404) {
        await db.delete(pushSubscriptions).where(
          eq(pushSubscriptions.id, sub.id)
        ).catch(() => {});
      }
    }
  }

  console.log(`[Push] Sent: ${sent}, Failed: ${failed}, Total subs: ${subs.length}`);
}

export async function sendBreakingNewsAlert(title: string, slug: string) {
  await sendPushToAll(
    "Breaking News",
    title,
    `/article/${slug}`
  );
}
