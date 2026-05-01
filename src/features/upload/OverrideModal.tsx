import { useEffect } from 'react'
import { cn } from '@/lib/utils'

/**
 * OverrideModal — Sprint M0.5-BUILD-03.
 *
 * Worker-facing label picker invoked from a CaseCard's [Change] button.
 * Replaces the BUILD-01 placeholder toast.
 *
 * Optimistic-UI contract (per ChatGPT critique 2026-05-01 Round 1
 * finding 2): the modal MUST close instantly when the worker taps a
 * category. The DB UPDATE happens in the background. The owning
 * component is responsible for reverting state and surfacing a toast
 * if the UPDATE fails. This component does NOT block on the network.
 *
 * Per docs/planning/M0.5-ui-spec-v01.md PART 5.7, the modal slides up
 * from the bottom and shows 6 category buttons. Cancel via X-button or
 * backdrop tap preserves the original suggestion (no-op).
 */

const CATEGORIES: { token: string; label: string }[] = [
  { token: 'contract', label: 'Contract' },
  { token: 'payslip', label: 'Payslip' },
  { token: 'bank_export', label: 'Bank' },
  { token: 'super_statement', label: 'Super' },
  { token: 'shift', label: 'Shift' },
  { token: 'other', label: 'Other' },
]

type OverrideModalProps = {
  open: boolean
  /** Current case docType — drives the "selected" highlight. */
  currentDocType: string | null
  /**
   * Called synchronously when the worker taps a category. Receives the
   * internal docType token. The owning component is expected to:
   *   1. Update local state immediately (optimistic).
   *   2. Close the modal immediately.
   *   3. Fire the background RPC.
   *   4. Revert + toast on failure.
   */
  onSelect: (docType: string) => void
  onClose: () => void
}

export function OverrideModal({
  open,
  currentDocType,
  onSelect,
  onClose,
}: OverrideModalProps) {
  // Body-scroll lock while the modal is open — keeps the upload page
  // from jiggling under the sheet on mobile when the worker tap-scrolls.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  // Esc-to-close — keyboard-friendly even though the design is mobile-first.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const current = (currentDocType ?? '').toLowerCase()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="What is this document?"
      className="fixed inset-0 z-50"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      {/* Sheet */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 rounded-t-2xl bg-pc-bg p-5 shadow-pc-modal',
          'max-h-[80vh] overflow-y-auto',
        )}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-pc-h2 font-semibold text-pc-text">
            What is this document?
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-pc-text-muted hover:text-pc-text"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {CATEGORIES.map((c) => {
            const isCurrent = current === c.token
            return (
              <button
                key={c.token}
                type="button"
                onClick={() => onSelect(c.token)}
                className={cn(
                  'h-14 w-full rounded-2xl border text-left text-[18px] font-medium transition-colors',
                  'px-4 py-3',
                  'focus-visible:outline-none focus-visible:shadow-pc-focus',
                  isCurrent
                    ? 'border-pc-navy bg-pc-navy-soft text-pc-navy'
                    : 'border-pc-border-strong bg-white text-pc-text hover:bg-pc-bg',
                )}
              >
                {c.label}
              </button>
            )
          })}
        </div>

        <p className="mt-4 text-center text-pc-caption text-pc-text-muted">
          Not sure what this is? That's okay.
        </p>
      </div>
    </div>
  )
}
