-- Infinity v9 Supabase schema
-- Run this in Supabase SQL Editor.

create extension if not exists "uuid-ossp";

create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  artist text,
  type text default 'Full song',
  genre text default 'Unknown',
  status text default 'Draft',
  notes text default '',
  analysis jsonb default '{}'::jsonb,
  files jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

drop policy if exists "Users can read own projects" on public.projects;
create policy "Users can read own projects"
  on public.projects for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own projects" on public.projects;
create policy "Users can insert own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own projects" on public.projects;
create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own projects" on public.projects;
create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

-- Private storage bucket for Infinity audio uploads and generated assets.
insert into storage.buckets (id, name, public)
values ('infinity-audio', 'infinity-audio', false)
on conflict (id) do nothing;

-- Storage policies: each user can only access files inside their own top-level folder.
-- Expected path: {auth.uid()}/{project_id}/{filename}
drop policy if exists "Infinity users can upload own audio" on storage.objects;
create policy "Infinity users can upload own audio"
  on storage.objects for insert
  with check (
    bucket_id = 'infinity-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Infinity users can read own audio" on storage.objects;
create policy "Infinity users can read own audio"
  on storage.objects for select
  using (
    bucket_id = 'infinity-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Infinity users can update own audio" on storage.objects;
create policy "Infinity users can update own audio"
  on storage.objects for update
  using (
    bucket_id = 'infinity-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'infinity-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Infinity users can delete own audio" on storage.objects;
create policy "Infinity users can delete own audio"
  on storage.objects for delete
  using (
    bucket_id = 'infinity-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
