-- ============================================================
-- Migration: Fix agents table RLS for development
-- Removes conflicting policies and creates a universal
-- open policy to unblock SELECT, INSERT, UPDATE, DELETE.
-- ============================================================

-- 1. Drop any conflicting existing policies
DROP POLICY IF EXISTS "Allow authenticated SELECT on agents"  ON public.agents;
DROP POLICY IF EXISTS "Allow authenticated INSERT on agents"  ON public.agents;
DROP POLICY IF EXISTS "Allow authenticated UPDATE on agents"  ON public.agents;
DROP POLICY IF EXISTS "Allow authenticated DELETE on agents"  ON public.agents;
DROP POLICY IF EXISTS "Allow anon INSERT on agents"           ON public.agents;
DROP POLICY IF EXISTS "Enable read access for all users"      ON public.agents;
DROP POLICY IF EXISTS "Enable insert access for all users"    ON public.agents;
DROP POLICY IF EXISTS "Enable full access for all users"      ON public.agents;

-- 2. Create a single universal policy that allows ALL operations
-- (SELECT, INSERT, UPDATE, DELETE) for everyone (authenticated + anon).
-- This is intentional for development — tighten per-user before going to prod.
CREATE POLICY "Enable full access for all users"
ON public.agents
FOR ALL
USING (true)
WITH CHECK (true);

-- 3. Verify
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'agents';
