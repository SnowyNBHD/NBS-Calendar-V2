# NBS Calendar

Personal brain-dump-to-calendar app. Live at **https://nbscalendar.online**.
See `rough_efficiency-app-plan.md` for the original rough spec — single-user,
no billing, built to run entirely on free tiers.

## Stack

Next.js 16 (App Router) + Supabase (Postgres + Auth) + Google Calendar API +
Canvas ICS feed, deployed on Vercel. A custom MCP server (`/api/mcp`) exposes
the app to Claude as a connector. See the finalized tech spec for the full
architecture.

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier).

   - In the SQL editor, run each file in `supabase/migrations/` in order
     (`0001_init.sql`, then `0002_events_unique.sql`, etc).
   - Go to Project Settings → API and copy the Project URL, `anon` public
     key, and `service_role` key into `.env.local` (copy `.env.example` first).

3. **Create a Google Cloud OAuth client** for Calendar access:

   - In [Google Cloud Console](https://console.cloud.google.com), create a
     project, enable the **Google Calendar API**, and create an OAuth 2.0
     Client ID (Web application type).
   - On the OAuth consent screen, leave publishing status as **Testing** and
     add your own Google account as a test user (this avoids Google's app
     verification process entirely — free, and fine for a single user).
   - Authorized redirect URI: `<your-supabase-project-url>/auth/v1/callback`
     (Supabase shows the exact value in its Google provider settings).
   - In the Supabase dashboard, go to Authentication → Providers → Google,
     enable it, and paste in the Client ID and Client Secret.

4. **Set `ALLOWED_USER_EMAIL`** in `.env.local` to your own Google account
   email — this is the only account allowed to sign in.

5. **Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`** in `.env.local` to
   the same values from step 3 — the app uses these server-side to mint
   fresh Calendar API access tokens for the "Sync calendar" button.

6. **Set `MCP_API_KEY`** in `.env.local` to a long random secret (e.g.
   `openssl rand -base64 32`) — this is what the MCP server (`/api/mcp`)
   requires in an `Authorization: Bearer <secret>` header. It's the same
   value entered as a custom "Additional request header" when adding the
   connector in Claude.ai (with Authentication set to "None" — Claude's UI
   reserves OAuth-driven `Authorization` headers otherwise).

7. **Optionally set `APP_TIMEZONE`** (IANA name, e.g. `America/Phoenix`) —
   defaults to `America/Phoenix` if unset. Used for "today" boundaries and
   all-day-event handling; wrong values will not error, just calculate
   "today" in the wrong zone.

8. **Run the dev server**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000` — you'll be redirected to `/login`. Signing
   in with the allowed Google account also captures a Calendar refresh token
   into the `calendar_sources` table for later use by the sync jobs and MCP
   server.

## Project structure

- `src/app/` — pages and route handlers (App Router)
- `src/app/api/mcp/route.ts` — the MCP server exposed to Claude as a connector
- `src/lib/supabase/` — Supabase client helpers (browser, server, admin/service-role)
- `src/lib/google/`, `src/lib/sync/` — Google Calendar + Canvas ICS integration
- `src/lib/mcp/` — MCP tool definitions and auth
- `src/proxy.ts` — route protection (Next.js 16 renamed `middleware.ts` to `proxy.ts`)
- `supabase/migrations/` — SQL schema, applied manually via the Supabase SQL editor
- `public/manifest.webmanifest`, `public/sw.js` — PWA installability

## ICS feed sync (optional)

Any number of read-only ICS calendar feeds can be synced alongside Google
Calendar — Canvas assignments, a school Google account's secret calendar
export (which can include Google Classroom due dates that auto-populate a
calendar there), Apple Calendar, etc. Add one row per feed in the Supabase
SQL editor:

```sql
insert into calendar_sources (provider, account_label, feed_url)
values ('ics_feed', 'canvas', 'YOUR_CANVAS_ICS_URL');

insert into calendar_sources (provider, account_label, feed_url)
values ('ics_feed', 'school_google', 'YOUR_SCHOOL_GOOGLE_CALENDAR_ICS_URL');
```

`account_label` can be anything descriptive — it becomes the event's
`source` value as `ics_<account_label>` (e.g. `ics_canvas`,
`ics_school_google`), so keep it short and stable once chosen (renaming it
later effectively starts that feed's sync history over, since the sync's
upsert matches on `source` + the feed's own event UID).

## Deployment

Deployed on Vercel (`vercel --prod`), with all `.env.local` values (except
`SUPABASE_PASSWORD`, which the app doesn't use) mirrored into the Vercel
project's production environment variables. `nbscalendar.online`'s DNS
points at Vercel (nameservers `ns1`/`ns2.vercel-dns.com`).

In Supabase, Authentication → URL Configuration must include the deployed
origin(s) (e.g. `https://nbscalendar.online/**`) in the Redirect URLs
allow list, or Google sign-in will fail on the deployed site.

## MCP connector setup (Claude.ai)

1. Settings → Connectors → Add custom connector.
2. URL: `https://nbscalendar.online/api/mcp`
3. Authentication: **None** (frees up the `Authorization` header for manual
   use — otherwise Claude's OAuth flow claims it).
4. Additional request headers: add `Authorization` = `Bearer <MCP_API_KEY>`.
5. Save, then click Connect.

## Projects

Each project has a name, a description, a to-do list and a done list (its own
checklist, separate from tasks) at `/projects`. Claude reads every project
through `get_context` and can create and edit them with the `create_project`,
`update_project`, `add_project_items` and `update_project_item` MCP tools.
Run `supabase/migrations/0005_projects.sql` once in the Supabase SQL editor,
and reconnect the connector in Claude after new tools are deployed.

## Notes

`/notes` holds notes you leave for yourself or for Claude. Notes are shared
with Claude by default; mark one "just me" to hide it from Claude. Claude
reads shared notes and open questions through `get_context`, and can leave
notes (`create_note`), ask you questions (`ask_question`, which also sends a
push) and mark them handled (`resolve_question`). Answer questions on the
Notes page. Run `supabase/migrations/0006_notes.sql` once in the Supabase SQL
editor, and reconnect the connector after deploying.

## Design

"Deep Cockpit" theme: oxblood-on-void palette, VT323 for body text, Quantico
for numerals/time (a deliberate two-face split — see the tokens and
component classes in `src/app/globals.css`). Shared primitives: `Frame`
(the outer double-border chrome), `Panel`/`PanelEmpty` (cut-corner instrument
panels), `Chip` (priority/status tags). Explored via a throwaway prototype
comparing several tech-themed directions before landing here.

## Status

MVP feature-complete and visually themed: auth, task/list/event CRUD, Google
Calendar read+write sync, Canvas ICS sync, brain-dump inbox with triage, PWA
installability, the MCP connector, and the Deep Cockpit design are all live
and verified working end-to-end. Remaining from the original build order:
Phase 2 features (push notifications, photo capture, weekly review, task
breakdown assistant, snooze/defer, recurring routines, completed-item
history).
