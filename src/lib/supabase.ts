import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { useAuth } from '@clerk/clerk-react'
import { useMemo } from 'react'
import { supabaseUrl, supabaseAnonKey } from '@/config/supabase'

/**
 * Supabase browser client wired to Clerk JWTs.
 *
 * Identity comes from Clerk via Supabase third-party auth: Supabase is
 * configured to accept Clerk session tokens (JWKS-validated at Clerk's
 * Frontend API URL), no shared secret, no JWT template. `getToken()`
 * returns the vanilla Clerk session JWT; supabase-js's `accessToken`
 * callback (>=2.45) injects it on every request.
 *
 * RLS policies read the Clerk user id via `auth.jwt() ->> 'sub'` which
 * matches `workers.clerk_user_id`.
 *
 * persistSession + autoRefreshToken are off — Clerk owns the session
 * lifecycle; Supabase is purely a JWT consumer here.
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
    () => createSupabaseClient(() => getToken()),
    [getToken],
  )
}
