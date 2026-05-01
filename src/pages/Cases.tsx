import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useAllCases, type CaseListEntry } from '@/features/cases/useAllCases'
import {
  completionStatusLabel,
  docTypeLabel,
} from '@/features/cases/vocabulary'
import { OverrideModal } from '@/features/upload/OverrideModal'
import ConsentRequired from '@/components/layout/ConsentRequired'
import { IdentityIndicator } from '@/components/IdentityIndicator'

/**
 * Sprint M0.5-BUILD-04 — /cases route ("Your papers").
 *
 * Worker can navigate here from /dashboard ("Your papers" header link)
 * to see their entire case history, override any misclassification, or
 * tap into a case to add more pages. This is the meta-fix from ChatGPT
 * critique 2026-05-01 round 3: the system needed "memory" from the
 * worker's perspective — a place to come back to.
 *
 * Sort:
 *   1. Cases needing attention first (draft / suggested status)
 *   2. Then by created_at DESC
 *
 * Behaviour per row:
 *   - Tap [Change]   → OverrideModal (optimistic UI; revert + toast)
 *   - Tap card body  → /upload?case={case_id} (extend the case)
 *
 * NO filters, search, sort options, pagination, delete, or archive in
 * M0.5 per BUILD-04 hard-stop rule.
 */

export default function Cases() {
  return (
    <ConsentRequired>
      <CasesView />
    </ConsentRequired>
  )
}

function CasesView() {
  const navigate = useNavigate()
  const { cases, isLoading, hasError, updateCaseLabel } = useAllCases()

  const sorted = useMemo(() => sortCases(cases), [cases])
  const readyCount = useMemo(
    () => cases.filter((c) => c.completionStatus !== 'draft').length,
    [cases],
  )

  return (
    <main className="min-h-screen bg-pc-bg text-pc-text">
      <header className="px-5 pt-6">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="text-pc-caption text-pc-text-muted hover:text-pc-text"
        >
          ← Back
        </button>
        <IdentityIndicator className="mt-3" />
        <h1 className="mt-3 text-pc-h1 font-semibold [text-wrap:pretty]">
          Your papers
        </h1>
        <p className="mt-2 text-pc-body text-pc-text-muted [text-wrap:pretty]">
          {isLoading
            ? 'Loading…'
            : hasError
              ? "We couldn't load your papers. Try refreshing."
              : readyCount === 1
                ? '1 paper ready'
                : `${readyCount} papers ready`}
        </p>
      </header>

      <section className="mx-auto max-w-2xl px-5 pb-12 pt-5">
        {sorted.length === 0 && !isLoading && !hasError && (
          <div className="rounded-2xl border border-dashed border-pc-border-strong bg-pc-surface p-6 text-center">
            <p className="text-pc-body text-pc-text">No papers yet.</p>
            <p className="mt-1 text-pc-caption text-pc-text-muted">
              Add your first paper from the dashboard.
            </p>
            <div className="mt-4">
              <Button variant="primary" onClick={() => navigate('/dashboard')}>
                Go to dashboard
              </Button>
            </div>
          </div>
        )}

        <ul className="flex flex-col gap-3">
          {sorted.map((entry) => (
            <CaseRow
              key={entry.caseId}
              entry={entry}
              onChange={updateCaseLabel}
              onOpen={() => navigate(`/upload?case=${entry.caseId}`)}
            />
          ))}
        </ul>
      </section>
    </main>
  )
}

function CaseRow({
  entry,
  onChange,
  onOpen,
}: {
  entry: CaseListEntry
  onChange: (caseId: string, newDocType: string) => Promise<boolean>
  onOpen: () => void
}) {
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [revertedToast, setRevertedToast] = useState(false)

  const isConfirmed = entry.completionStatus === 'confirmed'
  const typeLabel = docTypeLabel(entry.docType)
  const statusLabel = completionStatusLabel(entry.completionStatus)
  const pageLabel = entry.pageCount === 1 ? '1 page' : `${entry.pageCount} pages`

  const handleSelect = useCallback(
    async (newDocType: string) => {
      setOverrideOpen(false)
      const ok = await onChange(entry.caseId, newDocType)
      if (!ok) {
        setRevertedToast(true)
        window.setTimeout(() => setRevertedToast(false), 3000)
      }
    },
    [entry.caseId, onChange],
  )

  return (
    <li>
      <div
        className={cn(
          'flex flex-col gap-3 rounded-2xl bg-pc-surface p-4',
          isConfirmed
            ? 'border border-pc-border'
            : 'border border-dashed border-pc-border-strong',
        )}
      >
        <button
          type="button"
          onClick={onOpen}
          className="flex flex-col items-start gap-1 text-left"
        >
          <div className="text-pc-body font-semibold text-pc-text">
            {typeLabel}
          </div>
          <div className="text-pc-caption text-pc-text-muted">
            {pageLabel} ·{' '}
            <span
              className={cn(
                isConfirmed ? 'text-pc-sage' : 'text-pc-text-muted',
              )}
            >
              {isConfirmed ? `✔ ${statusLabel}` : statusLabel}
            </span>
          </div>
        </button>

        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => setOverrideOpen(true)}>
            Change
          </Button>
        </div>

        {revertedToast && (
          <div
            role="status"
            className="rounded-xl border border-pc-amber-soft bg-pc-amber-soft px-3 py-2 text-pc-caption text-pc-text"
          >
            Couldn't save that — try again.
          </div>
        )}
      </div>

      <OverrideModal
        open={overrideOpen}
        currentDocType={entry.docType}
        onSelect={handleSelect}
        onClose={() => setOverrideOpen(false)}
      />
    </li>
  )
}

/**
 * Attention-first sort: cases the worker should look at (draft /
 * suggested) float to the top; everything else by created_at DESC.
 */
function sortCases(cases: CaseListEntry[]): CaseListEntry[] {
  const needsAttention = (c: CaseListEntry) =>
    c.completionStatus === 'draft' || c.completionStatus === 'suggested'
  return [...cases].sort((a, b) => {
    const aAttn = needsAttention(a) ? 1 : 0
    const bAttn = needsAttention(b) ? 1 : 0
    if (aAttn !== bAttn) return bAttn - aAttn // attention first
    return b.createdAt.localeCompare(a.createdAt) // newest first
  })
}
