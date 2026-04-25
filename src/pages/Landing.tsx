import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react'

function Landing() {
  return (
    <main className="min-h-screen bg-pc-bg text-pc-text font-sans p-6 max-w-2xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-pc-display font-semibold tracking-tight">PayChecker</h1>
          <p className="text-pc-body mt-2">
            Save the hours of paperwork required to check your pay.
          </p>
          <p className="text-pc-caption text-pc-text-muted mt-1">
            Phase 0 scaffold — Clerk auth wired (s002).
          </p>
        </div>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </header>

      <SignedOut>
        <nav className="mt-8 grid gap-3">
          <Link
            to="/sign-up"
            className="block rounded-pc-card bg-pc-navy text-white shadow-pc-card p-6"
          >
            Create account →
          </Link>
          <Link
            to="/sign-in"
            className="block rounded-pc-card bg-pc-surface shadow-pc-card p-6 text-pc-navy"
          >
            Sign in →
          </Link>
          <a
            href="/design-system/"
            className="block rounded-pc-card bg-pc-surface shadow-pc-card p-6 text-pc-text-muted"
          >
            Design system reference →
          </a>
        </nav>
      </SignedOut>

      <SignedIn>
        <nav className="mt-8 grid gap-3">
          <Link
            to="/dashboard"
            className="block rounded-pc-card bg-pc-navy text-white shadow-pc-card p-6"
          >
            Go to dashboard →
          </Link>
          <Link
            to="/onboarding"
            className="block rounded-pc-card bg-pc-surface shadow-pc-card p-6 text-pc-navy"
          >
            Continue onboarding →
          </Link>
          <a
            href="/design-system/"
            className="block rounded-pc-card bg-pc-surface shadow-pc-card p-6 text-pc-text-muted"
          >
            Design system reference →
          </a>
        </nav>
      </SignedIn>

      <footer className="text-pc-micro text-pc-text-muted mt-12">
        Not legal advice. Fair Work Ombudsman: 13 13 94.
      </footer>
    </main>
  )
}

export default Landing
