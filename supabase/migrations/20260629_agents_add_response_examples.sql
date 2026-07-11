-- Add response_examples column to agents table
ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS response_examples JSONB DEFAULT '[]'::jsonb;
