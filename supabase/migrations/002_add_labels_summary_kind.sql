-- Migration: Add labels, summary, kind columns to notes table
-- Run this in Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════════════
-- ADD NEW COLUMNS TO NOTES
-- ═══════════════════════════════════════════════════════════════════

-- labels: array of strings for auto-generated tags
ALTER TABLE public.notes 
  ADD COLUMN IF NOT EXISTS labels text[] NOT NULL DEFAULT '{}';

-- summary: AI-generated summary (for conversations)
ALTER TABLE public.notes 
  ADD COLUMN IF NOT EXISTS summary text;

-- kind: 'note' (default) or 'conversation'
ALTER TABLE public.notes 
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'note';

-- ═══════════════════════════════════════════════════════════════════
-- FORCE SCHEMA RELOAD
-- ═══════════════════════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════════════
-- VERIFY COLUMNS EXIST
-- ═══════════════════════════════════════════════════════════════════
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'notes'
  AND column_name IN ('labels', 'summary', 'kind')
ORDER BY ordinal_position;

