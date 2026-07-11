-- Run this in your Supabase SQL Editor

-- 1. Create 'leads' table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    pathway TEXT NOT NULL CHECK (pathway IN ('written', 'calls', 'irl')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'engaged', 'booked', 'nurture', 'closed', 'escalate')),
    current_day INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_contacted_at TIMESTAMP WITH TIME ZONE
);

-- 2. Create 'lead_steps' table
CREATE TABLE IF NOT EXISTS public.lead_steps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    step_key TEXT NOT NULL,
    completed BOOLEAN DEFAULT false NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    outcome TEXT,
    UNIQUE(lead_id, step_key)
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_steps ENABLE ROW LEVEL SECURITY;

-- Create policies (assuming authenticated users can read/write their own organization's leads, 
-- but for simplicity here we allow all authenticated users or anon if not using auth)
-- Adjust these based on your actual auth setup
CREATE POLICY "Enable all actions for all users" ON public.leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all actions for all users" ON public.lead_steps FOR ALL USING (true) WITH CHECK (true);
