import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { useAuth } from '@clerk/clerk-react'
import { useMemo } from 'react'
import { supabaseUrl, supabaseAnonKey } from '@/config/supabase'

/**
 * Supabase browser client wired to Clerk JWTs.
 *
 * The `accessToken` callback (supabase-js >= 2.45) is invoked on every
 * request, so Supabase always sees a fresh Clerk JWT — no manual refresh
 * loop needed. RLS policies read the Clerk user id via:
 *
 *     auth.jwt() ->> 'sub'
 *
 * which matches `workers.clerk_user_id`. We do NOT use Supabase's own
 * session storage (no email/password sign-up via Supabase) so
 * persistSession + autoRefreshToken are off.
 *
 * Setup prerequisite: a Clerk JWT template named `supabase` must exist
 * in the Clerk dashboard, signed with the Supabase project's JWT secret.
 * If the template is missing, getToken() returns null and Supabase falls
 * back to the anon key — which means RLS-protected reads return zero
 * rows. This is loud-by-design.
 */

export function createSupabaseClient(
  getToken: () => Promise<string | null>,
): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    accessToken: async () => (await getToken()) ?? '',
  })
}

export function useSupabaseClient(): SupabaseClient {
  const { getToken } = useAuth()
  return useMemo(
    () => createSupabaseClient(() => getToken({ template: 'supabase' })),
    [getToken],
  )
}
