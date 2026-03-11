import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing environment variable: VITE_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing environment variable: VITE_SUPABASE_ANON_KEY')
}

// createBrowserClient persists the session in both localStorage AND cookies so
// that the SSR server can read the session on the initial request without a
// client round-trip.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
