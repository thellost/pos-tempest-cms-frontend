import { createServerFn } from '@tanstack/react-start'
import { createServerClient } from '@supabase/ssr'
import { getCookies, setCookie } from '@tanstack/react-start/server'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

// Server function — handler runs server-side only (cookie-based session read).
// Safe to import from client code; the bundler replaces the handler with an RPC
// proxy on the client and keeps the server-only imports in the server bundle.
export const getServerSession = createServerFn().handler(async () => {
  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookies = getCookies()
        return Object.entries(cookies).map(([name, value]) => ({ name, value }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          setCookie(name, value, options)
        })
      },
    },
  })

  const { data } = await client.auth.getSession()
  return data.session
})
