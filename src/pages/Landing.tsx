import { Link } from 'react-router-dom'

function Landing() {
  return (
    <main className="min-h-screen bg-pc-bg text-pc-text font-sans p-6 max-w-2xl">
      <h1 className="text-pc-display font-semibold tracking-tight">PayChecker</h1>
      <p className="text-pc-body mt-2">
        Save the hours of paperwork required to check your pay.
      </p>
      <p className="text-pc-caption text-pc-text-muted mt-1">
        Phase 0 scaffold — placeholder routes wired with react-router v6.
      </p>

      <nav className="mt-8 grid gap-3">
        <Link
          to="/onboarding"
          className="block rounded-pc-card bg-pc-surface shadow-pc-card p-6 text-pc-navy"
        >
          Start onboarding →
        </Link>
        <Link
          to="/dashboard"
          className="block rounded-pc-card bg-pc-surface shadow-pc-card p-6 text-pc-navy"
        >
          Dashboard →
        </Link>
        <a
          href="/design-system/"
          className="block rounded-pc-card bg-pc-surface shadow-pc-card p-6 text-pc-text-muted"
        >
          Design system reference →
        </a>
      </nav>

      <footer className="text-pc-micro text-pc-text-muted mt-12">
        Not legal advice. Fair Work Ombudsman: 13 13 94.
      </footer>
    </main>
  )
}

export default Landing
