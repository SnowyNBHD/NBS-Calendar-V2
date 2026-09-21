-- One briefing per local date, published by the scheduled daily-briefing
-- agent through the publish_briefing MCP tool and shown at /briefing.
create table if not exists briefings (
  id uuid primary key default gen_random_uuid(),
  briefing_date date not null unique,
  title text not null default 'Daily briefing',
  summary text,
  html text not null,
  published_at timestamptz not null default now()
);

alter table briefings enable row level security;

create policy "authenticated full access" on briefings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
