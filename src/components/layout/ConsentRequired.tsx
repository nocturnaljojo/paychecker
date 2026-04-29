import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useSupabaseClient } from '@/lib/supabase'
import { hasCompletedOnboarding } from '@/features/onboarding/complete'

type GateState =
  | { kind: 'loading' }
  | { kind: 'consent-missing' }
  | { kind: 'consent-present' }

/**
 * Wraps a route so that signed-in users without a consent_records row
 * are redirected to /onboarding before any worker data gets written
 * (R-010 / APP 1 / APP 6 — see ISS-006).
 *
 * Soft-fails OPEN to /onboarding on transient query errors, mirroring
 * the inverse pattern in src/pages/Onboarding.tsx — a query hiccup that
 * locks the worker out is worse than re-prompting them at /onboarding,
 * which itself short-circuits to /dashboard if consent actually exists.
 *
 * Stack note: this component assumes <ProtectedRoute> sits above it
 * (Clerk sign-in already enforced). It is safe to compose inside a
 * ProtectedRoute child without re-checking sign-in.
 */
export default function ConsentRequired({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  const supabase = useSupabaseClient()
  const [state, setState] = useState<GateState>({ kind: 'loading' })

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let cancelled = false
    hasCompletedOnboarding(supabase)
      .then((done) => {
        if (cancelled) return
        setState({ kind: done ? 'consent-present' : 'consent-missing' })
      })
      .catch(() => {
        // Soft-fail OPEN to /onboarding (compliance-bias). /onboarding
        // re-runs the same check and routes to /dashboard if consent
        // actually exists, so a transient hiccup is recoverable.
        if (!cancelled) setState({ kind: 'consent-missing' })
      })
    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, supabase])

  if (!isLoaded || state.kind === 'loading') {
    return (
      <main className="min-h-screen bg-pc-bg p-6">
        <p className="text-pc-caption text-pc-text-muted">Loading…</p>
      </main>
    )
  }

  if (state.kind === 'consent-missing') {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}
