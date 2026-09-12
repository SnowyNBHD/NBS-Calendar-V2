-- NBS Calendar — initial schema
-- Single-user app: no multi-tenant user_id columns. Access is gated at the
-- application layer (proxy.ts + auth callback check ALLOWED_USER_EMAIL),
-- and RLS below just ensures only an authenticated session can read/write.

create table if not exists lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'freeform', -- 'freeform' | 'checklist'
  event_id uuid, -- set below via alter, once events exists
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz,
  location text,
  source text not null, -- 'google_personal' | 'canvas_ics' | 'manual'
  external_id text, -- Google event id, or ICS UID
  synced_at timestamptz,
  created_at timestamptz not null default now()
);

alter table lists
  add constraint lists_event_id_fkey
  foreign key (event_id) references events(id) on delete set null;

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  status text not null default 'active', -- 'active' | 'done' | 'deferred'
  priority text, -- 'low' | 'medium' | 'high'
  due_date timestamptz,
  estimated_minutes integer,
  list_id uuid references lists(id) on delete set null,
  event_id uuid references events(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references lists(id) on delete cascade,
  content text not null,
  is_checked boolean not null default false,
  sort_order integer not null default 0
);

create table if not exists calendar_sources (
  id uuid primary key default gen_random_uuid(),
  provider text not null, -- 'google_oauth' | 'ics_feed'
  account_label text not null, -- e.g. 'personal', 'canvas'
  oauth_refresh_token text, -- server-only access via RLS below; null for ics_feed
  feed_url text, -- server-only access via RLS below; null for google_oauth
  calendar_id text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, account_label)
);

create table if not exists brain_dump_inbox (
  id uuid primary key default gen_random_uuid(),
  raw_content text not null,
  source text not null, -- 'voice' | 'photo' | 'typed'
  status text not null default 'unprocessed', -- 'unprocessed' | 'triaged'
  created_at timestamptz not null default now()
);

-- Phase 2
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

-- Row Level Security: only an authenticated session may read/write.
-- The app only ever lets one email authenticate (enforced in proxy.ts and
-- the /auth/callback route), so "authenticated" is an adequate gate here.
alter table tasks enable row level security;
alter table lists enable row level security;
alter table list_items enable row level security;
alter table events enable row level security;
alter table calendar_sources enable row level security;
alter table brain_dump_inbox enable row level security;
alter table push_subscriptions enable row level security;

create policy "authenticated full access" on tasks
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on lists
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on list_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on events
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on brain_dump_inbox
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on push_subscriptions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- calendar_sources holds refresh tokens / feed URLs: keep it server-only
-- (service role key), never exposed to the browser client at all.
create policy "service role only" on calendar_sources
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create index if not exists tasks_status_due_idx on tasks (status, due_date);
create index if not exists events_start_time_idx on events (start_time);
create index if not exists brain_dump_status_idx on brain_dump_inbox (status);
