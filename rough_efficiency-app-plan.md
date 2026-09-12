# Personal Efficiency App — Project Spec

## Goal

A personal web app (PWA) for managing tasks, lists, and calendar events in one place, with the ability to talk to Claude (via a custom MCP connector, using an existing Claude Pro subscription) to organize brain-dumped input — typed, voice, or even a photo of handwritten notes — directly into the app's live data. No Anthropic API key required; Claude.ai's own connector system handles auth and billing.

Single user (me). No need to build multi-tenant auth, teams, sharing, etc. Optimize for low friction and fast capture over polish.

---

## Stack

- **Frontend:** Next.js (or similar React framework), deployed as an installable PWA on an existing domain
- **Backend/DB/Auth:** Supabase (Postgres + Google OAuth)
- **Calendar sync:** Google Calendar API only for MVP (personal + student calendars — likely two separate OAuth connections if they're different Google accounts)
- **Claude integration:** A custom remote MCP server (Node or Python), registered as a custom connector in Claude.ai. No embedded chat UI needed for MVP — voice/text input happens in the Claude app itself.
- **Push notifications:** Phase 2. Web Push API + service worker + VAPID keys (`web-push` npm lib), subscriptions stored in Supabase, delivery triggered by a scheduled Supabase Edge Function. Works natively on desktop/Android Chrome; on iPhone requires the PWA to be added to the home screen (iOS 16.4+).
- **Theme:** dark, techy/HUD aesthetic — monospace-leaning type, subtle glow accents on interactive elements

---

## Data model (Supabase / Postgres)

Rough starting schema — adjust as needed during build:

- `tasks` — id, title, notes, status (active/done/deferred), priority, due_date, estimated_minutes, list_id (nullable), event_id (nullable, for tasks attached to an event), created_at, completed_at
- `lists` — id, name, type (freeform, checklist, etc.), event_id (nullable, for lists attached to a specific event)
- `list_items` — id, list_id, content, is_checked, sort_order
- `events` — id, title, start_time, end_time, location, source (google_personal / google_student / manual), external_id (Google's event id), synced_at
- `calendar_sources` — id, provider, account_label, oauth_refresh_token (encrypted), calendar_id, last_synced_at
- `brain_dump_inbox` — id, raw_content (text/transcript), source (voice/photo/typed), status (unprocessed/triaged), created_at — a holding pen for anything captured before it's sorted into tasks/lists/events
- `push_subscriptions` (phase 2) — id, endpoint, keys, created_at

---

## MCP server — tools to expose

This is the core of the "talk to Claude, it updates my app" feature. Build a remote MCP server with tools roughly like:

- `get_context` — returns current tasks, upcoming events, and active lists, so Claude has full situational awareness when asked to "organize everything" or "what's on my plate"
- `create_task` — title, notes, due_date, priority, list_id/event_id (optional)
- `update_task` — id, fields to change (status, due date, etc.)
- `create_event` — title, start/end time, location, source calendar — should call the Google Calendar API, not just write locally, so it actually appears on the real calendar
- `create_list` / `add_list_item`
- `log_brain_dump` — takes raw unstructured text/transcript and stores it in `brain_dump_inbox`; Claude can then reason over it in the same turn and call the other tools to actually sort it, or leave it queued for later review

Auth: since this is a single-user server, keep the OAuth side as simple as the MCP spec allows (the Claude connector docs cover the discovery/auth flow — Claude Code can pull the current spec from docs.claude.com when you get to this step, since exact implementation details evolve).

---

## Feature list

**MVP**
- Google Calendar sync (read + write) for both accounts
- Tasks with priority, due date, optional time estimate
- Lists, attachable to either a task or an event
- Brain dump inbox for quick unsorted capture
- MCP connector live and working — talk to Claude, have it create/update tasks and events
- "Today" view — minimal, shows only what's relevant now
- Basic dark/techy theme

**Phase 2**
- Push notifications (web push, iOS via installed PWA)
- Photo capture of handwritten notebook pages → Claude reads and sorts via the connector
- Claude-generated weekly review (what got done, what keeps slipping, replan suggestions)
- Task breakdown assistant (hand Claude a vague big task, get subtasks back)
- Snooze/defer on tasks
- Recurring routines/templates
- Completed-item history

**Later / optional**
- Apple Calendar via ICS feed URL (read-only) if it ever becomes worth adding
- Embedded in-app voice/chat UI instead of relying solely on the Claude app

---

## Suggested build order

1. Supabase project + schema + Google OAuth login
2. Basic CRUD UI for tasks/lists (no calendar yet) — get the core app usable standalone
3. Google Calendar read sync (pull events in, display them)
4. Google Calendar write (create/update events from the app)
5. Deploy as PWA on the existing domain
6. Build the MCP server exposing the tools above, backed by the same Supabase project
7. Register it as a custom connector in Claude.ai, test end-to-end voice → organized data
8. Theme pass
9. Phase 2 features as desired
