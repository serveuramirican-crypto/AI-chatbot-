import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zuvtokjidnqbnzqnbvxp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dnRva2ppZG5xYm56cW5idnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDM0MzEsImV4cCI6MjA5NjkxOTQzMX0.Zc6Bg3XTi5Y4v9Q9-iI6LJtetDk_yqAkf0OSwRVb3rI'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
