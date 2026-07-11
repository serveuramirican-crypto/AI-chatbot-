-- Migration to add multi-provider support

ALTER TABLE public.widget_settings ADD COLUMN IF NOT EXISTS api_provider TEXT DEFAULT 'openrouter';
ALTER TABLE public.widget_settings ADD COLUMN IF NOT EXISTS api_key TEXT;

-- Migrate existing keys if any
UPDATE public.widget_settings SET api_key = openrouter_api_key WHERE openrouter_api_key IS NOT NULL AND api_key IS NULL;
