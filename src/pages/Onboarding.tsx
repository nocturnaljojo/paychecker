import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'

function Onboarding() {
  const { isLoaded, isSignedIn, user } = useUser()

  return (
    <main className="min-h-screen bg-pc-bg text-pc-text font-sans p-6 max-w-2xl">
      <Link to="/" className="text-pc-caption text-pc-text-muted">
        ← Home
      </Link>

      {!isLoaded ? (
        <p className="text-pc-caption text-pc-text-muted mt-4">Loading…</p>
      ) : isSignedIn && user ? (
        <h1 className="text-pc-h1 font-semibold mt-4">
          Welcome, {user.firstName ?? user.username ?? 'there'}.
        </h1>
      ) : (
        <h1 className="text-pc-h1 font-semibold mt-4">Onboarding</h1>
      )}

      <p className="text-pc-body mt-2">
        Layer 1 facts capture (employer, classification, pay terms) goes here.
      </p>
      <p className="text-pc-caption text-pc-text-muted mt-1">
        Placeholder — wired in a later session per PLAN-PRJ-mvp-phases.md.
      </p>
    </main>
  )
}

export default Onboarding
