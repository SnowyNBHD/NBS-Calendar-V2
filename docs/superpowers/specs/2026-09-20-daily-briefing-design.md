# Daily briefing publishing

## Goal

A scheduled Claude Desktop task builds a daily HTML briefing (schedule,
priorities, prep steps, email and news highlights). It needs to reach the
owner's phone, which cannot open a file on the desktop. The app stores the
briefing, notifies the owner's devices, and displays it at `/briefing`.

## Decisions

- The briefing lives in the app (Supabase), not on the desktop.
- One briefing per local date; publishing again the same day replaces it.
- The agent publishes through a new MCP tool, using the existing connector
  and its existing bearer auth. No new env vars.
- The HTML is untrusted (the agent builds it after reading email and web
  content), so it must never execute in the app's origin.

## Data

Migration `0007_briefings.sql`:

- `briefings`: `id uuid pk`, `briefing_date date not null unique`,
  `title text not null`, `summary text`, `html text not null`,
  `published_at timestamptz not null default now()`.
- RLS enabled with the same `authenticated full access` policy as the other
  tables. The MCP tool writes with the service-role client.
- `briefing_date` is the local date in `APP_TIMEZONE` (`todayKey()`).

## MCP tool

`publish_briefing({ html, summary?, title? })` in `src/lib/mcp/tools.ts`:

- `html`: required, max 500,000 characters. `summary`: max 200. `title`:
  max 80, defaults to "Daily briefing".
- Upserts the row for today's date, then calls `sendPushToAll` with
  `title`, body `summary` (default "Your briefing is ready"), url
  `/briefing`.
- The briefing is saved even if the push fails. The result text reports the
  date and how many devices were notified. Errors use the existing
  `errorResult` shape.

## Viewing

- `src/app/briefing/page.tsx` shows the latest briefing.
  `src/app/briefing/[date]/page.tsx` shows a specific date (404 unless the
  param is `YYYY-MM-DD` and a row exists). Both use `Frame wide`, a header
  with title and date, the briefing in an iframe, and a list of the last 14
  briefing dates as links. Empty state: "No briefing yet".
- The iframe is `src="/briefing/raw/<date>"` with
  `sandbox="allow-popups allow-popups-to-escape-sandbox"` (no scripts, no
  same-origin), fixed height (about 75vh, minimum 480px) with internal
  scrolling.
- `src/app/briefing/raw/[date]/route.ts` (GET) reads the row with the
  cookie-bound server client (RLS enforces the session) and returns the
  HTML with:
  - `Content-Security-Policy: sandbox allow-popups
    allow-popups-to-escape-sandbox; default-src 'none'; style-src
    'unsafe-inline' https://fonts.googleapis.com; font-src
    https://fonts.gstatic.com; img-src data:`
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
    `Cache-Control: private, no-store`.
  - A viewport meta tag and `<base target="_blank">` injected after `<head>`
    (prepended if there is no `<head>`), so phone layout and outbound links
    work even if the agent omits them.
- Remote images are blocked on purpose; the briefing should be text and CSS.
- `proxy.ts` already gates every path outside `/api` and static assets, so
  `/briefing/**` requires the owner's session. The route also fails closed
  through RLS.
- Nav gets a "briefing" link. The existing service worker's
  `notificationclick` handler already opens the pushed url.

## Security notes

Threat: injected content in email or news steers the agent into emitting
hostile HTML. Layers: CSP `sandbox` header on the framed document,
`sandbox` attribute on the iframe, `default-src 'none'`, the tool's size
cap, and the existing MCP bearer secret. Residual risk: misleading text or
links inside the briefing. It cannot run code or reach the session.

## Out of scope

Retention or cleanup, editing, multiple briefings per day, and including
projects in `get_context` (planned with the projects feature, which follows
this one).

## Verification

There is no test framework in this project; verification follows the
existing pattern of build, lint, and direct checks.

- Build and lint clean.
- JSON-RPC `tools/call` for `publish_briefing`: row appears with the right
  date, replaces on a second call, push count is reported.
- Header injection helper checked as a pure function with sample HTML (with
  and without `<head>`).
- Unauthenticated request to `/briefing` and `/briefing/raw/<date>` redirects
  to `/login`.
- The owner confirms the look on desktop and the iPhone PWA, since the
  sandboxed iframe rendering and notification tap cannot be driven from
  here.

## Rollout

1. Owner runs `0007_briefings.sql` in the Supabase SQL editor.
2. Deploy with `vercel --prod`.
3. Owner reconnects the NBS Calendar connector if Claude Desktop does not
   see the new tool.
4. Owner updates the scheduled prompt: replace "save to [FOLDER]" with
   "call `publish_briefing` with the HTML and a one-line summary"; keep the
   read-only rule with that tool as the single exception.
