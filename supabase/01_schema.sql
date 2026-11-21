-- =============================================================================
-- COMPLETE SUPABASE SCHEMA RESTORE
-- Extracted from database cluster backup
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. TABLES DEFINITIONS
-- -----------------------------------------------------------------------------

-- Table: agents
CREATE TABLE IF NOT EXISTS public.agents (
    id text NOT NULL,
    title text DEFAULT 'Untitled Agent'::text NOT NULL,
    model_id text DEFAULT 'gpt-4o-mini'::text NOT NULL,
    custom_model_id text,
    api_key text,
    instructions text DEFAULT ''::text,
    tools jsonb DEFAULT '[]'::jsonb NOT NULL,
    knowledge_base jsonb DEFAULT '{"documents": [], "isConfigured": false}'::jsonb NOT NULL,
    exit_conditions jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    response_examples jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT agents_pkey PRIMARY KEY (id)
);

-- Table: widget_settings
CREATE TABLE IF NOT EXISTS public.widget_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    color text DEFAULT '#000000'::text NOT NULL,
    header_text text DEFAULT 'Chat with us!'::text NOT NULL,
    logo_url text,
    "position" text DEFAULT 'bottom-right'::text NOT NULL,
    welcome_message text DEFAULT 'Hi! How can I help you today?'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    enable_ai_fallback boolean DEFAULT false,
    ai_model text DEFAULT 'meta-llama/llama-3-8b-instruct:free'::text,
    openrouter_api_key text,
    system_prompt text,
    api_provider text DEFAULT 'openrouter'::text,
    api_key text,
    tools jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT widget_settings_pkey PRIMARY KEY (id)
);

-- Table: usage_logs
CREATE TABLE IF NOT EXISTS public.usage_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    widget_id uuid,
    tokens_used integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT usage_logs_pkey PRIMARY KEY (id)
);

-- Table: chat_sessions
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id text DEFAULT 'agent_1782558058884_2og9p'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_name text DEFAULT 'Visitor'::text,
    is_taken_over boolean DEFAULT false,
    last_interaction timestamp with time zone DEFAULT now(),
    CONSTRAINT chat_sessions_pkey PRIMARY KEY (id)
);

-- Table: chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    products jsonb,
    CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
    CONSTRAINT chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'agent'::text, 'admin'::text, 'assistant'::text, 'bot'::text])))
);

-- Table: chat_logs
CREATE TABLE IF NOT EXISTS public.chat_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    message text NOT NULL,
    sender text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chat_logs_pkey PRIMARY KEY (id)
);

-- Table: knowledge_sources
CREATE TABLE IF NOT EXISTS public.knowledge_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    source_path text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT knowledge_sources_pkey PRIMARY KEY (id)
);

-- Table: leads
CREATE TABLE IF NOT EXISTS public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    company text,
    email text,
    phone text,
    pathway text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    current_day integer DEFAULT 1 NOT NULL,
    notes text,
    custom_fields jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_contacted_at timestamp with time zone,
    CONSTRAINT leads_pkey PRIMARY KEY (id),
    CONSTRAINT leads_pathway_check CHECK ((pathway = ANY (ARRAY['written'::text, 'calls'::text, 'irl'::text]))),
    CONSTRAINT leads_status_check CHECK ((status = ANY (ARRAY['active'::text, 'engaged'::text, 'booked'::text, 'nurture'::text, 'closed'::text, 'escalate'::text])))
);

-- Table: lead_steps
CREATE TABLE IF NOT EXISTS public.lead_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    step_key text NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    outcome text,
    CONSTRAINT lead_steps_pkey PRIMARY KEY (id),
    CONSTRAINT lead_steps_lead_id_step_key_key UNIQUE (lead_id, step_key)
);

-- Table: products
CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    name text NOT NULL,
    description text,
    category text,
    price text NOT NULL,
    link text,
    image_url text,
    size text,
    color text,
    status text DEFAULT 'active'::text,
    CONSTRAINT products_pkey PRIMARY KEY (id)
);

-- Table: workflows
CREATE TABLE IF NOT EXISTS public.workflows (
    id text NOT NULL,
    name text DEFAULT 'Untitled workflow'::text NOT NULL,
    nodes jsonb DEFAULT '[]'::jsonb NOT NULL,
    edges jsonb DEFAULT '[]'::jsonb NOT NULL,
    start_node_pos jsonb DEFAULT '{"x": 340, "y": 280}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT workflows_pkey PRIMARY KEY (id)
);

-- -----------------------------------------------------------------------------
-- 2. INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON public.chat_messages USING btree (session_id);

