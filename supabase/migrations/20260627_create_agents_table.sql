-- ============================================================
-- Migration: Create `agents` table + fix RLS
-- Run this in full in Supabase SQL Editor
-- ============================================================

-- ── 1. Create the agents table ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.agents (
  id                TEXT        PRIMARY KEY,
  title             TEXT        NOT NULL DEFAULT 'Untitled Agent',
  model_id          TEXT        NOT NULL DEFAULT 'gpt-4o-mini',
  custom_model_id   TEXT,
  api_key           TEXT,
  instructions      TEXT        DEFAULT '',
  tools             JSONB       NOT NULL DEFAULT '[]'::JSONB,
  knowledge_base    JSONB       NOT NULL DEFAULT '{"isConfigured":false,"documents":[]}'::JSONB,
  exit_conditions   JSONB       NOT NULL DEFAULT '[]'::JSONB,
  status            TEXT        NOT NULL DEFAULT 'draft',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Enable RLS on agents ──────────────────────────────────
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- ── 3. RLS policies (idempotent — safe to re-run) ────────────
DROP POLICY IF EXISTS "Allow authenticated SELECT on agents" ON public.agents;
DROP POLICY IF EXISTS "Allow authenticated INSERT on agents" ON public.agents;
DROP POLICY IF EXISTS "Allow authenticated UPDATE on agents" ON public.agents;
DROP POLICY IF EXISTS "Allow authenticated DELETE on agents" ON public.agents;

CREATE POLICY "Allow authenticated SELECT on agents"
  ON public.agents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated INSERT on agents"
  ON public.agents FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated UPDATE on agents"
  ON public.agents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated DELETE on agents"
  ON public.agents FOR DELETE TO authenticated USING (true);

-- ── 4. Also ensure widget_settings has tools column (harmless) ─
ALTER TABLE public.widget_settings
  ADD COLUMN IF NOT EXISTS tools JSONB DEFAULT '[]'::JSONB;

-- ── 5. Verification ──────────────────────────────────────────

-- Confirm agents table exists with correct columns
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'agents'
ORDER BY ordinal_position;

-- Confirm RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('agents', 'widget_settings');

-- Confirm all 4 policies were created
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'agents';
