-- Migration: Add AI features (projects, ai_suggestions, notes.project_id)
-- Run this in Supabase SQL Editor if you already have the base tables

-- ═══════════════════════════════════════════════════════════════════
-- 1) Create projects table
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create index if not exists projects_user_id_idx on public.projects (user_id);

alter table public.projects enable row level security;

-- Drop existing policies if they exist (safe re-run)
drop policy if exists "projects_select_owner" on public.projects;
drop policy if exists "projects_insert_owner" on public.projects;
drop policy if exists "projects_update_owner" on public.projects;
drop policy if exists "projects_delete_owner" on public.projects;

create policy "projects_select_owner" on public.projects
  for select using (auth.uid() = user_id);
create policy "projects_insert_owner" on public.projects
  for insert with check (auth.uid() = user_id);
create policy "projects_update_owner" on public.projects
  for update using (auth.uid() = user_id);
create policy "projects_delete_owner" on public.projects
  for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════
-- 2) Add project_id to notes
-- ═══════════════════════════════════════════════════════════════════
alter table public.notes 
  add column if not exists project_id uuid references public.projects(id) on delete set null;

create index if not exists notes_project_id_idx on public.notes (project_id);

-- ═══════════════════════════════════════════════════════════════════
-- 3) Create ai_suggestions table
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('note', 'workspace')),
  note_id uuid references public.notes(id) on delete cascade,
  tab text not null check (tab in ('suggesties', 'indelen')),
  type text not null,
  payload jsonb not null,
  why text not null,
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz default now(),
  decided_at timestamptz
);

create index if not exists ai_suggestions_user_id_idx on public.ai_suggestions (user_id);
create index if not exists ai_suggestions_note_id_idx on public.ai_suggestions (note_id);
create index if not exists ai_suggestions_status_idx on public.ai_suggestions (status);

alter table public.ai_suggestions enable row level security;

drop policy if exists "ai_suggestions_select_owner" on public.ai_suggestions;
drop policy if exists "ai_suggestions_insert_owner" on public.ai_suggestions;
drop policy if exists "ai_suggestions_update_owner" on public.ai_suggestions;
drop policy if exists "ai_suggestions_delete_owner" on public.ai_suggestions;

create policy "ai_suggestions_select_owner" on public.ai_suggestions
  for select using (auth.uid() = user_id);
create policy "ai_suggestions_insert_owner" on public.ai_suggestions
  for insert with check (auth.uid() = user_id);
create policy "ai_suggestions_update_owner" on public.ai_suggestions
  for update using (auth.uid() = user_id);
create policy "ai_suggestions_delete_owner" on public.ai_suggestions
  for delete using (auth.uid() = user_id);

