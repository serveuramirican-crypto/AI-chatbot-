import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://uxihntppwtdhuxoiyfnx.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4aWhudHBwd3RkaHV4b2l5Zm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyODE5NDgsImV4cCI6MjExMDg1Nzk0OH0.24MwtqjUMSfYDkYX-00ZmM_X0k1CPELK0nwC4RXoMrA'

export function getSanitizedSupabaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  if (!envUrl || envUrl.includes('zuvtokjidnqbnzqnbvxp')) {
    return SUPABASE_URL
  }
  return envUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
}

export function getSanitizedSupabaseAnonKey(): string {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  if (!envKey || envUrl.includes('zuvtokjidnqbnzqnbvxp')) {
    return SUPABASE_ANON_KEY
  }
  return envKey
}

export const supabase = createClient(getSanitizedSupabaseUrl(), getSanitizedSupabaseAnonKey())
