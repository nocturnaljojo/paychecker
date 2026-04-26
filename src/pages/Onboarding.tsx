import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useSupabaseClient } from '@/lib/supabase'
import { hasCompletedOnboarding } from '@/features/onboarding/complete'
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'show-flow' }
  | { kind: 'redirect-dashboard' }

export default function Onboarding() {
  const { isLoaded, isSignedIn } = useUser()
  const supabase = useSupabaseClient()
  const navigate = useNavigate()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let cancelled = false
    hasCompletedOnboarding(supabase)
      .then((done) => {
        if (cancelled) return
        setState({ kind: done ? 'redirect-dashboard' : 'show-flow' })
      })
      .catch(() => {
        // Soft-fail open to the flow: better to re-prompt than to lock the
        // user out of onboarding because of a transient query failure.
        if (!cancelled) setState({ kind: 'show-flow' })
      })
    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, supabase])

  useEffect(() => {
    if (state.kind === 'redirect-dashboard') {
      navigate('/dashboard', { replace: true })
    }
  }, [state, navigate])

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-pc-bg p-6">
        <p className="text-pc-caption text-pc-text-muted">Loading…</p>
      </main>
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />
  }

  if (state.kind !== 'show-flow') {
    return (
      <main className="min-h-screen bg-pc-bg p-6">
        <p className="text-pc-caption text-pc-text-muted">Loading…</p>
      </main>
    )
  }

  return <OnboardingFlow />
}
