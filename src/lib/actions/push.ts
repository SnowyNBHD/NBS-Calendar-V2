"use server";

import { requireUser } from "@/lib/actions/auth";

type SubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function subscribeToPush(subscription: SubscriptionJSON) {
  const { supabase } = await requireUser();

  await supabase.from("push_subscriptions").upsert(
    { endpoint: subscription.endpoint, keys: subscription.keys },
    { onConflict: "endpoint" },
  );
}

export async function unsubscribeFromPush(endpoint: string) {
  const { supabase } = await requireUser();

  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
