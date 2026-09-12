"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

async function getOrigin() {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol =
    headersList.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

// Initiating OAuth from a Server Action (rather than client-side JS calling
// the browser SDK) matters on Safari: Safari's cross-site tracking
// prevention purges cookies set via document.cookie right before a redirect
// through a domain it classifies as a tracker (accounts.google.com
// qualifies) — even back to the original site. A Server Action sets the
// PKCE verifier cookie via a real Set-Cookie header instead, which Safari
// treats as a durable first-party cookie. Without this, the Google consent
// flow completes but the final code exchange silently fails because the
// verifier cookie is gone, bouncing back to /login.
export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      // offline + consent forces Google to hand back a refresh token every
      // time, which we need for server-side Calendar API access.
      scopes:
        "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data.url) {
    redirect("/login");
  }

  redirect(data.url);
}
