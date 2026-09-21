# Notes

## Goal

A notes page where the owner leaves details for themselves or for Claude, and
where Claude can leave notes and ask questions back. Claude reads and writes
notes through the MCP connector.

## Decisions

- A note is shared with Claude by default so it can use the details. A note
  can be marked "just me", which hides it from Claude entirely (it is
  excluded from `get_context`).
- Notes are their own thing: no links to tasks, projects or events.
- Claude asks questions with one answer box per question. The owner answers
  in the app; Claude sees the answer on its next `get_context` and marks the
  question resolved. No threads.
- The owner never has to reply to anything: plain notes stand alone.
- Deleting notes stays UI-only. Claude cannot edit the owner's notes.

## Data

Migration `0006_notes.sql`:

- `notes`: `id uuid pk default gen_random_uuid()`;
  `author text not null check (author in ('user','claude'))`;
  `kind text not null default 'note' check (kind in ('note','question'))`;
  `visibility text not null default 'shared' check (visibility in ('shared','private'))`;
  `title text not null default ''`; `body text not null`;
  `answer text`; `answered_at timestamptz`; `resolved_at timestamptz`;
  `created_at`, `updated_at` (`timestamptz not null default now()`;
  `updated_at` is set explicitly by code, no trigger). Index on `created_at`.
- Only Claude creates questions (`author = 'claude'`, `kind = 'question'`);
  the question text lives in `body`.
- A question is *open* when `answer is null and resolved_at is null`,
  *answered* when `answer is not null and resolved_at is null`, and *resolved*
  when `resolved_at is not null`.
- RLS with the same `authenticated full access` policy as the other tables.
  MCP tools write with the service-role client. The `private` filter is
  applied in the MCP read query, not by RLS (single user).
- The daily-briefing migration is renumbered from `0006_briefings` to
  `0007_briefings` in its spec and plan.

## Pages

Nav link "notes" after "projects". When Claude has open questions the link
reads `notes (N)` with the count in the accent colour. Server actions live in
`src/lib/actions/notes.ts` in the style of `projects.ts`.

- `/notes`:
  - A form: optional title, body textarea, a select ("shared with Claude" /
    "just me", default shared), and an Add button.
  - "questions for you" panel (only when any unresolved question exists):
    each shows its title (if any) and text, an answer textarea (pre-filled
    when already answered) and a "Send answer" button, plus a delete. An
    answered but unresolved question shows an "answered" chip.
  - "notes" panel: notes of both authors, newest first. Each row has a chip
    ("you", "claude", or "just me" for private ones), the title or the start
    of the body, and the date in `APP_TIMEZONE`; the row links to the note.
    Empty state "no notes yet".
  - "resolved" panel (only when any exist): resolved questions in faint text
    with the answer, and a delete.
- `/notes/[id]` (404 if missing): back link, a form to edit title and body
  (and visibility for the owner's own notes), and a delete that returns to
  `/notes`. Text is plain, line breaks preserved. The owner may edit any note
  (including Claude's).

## Claude access

New file `src/lib/mcp/note-tools.ts` exporting `registerNoteTools` (called
from `registerTools`) and `fetchNotesForClaude` (used by `get_context`).

- `get_context` gains `notes`: `yours` (shared notes by the owner, newest 200:
  `id`, `title`, `body`, `updated_at`), `from_claude` (Claude's own last 20
  notes, so it does not repeat itself) and `questions` (every unresolved
  question: `id`, `title`, `question`, `answer`, `status` of `open` or
  `answered`). Private notes and resolved questions are never returned.
- `create_note({ title?, body })`: leaves a note (`title` up to 120, `body`
  1-10,000).
- `ask_question({ question, title? })`: `question` 1-2,000. Also sends a push
  ("Claude has a question", body the start of the question, url `/notes`) via
  `sendPushToAll`; the question is saved even if the push fails.
- `resolve_question({ id })`: sets `resolved_at`. Errors if the id is not an
  existing question.
- Errors use the existing `errorResult`. After deploying, the owner reconnects
  the connector.

## Out of scope

Threads, tags, search, pinning, markdown, attachments, linking notes to other
items, and letting Claude edit or delete notes.

## Verification

- Build and lint clean.
- JSON-RPC checks: a shared note and a private note inserted directly, then
  `get_context` shows only the shared one; `create_note`, `ask_question`
  (open status), an answer written to the row, `get_context` shows it as
  `answered`, `resolve_question` removes it; `resolve_question` on a
  non-question id errors.
- Signed-out `/notes` and `/notes/<id>` redirect to `/login`.
- The owner confirms the pages on desktop and phone, including the nav count.

## Rollout

1. Owner runs `0006_notes.sql` in the Supabase SQL editor.
2. Deploy with `vercel --prod`.
3. Owner reconnects the NBS Calendar connector.
4. Renumber the unbuilt briefing migration to `0007_briefings`.
