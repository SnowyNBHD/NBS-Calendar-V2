import { createClient } from "@/lib/supabase/server";
import { BRIEFING_CSP, isBriefingDate, prepareBriefingHtml } from "@/lib/briefing/prepare";

// Serves the stored briefing HTML as its own document, only ever loaded inside
// the sandboxed iframe on /briefing. RLS through the cookie-bound client keeps
// it behind the owner's session even if the proxy matcher changes.
export async function GET(_request: Request, ctx: RouteContext<"/briefing/raw/[date]">) {
  const { date } = await ctx.params;
  if (!isBriefingDate(date)) return new Response("Not found", { status: 404 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("briefings")
    .select("html")
    .eq("briefing_date", date)
    .maybeSingle();

  if (!data) return new Response("Not found", { status: 404 });

  return new Response(prepareBriefingHtml(data.html), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": BRIEFING_CSP,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "private, no-store",
    },
  });
}
