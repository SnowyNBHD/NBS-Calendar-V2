# Projects

## Goal

A place to track larger efforts: each project has a name, a description, a
list of things still to do, and a list of things already done. Claude can
read all of it and add to it through the MCP connector.

## Decisions

- A project's items are its own checklist (`project_items`), not links to
  the existing `tasks` table. They do not appear on Tasks, Today, or the
  calendar, and have no due dates or reminders. Anything time-sensitive is
  still made a normal task.
- Items can be logged as already done, so finished work that was never a
  task can be recorded.
- Claude gets read access through `get_context` and write access through
  four new tools. Deleting projects or items stays UI-only.

## Data

Migration `0005_projects.sql`:

- `projects`: `id uuid pk`, `name text not null`,
  `description text not null default ''`, `created_at`, `updated_at`
  (both `timestamptz not null default now()`; `updated_at` is set
  explicitly by the code that edits a project, no trigger).
- `project_items`: `id uuid pk`, `project_id uuid not null` referencing
  `projects(id)` `on delete cascade`, `content text not null`,
  `is_done boolean not null default false`, `done_at timestamptz`,
  `created_at timestamptz not null default now()`; index on `project_id`.
- RLS enabled on both with the same `authenticated full access` policy as
  the other tables. MCP tools write with the service-role client.
- "To do" is items with `is_done = false`, oldest first. "Done" is items
  with `is_done = true`, most recently done first. Marking done sets
  `done_at = now()`; marking not done clears it.

## Pages

New nav link "projects" after "lists". All pages use `Frame`, `Panel`,
`PanelEmpty` and the existing form/button classes, and server actions in
`src/lib/actions/projects.ts` in the same style as `lists.ts` (each action
calls `requireUser()`, then `revalidatePath`).

- `/projects`: an add form (name). Creating a project redirects to its
  page. A panel lists projects, newest first; each row links to the project
  and shows "N to do / M done" and a delete `✕`.
- `/projects/[id]` (404 if it does not exist): a back link to `/projects`; a
  details form with name (required) and description (textarea) and a save
  button; a "to do" panel with an add-item form, each item showing a toggle
  box (marks done), its text, and a delete `✕`; a "done" panel where each
  item shows a checked toggle box (marks not done), its text in faint
  style, the local date it was done (`APP_TIMEZONE`), and a delete `✕`.
  Empty states: "nothing left" and "nothing done yet".

## Claude access

New file `src/lib/mcp/project-tools.ts` exports `registerProjectTools` (called
from `registerTools`) and `fetchProjectsWithItems`, which `get_context`
uses.

- `get_context` gains `projects`: for each project (newest first) its `id`,
  `name`, `description`, `to_do` (`id`, `content`) and `done` (`id`,
  `content`, `done_at`). Everything is returned, uncapped, since the data
  is small and single-user.
- `create_project({ name, description?, items? })`: `name` 1-120 chars,
  `description` up to 10,000, `items` up to 100 strings of 1-500 chars.
- `update_project({ id, name?, description? })`.
- `add_project_items({ project_id, items, done? })`: 1-100 items; `done`
  defaults to false; when true the items are stored already done.
- `update_project_item({ id, content?, is_done? })`.
- Errors use the existing `errorResult` shape. After deploying, the owner
  reconnects the connector so Claude lists the new tools.

## Out of scope

Due dates or reminders on items, reordering, archiving finished projects,
linking items to tasks, and the daily briefing (which will read projects
through `get_context` once that feature is built).

## Verification

There is no test framework beyond `node:test` for pure helpers, and this
feature has none, so verification follows the existing pattern.

- Build and lint clean.
- JSON-RPC checks: `create_project` with items, then `get_context` shows it;
  `add_project_items` with `done: true`; `update_project_item` toggles
  `is_done` and `done_at`; `update_project` changes the fields; rows checked
  in the database.
- Signed-out requests to `/projects` and `/projects/<id>` redirect to
  `/login`.
- The owner confirms the pages on desktop and phone, since the browser tool
  is not available in this session.

## Rollout

1. Owner runs `0005_projects.sql` in the Supabase SQL editor.
2. Deploy with `vercel --prod`.
3. Owner reconnects the NBS Calendar connector.
4. The unbuilt daily-briefing migration is renumbered from `0005_briefings`
   to `0006_briefings` in its spec and plan.
