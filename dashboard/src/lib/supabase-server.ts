import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// Supabase URL and keys — hardcoded for reliability in Next.js API routes.
// Using env vars as fallback still, but the literal values ensure the server
// runtime never throws "supabaseKey is required".
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://zuvtokjidnqbnzqnbvxp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dnRva2ppZG5xYm56cW5idnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDM0MzEsImV4cCI6MjA5NjkxOTQzMX0.Zc6Bg3XTi5Y4v9Q9-iI6LJtetDk_yqAkf0OSwRVb3rI'

/**
 * Server-side Supabase client for use inside Next.js API routes (/api/**).
 * Intentionally uses the anon key — all access is gated by RLS policies
 * on the agents table. For privileged operations that need to bypass RLS,
 * a service role key would be needed instead.
 */
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
)

/**
 * READ-ONLY client for product catalog tool calls.
 * Falls back to the anon key if no separate readonly key is configured.
 */
export const supabaseReadOnly = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL,
  process.env.SUPABASE_READONLY_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
)
