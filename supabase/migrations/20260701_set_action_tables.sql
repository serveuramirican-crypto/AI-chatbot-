-- ============================================================================
-- Migration: Set Action Tables & Schema Extensions
-- Tables: workflow_variables, prompts, transcript_properties, workflow_execution_variables
-- Extensions: chat_sessions.metadata
-- ============================================================================

-- 1. Extend chat_sessions to store transcript metadata / properties
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Table: workflow_variables (reusable variable definitions)
CREATE TABLE IF NOT EXISTS public.workflow_variables (
  id TEXT PRIMARY KEY,
  workflow_id TEXT,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'string',
  default_value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookup by name and workflow
CREATE INDEX IF NOT EXISTS idx_workflow_variables_workflow_id ON public.workflow_variables(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_variables_name ON public.workflow_variables(name);

-- 3. Table: prompts (reusable prompt definitions for Set action and AI steps)
CREATE TABLE IF NOT EXISTS public.prompts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  model TEXT DEFAULT 'openai/gpt-4o-mini',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Table: transcript_properties (reusable conversation metadata definitions)
CREATE TABLE IF NOT EXISTS public.transcript_properties (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  data_type TEXT NOT NULL DEFAULT 'string',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Table: workflow_execution_variables (runtime variable values isolated per session)
CREATE TABLE IF NOT EXISTS public.workflow_execution_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  variable_id TEXT NOT NULL,
  variable_name TEXT NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exec_vars_session_id ON public.workflow_execution_variables(session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_exec_vars_session_var ON public.workflow_execution_variables(session_id, variable_name);

-- 6. Enable RLS
ALTER TABLE public.workflow_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_execution_variables ENABLE ROW LEVEL SECURITY;

-- 7. Permissive policies matching existing tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workflow_variables' AND policyname = 'workflow_variables_all') THEN
    CREATE POLICY workflow_variables_all ON public.workflow_variables FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prompts' AND policyname = 'prompts_all') THEN
    CREATE POLICY prompts_all ON public.prompts FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transcript_properties' AND policyname = 'transcript_properties_all') THEN
    CREATE POLICY transcript_properties_all ON public.transcript_properties FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workflow_execution_variables' AND policyname = 'workflow_execution_variables_all') THEN
    CREATE POLICY workflow_execution_variables_all ON public.workflow_execution_variables FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 8. Seed default variables if none exist
INSERT INTO public.workflow_variables (id, name, type, default_value, description)
VALUES
  ('var_customer_name', 'customer_name', 'string', '', 'Customer full name'),
  ('var_product_price', 'product_price', 'number', '0', 'Selected product price'),
  ('var_selected_size', 'selected_size', 'string', '', 'Product clothing size (e.g. S, M, L)'),
  ('var_selected_color', 'selected_color', 'string', '', 'Product color choice'),
  ('var_greeting', 'greeting', 'string', '', 'Dynamic greeting text'),
  ('var_first_name', 'first_name', 'string', '', 'Customer first name'),
  ('var_customer_summary', 'customer_summary', 'string', '', 'AI summary of customer needs'),
  ('var_last_utterance', 'last_utterance', 'string', '', 'Last user response')
ON CONFLICT (id) DO NOTHING;

-- 9. Seed default reusable prompts
INSERT INTO public.prompts (id, name, description, content)
VALUES
  (
    'prompt_extract_clothing_prefs',
    'Extract Clothing Preferences',
    'Extracts product type, color, size, fit, and material from conversation',
    'Analyze the customer''s conversation and identify their clothing preferences.\n\nExtract:\n- Product type\n- Color\n- Size\n- Fit\n- Material\n\nReturn a concise structured summary.\nNever invent missing information.'
  ),
  (
    'prompt_extract_customer_summary',
    'Extract Customer Summary',
    'Summarizes customer inquiry and intent',
    'Analyze the conversation context and summarize the customer''s key questions, product interest, and primary intent in 2-3 concise sentences.'
  ),
  (
    'prompt_sentiment_analysis',
    'Sentiment Analysis',
    'Classifies customer sentiment as positive, neutral, or negative',
    'Determine the customer''s overall sentiment (Positive, Neutral, Negative) and state the single primary reason in one short sentence.'
  )
ON CONFLICT (id) DO NOTHING;

-- 10. Seed default transcript properties
INSERT INTO public.transcript_properties (id, name, data_type, description)
VALUES
  ('prop_customer_type', 'customer_type', 'string', 'Customer tier or relationship (e.g. VIP, Regular, Lead)'),
  ('prop_request_category', 'request_category', 'string', 'Category of inquiry (e.g. Returns, Inquiry, Complaint, Order)'),
  ('prop_customer_notes', 'customer_notes', 'string', 'Internal staff notes attached to transcript'),
  ('prop_sentiment', 'sentiment', 'string', 'Detected sentiment classification')
ON CONFLICT (id) DO NOTHING;
