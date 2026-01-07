-- Supabase schema voor AI Notes → Mindmap
-- Version 2: Added projects, ai_suggestions, notes.project_id

-- ═══════════════════════════════════════════════════════════════════
-- PROJECTS TABLE
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create index if not exists projects_user_id_idx on public.projects (user_id);

alter table public.projects enable row level security;

create policy "projects_select_owner" on public.projects
  for select using (auth.uid() = user_id);
create policy "projects_insert_owner" on public.projects
  for insert with check (auth.uid() = user_id);
create policy "projects_update_owner" on public.projects
  for update using (auth.uid() = user_id);
create policy "projects_delete_owner" on public.projects
  for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════
-- NOTES TABLE
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text,
  content text not null,
  labels text[] not null default '{}',
  summary text,
  kind text not null default 'note',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists notes_user_id_idx on public.notes (user_id);
create index if not exists notes_created_at_idx on public.notes (created_at);
create index if not exists notes_project_id_idx on public.notes (project_id);

alter table public.notes enable row level security;

create policy "notes_select_owner" on public.notes
  for select using (auth.uid() = user_id);
create policy "notes_insert_owner" on public.notes
  for insert with check (auth.uid() = user_id);
create policy "notes_update_owner" on public.notes
  for update using (auth.uid() = user_id);
create policy "notes_delete_owner" on public.notes
  for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════
-- AI SUGGESTIONS TABLE
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

create policy "ai_suggestions_select_owner" on public.ai_suggestions
  for select using (auth.uid() = user_id);
create policy "ai_suggestions_insert_owner" on public.ai_suggestions
  for insert with check (auth.uid() = user_id);
create policy "ai_suggestions_update_owner" on public.ai_suggestions
  for update using (auth.uid() = user_id);
create policy "ai_suggestions_delete_owner" on public.ai_suggestions
  for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════
-- MINDMAP NODES TABLE
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.mindmap_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid references public.notes(id) on delete set null,
  label text not null,
  position_x float8 not null,
  position_y float8 not null,
  color text not null default 'default',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists mindmap_nodes_user_id_idx on public.mindmap_nodes (user_id);
create index if not exists mindmap_nodes_note_id_idx on public.mindmap_nodes (note_id);

alter table public.mindmap_nodes enable row level security;

create policy "mindmap_nodes_select_owner" on public.mindmap_nodes
  for select using (auth.uid() = user_id);
create policy "mindmap_nodes_insert_owner" on public.mindmap_nodes
  for insert with check (auth.uid() = user_id);
create policy "mindmap_nodes_update_owner" on public.mindmap_nodes
  for update using (auth.uid() = user_id);
create policy "mindmap_nodes_delete_owner" on public.mindmap_nodes
  for delete using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════
-- MINDMAP EDGES TABLE
-- ═══════════════════════════════════════════════════════════════════
create table if not exists public.mindmap_edges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_node_id uuid not null references public.mindmap_nodes(id) on delete cascade,
  target_node_id uuid not null references public.mindmap_nodes(id) on delete cascade,
  created_at timestamptz default now()
);

create index if not exists mindmap_edges_user_id_idx on public.mindmap_edges (user_id);

alter table public.mindmap_edges enable row level security;

create policy "mindmap_edges_select_owner" on public.mindmap_edges
  for select using (auth.uid() = user_id);
create policy "mindmap_edges_insert_owner" on public.mindmap_edges
  for insert with check (auth.uid() = user_id);
create policy "mindmap_edges_delete_owner" on public.mindmap_edges
  for delete using (auth.uid() = user_id);
