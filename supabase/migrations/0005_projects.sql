-- Projects: a name, a description, and the project's own to-do / done
-- checklist. Items are separate from the tasks table on purpose so they
-- don't flood Tasks or Today.
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  content text not null,
  is_done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists project_items_project_idx on project_items (project_id);

alter table projects enable row level security;
alter table project_items enable row level security;

create policy "authenticated full access" on projects
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on project_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
