import { Link } from 'react-router-dom'
import { PRIVACY_POLICY_VERSION } from '@/config/privacy'

/**
 * Privacy policy v1 — placeholder.
 *
 * This page exists so the consent flow has a real link target and so
 * `consent_records.privacy_policy_version` has a meaning. The actual
 * legal text is a research-heavy follow-up task that blocks ship-to-
 * real-worker (logged in PLAN-PRJ-mvp-phases.md as a Phase 0 item).
 *
 * Bumping the version: change PRIVACY_POLICY_VERSION in src/config/privacy.ts,
 * update the body below, ship. Workers who consented to v1 will be re-prompted
 * because the matching consent record won't exist for v2 yet.
 */
export default function PrivacyPolicy() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-pc-bg p-6 text-pc-text">
      <Link to="/" className="text-pc-caption text-pc-text-muted">
        ← Home
      </Link>
      <header className="mt-4 flex items-baseline justify-between">
        <h1 className="text-pc-h1 font-semibold">Privacy policy</h1>
        <span className="font-mono text-pc-caption text-pc-text-muted">
          {PRIVACY_POLICY_VERSION} · 2026-04-26 · DRAFT
        </span>
      </header>

      <section className="mt-6 rounded-pc-card border border-pc-amber/40 bg-pc-amber-soft p-4 text-pc-caption text-pc-text">
        <strong>Draft placeholder.</strong> The full policy is in development
        before PayChecker accepts real workers. Until v1.0 ships, the only
        purpose of this page is to give the consent flow a real link target
        and a stable version pin.
      </section>

      <section className="mt-6 space-y-4 text-pc-body leading-relaxed [text-wrap:pretty]">
        <h2 className="text-pc-h2 font-semibold">What we plan to cover (v1.0)</h2>
        <ol className="ml-5 list-decimal space-y-2">
          <li>What we collect (identifiers, employment, financial, documents) and why each item is needed.</li>
          <li>Where data is hosted (Supabase ap-southeast-2 — Sydney) and what crosses borders (Anthropic for OCR with no-training-on-data).</li>
          <li>How long we keep data (delete-on-request: soft-delete same-day, hard-delete + storage purge within 30 days).</li>
          <li>Your rights under the Australian Privacy Principles — access, correction, complaint, deletion.</li>
          <li>How to contact us, and how to escalate to the OAIC if we don't resolve a concern.</li>
        </ol>

        <h2 className="mt-8 text-pc-h2 font-semibold">Until v1.0 ships</h2>
        <p>
          PayChecker is in pre-release development with no production users.
          If you have signed up as a test account, your data is held in a test
          Supabase project, encrypted at rest, accessible only to you via
          row-level security, and will be wiped before production launch.
        </p>
      </section>
    </main>
  )
}
