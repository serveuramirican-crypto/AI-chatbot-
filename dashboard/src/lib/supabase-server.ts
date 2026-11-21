import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// Supabase URL and keys — hardcoded for reliability in Next.js API routes.
// Using env vars as fallback still, but the literal values ensure the server
// runtime never throws "supabaseKey is required".
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://uxihntppwtdhuxoiyfnx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4aWhudHBwd3RkaHV4b2l5Zm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyODE5NDgsImV4cCI6MjExMDg1Nzk0OH0.24MwtqjUMSfYDkYX-00ZmM_X0k1CPELK0nwC4RXoMrA'

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || SUPABASE_URL
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY

/**
 * Server-side Supabase client for use inside Next.js API routes (/api/**).
 * Intentionally uses the anon key — all access is gated by RLS policies
 * on the agents table. For privileged operations that need to bypass RLS,
 * a service role key would be needed instead.
 */
export const supabaseServer = createClient(
  supabaseUrl,
  supabaseAnonKey,
  { auth: { persistSession: false } }
)

/**
 * READ-ONLY client for product catalog tool calls.
 * Falls back to the anon key if no separate readonly key is configured.
 */
export const supabaseReadOnly = createClient(
  supabaseUrl,
  process.env.SUPABASE_READONLY_KEY || supabaseAnonKey,
  { auth: { persistSession: false } }
)
