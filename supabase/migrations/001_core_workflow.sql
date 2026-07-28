-- Migration 001: core workflow tables (private beta Phase 2)
-- Run in the Supabase SQL editor (or via supabase db push) after schema.sql.
-- All tables are user-owned with RLS; the FastAPI backend uses the service-role
-- key and enforces ownership in code from the verified JWT subject.

create extension if not exists "uuid-ossp";

-- ── project_files ───────────────────────────────────────────────────────────
create table if not exists public.project_files (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  kind text not null default 'full_mix' check (kind in ('vocal','beat','full_mix','reference','stem','render')),
  original_name text not null,
  backend_file_id text,
  storage_path text,
  mime text,
  size_bytes bigint default 0,
  duration_s numeric,
  sample_rate integer,
  channels integer,
  status text not null default 'uploaded',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── audio_versions (Original → Cleaned → Mixed → Mastered lineage) ─────────
create table if not exists public.audio_versions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  parent_version_id uuid references public.audio_versions (id) on delete set null,
  kind text not null check (kind in ('original','cleaned','mixed','mastered','stem','generated')),
  label text not null default '',
  backend_file_id text,
  storage_path text,
  parameters jsonb not null default '{}'::jsonb,
  is_final boolean not null default false,
  notes text not null default '',
  status text not null default 'completed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── analysis_results ────────────────────────────────────────────────────────
create table if not exists public.analysis_results (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  version_id uuid references public.audio_versions (id) on delete cascade,
  measurements jsonb not null default '{}'::jsonb,
  problems jsonb not null default '[]'::jsonb,
  engine_version text not null default '',
  created_at timestamptz not null default now()
);

-- ── processing_decisions (accept / ignore per detected problem) ────────────
create table if not exists public.processing_decisions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  analysis_id uuid references public.analysis_results (id) on delete cascade,
  problem_key text not null,
  action text not null check (action in ('accepted','ignored','previewed')),
  parameters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ── processing_jobs ─────────────────────────────────────────────────────────
create table if not exists public.processing_jobs (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  input_file_id text,
  output_version_id uuid references public.audio_versions (id) on delete set null,
  job_type text not null,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed','cancelled','expired')),
  progress integer not null default 0,
  message text not null default '',
  error text,
  parameters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- ── generated_sounds / exports / usage / audit ─────────────────────────────
create table if not exists public.generated_sounds (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  prompt text not null default '',
  backend_asset_id text,
  storage_path text,
  duration_s numeric,
  status text not null default 'completed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  version_id uuid references public.audio_versions (id) on delete set null,
  formats jsonb not null default '[]'::jsonb,
  manifest jsonb not null default '{}'::jsonb,
  status text not null default 'completed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_records (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  metric text not null,
  amount bigint not null default 0,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users (id) on delete set null,
  event text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ── RLS: owner-only access on every table ──────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'project_files','audio_versions','analysis_results','processing_decisions',
    'processing_jobs','generated_sounds','exports','usage_records','audit_events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_owner_select" on public.%I', t, t);
    execute format('create policy "%s_owner_select" on public.%I for select using (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "%s_owner_insert" on public.%I', t, t);
    execute format('create policy "%s_owner_insert" on public.%I for insert with check (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "%s_owner_update" on public.%I', t, t);
    execute format('create policy "%s_owner_update" on public.%I for update using (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "%s_owner_delete" on public.%I', t, t);
    execute format('create policy "%s_owner_delete" on public.%I for delete using (auth.uid() = user_id)', t, t);
  end loop;
end $$;

-- updated_at triggers (reuses set_updated_at() from schema.sql)
do $$
declare t text;
begin
  foreach t in array array['project_files','audio_versions','generated_sounds','exports'] loop
    execute format('drop trigger if exists %s_set_updated_at on public.%I', t, t);
    execute format('create trigger %s_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;
