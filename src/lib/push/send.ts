import webpush, { WebPushError } from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

// Sends to every subscribed device (single user, but possibly several: e.g.
// the iPhone PWA and a desktop browser). A subscription that's gone stale
// (the browser unsubscribed, or the endpoint expired — surfaced as 404/410)
// gets deleted rather than retried forever.
export async function sendPushToAll(payload: PushPayload) {
  const admin = createAdminClient();

  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, keys");

  let sent = 0;

  for (const sub of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys as { p256dh: string; auth: string } },
        JSON.stringify(payload),
      );
      sent++;
    } catch (error) {
      if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
        await admin.from("push_subscriptions").delete().eq("id", sub.id);
      } else {
        console.error("push send failed:", error);
      }
    }
  }

  return sent;
}
