import { Link } from 'react-router-dom'

function Onboarding() {
  return (
    <main className="min-h-screen bg-pc-bg text-pc-text font-sans p-6 max-w-2xl">
      <Link to="/" className="text-pc-caption text-pc-text-muted">
        ← Home
      </Link>
      <h1 className="text-pc-h1 font-semibold mt-4">Onboarding</h1>
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
