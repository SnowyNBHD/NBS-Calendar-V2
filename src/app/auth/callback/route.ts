import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const allowedEmail = process.env.ALLOWED_USER_EMAIL;
  if (allowedEmail && data.user.email !== allowedEmail) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/access-denied`);
  }

  // Stash the personal Google account's Calendar tokens for server-side use
  // (the MCP server and calendar sync jobs use the service-role client, not
  // the browser session, to read/write Google Calendar).
  const refreshToken = data.session?.provider_refresh_token;
  if (refreshToken) {
    const admin = createAdminClient();
    await admin.from("calendar_sources").upsert(
      {
        provider: "google_oauth",
        account_label: "personal",
        oauth_refresh_token: refreshToken,
      },
      { onConflict: "provider,account_label" },
    );
  }

  return NextResponse.redirect(`${origin}/today`);
}
