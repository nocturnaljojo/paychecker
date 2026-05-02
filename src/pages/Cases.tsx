import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { cn } from '@/lib/utils'
import { useAllCases, type CaseListEntry } from '@/features/cases/useAllCases'
import {
  completionStatusLabel,
  docTypeLabel,
} from '@/features/cases/vocabulary'
import { OverrideModal } from '@/features/upload/OverrideModal'
import { PreviewModal } from '@/features/cases/PreviewModal'
import { PayslipFactsCard } from '@/features/cases/PayslipFactsCard'
import ConsentRequired from '@/components/layout/ConsentRequired'
import { IdentityIndicator } from '@/components/IdentityIndicator'

/**
 * Sprint M0.5-BUILD-04 — /cases route ("Your papers").
 * Updated in Sprint M0.5-BUILD-06 — tap-to-preview wired in.
 * Updated in Sprint M0.5-BUILD-07 — "Change type" inside preview +
 * "(not sure yet)" hint on unconfirmed Other cases.
 * Updated in Session 012A — soft-delete via trash icon + ConfirmModal
 * (APP 11.2 compliance).
 *
 * Worker can navigate here from /dashboard ("Your papers" header link)
 * to see their entire case history, override any misclassification,
 * extend a case with more pages, preview the actual document, or
 * delete a paper they don't want.
 *
 * Sort:
 *   1. Cases needing attention first (draft / suggested status)
 *   2. Then by created_at DESC
 *
 * Behaviour per row:
 *   - Tap card body         → PreviewModal (BUILD-06)
 *   - Tap [Change]          → OverrideModal (BUILD-04 optimistic UI)
 *   - Tap [+ Add more pages] → /upload?case={case_id} (extend)
 *   - Tap [trash]           → ConfirmModal → soft-delete (012A)
 *   - Inside preview: [Change type] → OverrideModal layered on top
 *     (BUILD-07; preview stays open so the new label is visible)
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
  const { cases, isLoading, hasError, updateCaseLabel, softDeleteCase } =
    useAllCases()

  const sorted = useMemo(() => sortCases(cases), [cases])
  const readyCount = useMemo(
    () => cases.filter((c) => c.completionStatus !== 'draft').length,
    [cases],
  )

  // Sprint M0.5-BUILD-06 — page-level preview state. Only one modal
  // can be open at a time so a single piece of state is sufficient.
  const [previewCaseId, setPreviewCaseId] = useState<string | null>(null)
  const previewCase = useMemo(
    () => cases.find((c) => c.caseId === previewCaseId) ?? null,
    [cases, previewCaseId],
  )

  // Sprint M0.5-BUILD-07 — override layered on top of preview. Tracks
  // which case the worker is re-labelling from inside the preview
  // modal. Independent from the per-row Change button; resolves the
  // SEE → THINK → ACT flow gap.
  const [overrideFromPreviewCaseId, setOverrideFromPreviewCaseId] =
    useState<string | null>(null)
  const overrideFromPreviewCase = useMemo(
    () =>
      cases.find((c) => c.caseId === overrideFromPreviewCaseId) ?? null,
    [cases, overrideFromPreviewCaseId],
  )
  const [previewToast, setPreviewToast] = useState<string | null>(null)

  // Session 012A — soft-delete confirm flow. Page-level state so
  // the modal lives once and the trash button on each row just sets
  // the target. Optimistic UI handled inside softDeleteCase.
  const [pendingDeleteCaseId, setPendingDeleteCaseId] = useState<string | null>(
    null,
  )
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteToast, setDeleteToast] = useState<string | null>(null)

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDeleteCaseId) return
    setIsDeleting(true)
    const ok = await softDeleteCase(pendingDeleteCaseId)
    setIsDeleting(false)
    setPendingDeleteCaseId(null)
    if (!ok) {
      setDeleteToast("Couldn't delete that — try again.")
      window.setTimeout(() => setDeleteToast(null), 3000)
    }
  }, [pendingDeleteCaseId, softDeleteCase])

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
              onPreview={() => setPreviewCaseId(entry.caseId)}
              onExtend={() => navigate(`/upload?case=${entry.caseId}`)}
              onRequestDelete={() => setPendingDeleteCaseId(entry.caseId)}
            />
          ))}
        </ul>
      </section>

      <PreviewModal
        open={previewCaseId !== null}
        caseId={previewCaseId}
        docTypeLabel={docTypeLabel(previewCase?.docType ?? null)}
        onClose={() => setPreviewCaseId(null)}
        onChangeType={
          previewCase
            ? () => setOverrideFromPreviewCaseId(previewCase.caseId)
            : undefined
        }
        suppressEscape={overrideFromPreviewCaseId !== null}
        isOverlayOpen={overrideFromPreviewCaseId !== null}
        factsCard={
          previewCase?.docType === 'payslip' ? (
            <PayslipFactsCard caseId={previewCase.caseId} />
          ) : undefined
        }
      />

      {/*
        Layered override above the preview. Rendered AFTER PreviewModal
        in the JSX so equal z-index resolves in this modal's favour
        (it paints on top). On select: optimistic update fires, this
        modal closes, preview stays open and re-renders with the new
        label because previewCase derives from the live cases array.
      */}
      <OverrideModal
        open={overrideFromPreviewCaseId !== null}
        currentDocType={overrideFromPreviewCase?.docType ?? null}
        onSelect={async (newType) => {
          const target = overrideFromPreviewCaseId
          setOverrideFromPreviewCaseId(null)
          if (!target) return
          const ok = await updateCaseLabel(target, newType)
          if (!ok) {
            setPreviewToast("Couldn't save that — try again.")
            window.setTimeout(() => setPreviewToast(null), 3000)
          }
        }}
        onClose={() => setOverrideFromPreviewCaseId(null)}
      />

      {previewToast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl border border-pc-amber-soft bg-pc-amber-soft px-4 py-2 text-pc-caption text-pc-text shadow-pc-modal"
        >
          {previewToast}
        </div>
      )}

      {/*
        Session 012A — soft-delete confirm dialog. Worker vocabulary
        ("paper") per BUILD-04; "You can't undo this." matches the
        approved Session 012A copy.
      */}
      <ConfirmModal
        open={pendingDeleteCaseId !== null}
        title="Delete this paper?"
        body="You can't undo this."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onClose={() => {
          if (!isDeleting) setPendingDeleteCaseId(null)
        }}
        isConfirming={isDeleting}
      />

      {deleteToast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl border border-pc-amber-soft bg-pc-amber-soft px-4 py-2 text-pc-caption text-pc-text shadow-pc-modal"
        >
          {deleteToast}
        </div>
      )}
    </main>
  )
}

