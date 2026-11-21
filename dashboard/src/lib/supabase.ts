import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://uxihntppwtdhuxoiyfnx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4aWhudHBwd3RkaHV4b2l5Zm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyODE5NDgsImV4cCI6MjExMDg1Nzk0OH0.24MwtqjUMSfYDkYX-00ZmM_X0k1CPELK0nwC4RXoMrA'

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || SUPABASE_URL
// Normalize URL in case user included /rest/v1
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
