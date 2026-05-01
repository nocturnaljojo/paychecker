import { useNavigate } from 'react-router-dom'
import {
  bucketBadgeLabel,
  type BucketKey,
  type WorkerCasesState,
} from './useWorkerCases'

/**
 * AttentionPanel — Sprint M0.5-BUILD-04.
 *
 * Lightweight derived signal. NOT a notification system: no DB table,
 * no read/unread state, no timestamps. Per ChatGPT critique 2026-05-01
 * round 3, the worker doesn't need a notification feed — they need
 * gentle direction toward the next thing that matters.
 *
 * Surfaces (when present):
 *   - Cases needing label confirmation (draft / suggested status).
 *   - Cases sitting in 'Other' or with NULL doc_type.
 *   - Next-step suggestion derived from useWorkerCases (worker hasn't
 *     covered all 5 buckets yet).
 *
 * Hides cleanly when there is nothing to show. Silence-when-fine is
 * the right pattern for an Apete-shape worker; "your inbox is empty"
 * adds noise, not value.
 */

type AttentionItem = {
  key: string
  headline: string
  detail: string
  onTap: () => void
}

export function AttentionPanel({
  workerCases,
  nextStep,
}: {
  workerCases: WorkerCasesState
  nextStep: string | null
}) {
  const navigate = useNavigate()

  const items: AttentionItem[] = []

  // Rule 1 — confirmation needed.
  const needsConfirm = workerCases.cases.filter(
    (c) =>
      c.completionStatus === 'draft' || c.completionStatus === 'suggested',
  )
  if (needsConfirm.length > 0) {
    items.push({
      key: 'needs-confirm',
      headline: 'Check this paper',
      detail:
        needsConfirm.length === 1
          ? '1 paper needs your check'
          : `${needsConfirm.length} papers need your check`,
      onTap: () => navigate('/cases'),
    })
  }

  // Rule 2 — labelled 'other' or unlabelled.
  const unsureCount = workerCases.cases.filter(
    (c) => !c.docType || c.docType === 'other',
  ).length
  if (unsureCount > 0) {
    items.push({
      key: 'unsure',
      headline: 'This paper might need a label',
      detail:
        unsureCount === 1
          ? '1 paper marked Other or unlabelled'
          : `${unsureCount} papers marked Other or unlabelled`,
      onTap: () => navigate('/cases'),
    })
  }

  // Rule 3 — next-step suggestion (only fires when worker already has
  // ≥1 case; useWorkerCases.nextStepFor returns null on zero).
  if (nextStep) {
    const targetBucket = pickNextBucketFromCopy(nextStep)
    items.push({
      key: 'next-step',
      headline: nextStep,
      detail: 'Next step in your case',
      onTap: () =>
        targetBucket
          ? navigate(`/upload?bucket=${targetBucket}`)
          : navigate('/dashboard'),
    })
  }

  if (items.length === 0) return null

  return (
    <section className="mb-5 rounded-2xl border border-pc-border bg-pc-amber-soft p-4">
      <div className="text-pc-caption font-medium uppercase tracking-wide text-[#7A5A1E]">
        What needs your attention
      </div>
      <ul className="mt-3 flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={item.onTap}
              className="flex w-full flex-col items-start text-left"
            >
              <span className="text-pc-body font-semibold text-pc-text">
                {item.headline}
              </span>
              <span className="mt-0.5 text-pc-caption text-pc-text-muted">
                {item.detail}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Reverse-derive the bucket key from the next-step copy so the tap
 * routes to the right `/upload?bucket=` filter. Falls back to
 * navigating to /dashboard if the string doesn't carry a bucket name.
 *
 * The strings are produced by `nextStepFor()` in useWorkerCases.ts —
 * they read "Next: Add your contract" / "Next: Add a payslip" / etc.
 * Keep this in sync with that function.
 */
function pickNextBucketFromCopy(copy: string): BucketKey | null {
  const lower = copy.toLowerCase()
  const buckets: { test: string; key: BucketKey }[] = [
    { test: 'contract', key: 'contract' },
    { test: 'payslip', key: 'payslips' },
    { test: 'bank', key: 'bank' },
    { test: 'super', key: 'super' },
    { test: 'shift', key: 'shifts' },
    { test: 'roster', key: 'shifts' },
  ]
  for (const b of buckets) {
    if (lower.includes(b.test)) return b.key
  }
  return null
}

// Keep the import surface tidy for consumers who only need the label
// helper — re-export from the same file.
export { bucketBadgeLabel }
