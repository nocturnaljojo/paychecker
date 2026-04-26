/**
 * Supabase runtime config.
 *
 * Mirrors the clerk.ts pattern: validates the two required env vars at
 * module-load time so missing/wrong-shape values fail fast with a clear
 * message instead of a silent broken client.
 *
 * Both vars are SAFE to ship in client JS:
 *   - VITE_SUPABASE_URL is your project URL — public.
 *   - VITE_SUPABASE_ANON_KEY is the anon (publishable) key, scoped to
 *     RLS-protected reads. It is NOT a service-role key. Service-role
 *     keys (sb_secret_* / service_role_*) MUST NEVER live in any
 *     VITE_* var; Vite bundles them into client JS.
 */

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!URL) {
  throw new Error(
    'Missing VITE_SUPABASE_URL. Copy .env.local.example to .env.local ' +
      'and set the project URL from supabase.com → Project Settings → API.',
  )
}

if (!ANON_KEY) {
  throw new Error(
    'Missing VITE_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local ' +
      'and set the anon (publishable) key from supabase.com → Project Settings → API.',
  )
}

if (
  ANON_KEY.startsWith('sb_secret_') ||
  ANON_KEY.startsWith('service_role_') ||
  ANON_KEY.includes('"role":"service_role"')
) {
  throw new Error(
    'VITE_SUPABASE_ANON_KEY looks like a SERVICE-ROLE key. Service-role ' +
      'keys bypass RLS and must never live in a VITE_* var (Vite bundles ' +
      'them into client JS). Use the anon / publishable key instead.',
  )
}

export const supabaseUrl: string = URL
export const supabaseAnonKey: string = ANON_KEY