function CaseRow({
  entry,
  onChange,
  onPreview,
  onExtend,
  onRequestDelete,
}: {
  entry: CaseListEntry
  onChange: (caseId: string, newDocType: string) => Promise<boolean>
  onPreview: () => void
  onExtend: () => void
  onRequestDelete: () => void
}) {
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [revertedToast, setRevertedToast] = useState(false)

  const isConfirmed = entry.completionStatus === 'confirmed'
  const typeLabel = docTypeLabel(entry.docType)
  const statusLabel = completionStatusLabel(entry.completionStatus)
  const pageLabel = entry.pageCount === 1 ? '1 page' : `${entry.pageCount} pages`

  // Sprint M0.5-BUILD-07 — show "(not sure yet)" only when the
  // classifier defaulted to Other AND the worker hasn't confirmed
  // it yet. A worker who explicitly chose Other has confirmed
  // status and gets no hint — they meant Other.
  const isUnsureOther =
    entry.docType === 'other' &&
    (entry.completionStatus === 'suggested' ||
      entry.completionStatus === 'draft')

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
          onClick={onPreview}
          aria-label={`Preview ${typeLabel}`}
          className="flex flex-col items-start gap-1 rounded-xl text-left transition-colors hover:bg-pc-bg/60"
        >
          <div className="text-pc-body font-semibold text-pc-text">
            {typeLabel}
            {isUnsureOther && (
              <span className="ml-2 text-pc-caption font-normal text-pc-text-muted">
                (not sure yet)
              </span>
            )}
          </div>
          <div className="text-pc-caption text-pc-text-muted">
            {pageLabel} ·{' '}
            <span
              className={cn(
                isConfirmed ? 'text-pc-sage' : 'text-pc-text-muted',
              )}
            >
              {isConfirmed
                ? `✔ ${statusLabel}`
                : isUnsureOther
                  ? 'Not sure yet'
                  : statusLabel}
            </span>
            <span aria-hidden="true" className="ml-1 text-pc-text-muted">
              · Tap to view
            </span>
          </div>
        </button>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onExtend}
            className="text-pc-caption font-medium text-pc-navy underline hover:text-pc-navy-hover"
          >
            + Add more pages
          </button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setOverrideOpen(true)}>
              Change
            </Button>
            <button
              type="button"
              onClick={onRequestDelete}
              aria-label={`Delete ${typeLabel}`}
              className={cn(
                'rounded-pc-button p-2 text-pc-text-muted transition-colors',
                'hover:bg-pc-coral-soft hover:text-pc-coral',
                'focus-visible:outline-none focus-visible:shadow-pc-focus',
              )}
            >
              <Trash2 size={18} strokeWidth={1.75} />
            </button>
          </div>
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
