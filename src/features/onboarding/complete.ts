import type { SupabaseClient } from '@supabase/supabase-js'
import { ensureWorker } from '@/lib/upload'
import { PRIVACY_POLICY_VERSION } from '@/config/privacy'
import type { ConsentFormData } from '@/features/onboarding/steps/Step6Consent'

/**
 * Persist the onboarding form: ensure a workers row, write the captured
 * profile fields, then record an immutable consent event.
 *
 * Order matters: workers update first (RLS-safe upsert), consent insert
 * second. If the consent insert fails we surface the error — the worker
 * row already has display_name/country/language set, but with no consent
 * row they will land on /onboarding again on next mount and be re-prompted.
 * That's the correct behavior: no consent record means no consent.
 */
export async function completeOnboarding(
  supabase: SupabaseClient,
  clerkUserId: string,
  data: ConsentFormData,
): Promise<{ workerId: string; consentId: string }> {
  const workerId = await ensureWorker(supabase, clerkUserId)

  const trimmedName = data.name.trim()
  const trimmedCountry = data.country.trim()
  const trimmedLanguage = data.language.trim() || 'en'

  const updateResult = await supabase
    .from('workers')
    .update({
      display_name: trimmedName,
      country: trimmedCountry || null,
      preferred_language: trimmedLanguage,
    })
    .eq('id', workerId)
  if (updateResult.error) throw updateResult.error

  const consentInsert = await supabase
    .from('consent_records')
    .insert({
      worker_id: workerId,
      privacy_policy_version: PRIVACY_POLICY_VERSION,
      user_agent: navigator.userAgent || null,
    })
    .select('id')
    .single()
  if (consentInsert.error) throw consentInsert.error

  return { workerId, consentId: consentInsert.data.id as string }
}

/**
 * Has the current worker already consented? Returns true on first hit.
 *
 * Used by `/onboarding` to short-circuit users who already finished the
 * flow. Avoids re-prompting on every refresh and avoids two-row consent
 * states. RLS scopes this to the caller's own consent_records.
 */
export async function hasCompletedOnboarding(
  supabase: SupabaseClient,
): Promise<boolean> {
  const result = await supabase
    .from('consent_records')
    .select('id', { head: true, count: 'exact' })
    .limit(1)
  if (result.error) throw result.error
  return (result.count ?? 0) > 0
}
