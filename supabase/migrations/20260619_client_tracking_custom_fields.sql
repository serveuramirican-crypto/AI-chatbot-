-- Run this in your Supabase SQL Editor to add the custom_fields column

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