-- -----------------------------------------------------------------------------
-- 3. FOREIGN KEY CONSTRAINTS
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_session_id_fkey'
    ) THEN
        ALTER TABLE ONLY public.chat_messages
            ADD CONSTRAINT chat_messages_session_id_fkey
            FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lead_steps_lead_id_fkey'
    ) THEN
        ALTER TABLE ONLY public.lead_steps
            ADD CONSTRAINT lead_steps_lead_id_fkey
            FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'usage_logs_widget_id_fkey'
    ) THEN
        ALTER TABLE ONLY public.usage_logs
            ADD CONSTRAINT usage_logs_widget_id_fkey
            FOREIGN KEY (widget_id) REFERENCES public.widget_settings(id) ON DELETE CASCADE;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY & POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Agents Policies
DROP POLICY IF EXISTS "Enable full access for all users" ON public.agents;
CREATE POLICY "Enable full access for all users" ON public.agents USING (true) WITH CHECK (true);

-- Chat Messages Policies
DROP POLICY IF EXISTS "Enable read/write for all users on chat_messages" ON public.chat_messages;
CREATE POLICY "Enable read/write for all users on chat_messages" ON public.chat_messages USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_chat_messages" ON public.chat_messages;
CREATE POLICY "open_chat_messages" ON public.chat_messages USING (true) WITH CHECK (true);

-- Chat Sessions Policies
DROP POLICY IF EXISTS "Enable read/write for all users on chat_sessions" ON public.chat_sessions;
CREATE POLICY "Enable read/write for all users on chat_sessions" ON public.chat_sessions USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_chat_sessions" ON public.chat_sessions;
CREATE POLICY "open_chat_sessions" ON public.chat_sessions USING (true) WITH CHECK (true);

-- Chat Logs Policies
DROP POLICY IF EXISTS "Enable all actions on chat_logs" ON public.chat_logs;
CREATE POLICY "Enable all actions on chat_logs" ON public.chat_logs USING (true) WITH CHECK (true);

-- Leads Policies
DROP POLICY IF EXISTS "Enable all actions for all users" ON public.leads;
CREATE POLICY "Enable all actions for all users" ON public.leads USING (true) WITH CHECK (true);

-- Lead Steps Policies
DROP POLICY IF EXISTS "Enable all actions for all users" ON public.lead_steps;
CREATE POLICY "Enable all actions for all users" ON public.lead_steps USING (true) WITH CHECK (true);

-- Workflows Policies
DROP POLICY IF EXISTS "workflows_all_anon" ON public.workflows;
CREATE POLICY "workflows_all_anon" ON public.workflows TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "workflows_all_authenticated" ON public.workflows;
CREATE POLICY "workflows_all_authenticated" ON public.workflows TO authenticated USING (true) WITH CHECK (true);

-- Products Policies
DROP POLICY IF EXISTS "Enable read/write for products" ON public.products;
CREATE POLICY "Enable read/write for products" ON public.products USING (true) WITH CHECK (true);

-- Knowledge Sources Policies
DROP POLICY IF EXISTS "Enable read/write for knowledge_sources" ON public.knowledge_sources;
CREATE POLICY "Enable read/write for knowledge_sources" ON public.knowledge_sources USING (true) WITH CHECK (true);

-- Widget Settings Policies
DROP POLICY IF EXISTS "Enable read/write for widget_settings" ON public.widget_settings;
CREATE POLICY "Enable read/write for widget_settings" ON public.widget_settings USING (true) WITH CHECK (true);

-- Usage Logs Policies
DROP POLICY IF EXISTS "Enable read/write for usage_logs" ON public.usage_logs;
CREATE POLICY "Enable read/write for usage_logs" ON public.usage_logs USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 5. GRANTS & PERMISSIONS
-- -----------------------------------------------------------------------------
GRANT ALL ON TABLE public.agents TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.chat_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.chat_messages TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.chat_sessions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.knowledge_sources TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.lead_steps TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.leads TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.products TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.usage_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.widget_settings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.workflows TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 6. REALTIME REPLICATION
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 7. STORAGE BUCKETS
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('knowledge_files', 'knowledge_files', true),
    ('widget_assets', 'widget_assets', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Storage Policies for Public Access
DROP POLICY IF EXISTS "Public Access knowledge_files" ON storage.objects;
CREATE POLICY "Public Access knowledge_files" ON storage.objects
FOR ALL USING (bucket_id = 'knowledge_files') WITH CHECK (bucket_id = 'knowledge_files');

DROP POLICY IF EXISTS "Public Access widget_assets" ON storage.objects;
CREATE POLICY "Public Access widget_assets" ON storage.objects
FOR ALL USING (bucket_id = 'widget_assets') WITH CHECK (bucket_id = 'widget_assets');
