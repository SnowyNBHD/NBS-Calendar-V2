-- Notes: the owner leaves details for themselves or for Claude, and Claude
-- can leave notes and ask questions back. A question is open until answered
-- and resolved once Claude marks it handled. Private notes are hidden from
-- Claude (filtered in the MCP read query).
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  author text not null check (author in ('user', 'claude')),
  kind text not null default 'note' check (kind in ('note', 'question')),
  visibility text not null default 'shared' check (visibility in ('shared', 'private')),
  title text not null default '',
  body text not null,
  answer text,
  answered_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_created_idx on notes (created_at desc);

alter table notes enable row level security;

create policy "authenticated full access" on notes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
