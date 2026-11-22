import { createClient } from '@supabase/supabase-js'
import { getSanitizedSupabaseUrl, getSanitizedSupabaseAnonKey } from './supabase'

const supabaseUrl = getSanitizedSupabaseUrl()
const supabaseAnonKey = getSanitizedSupabaseAnonKey()

/**
 * Server-side Supabase client for use inside Next.js API routes (/api/**).
 * Intentionally uses the anon key — all access is gated by RLS policies
 * on the agents and workflows tables.
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
