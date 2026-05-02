import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import {
  useDocumentPreview,
  type PreviewableDocument,
} from './useDocumentPreview'

/**
 * PreviewModal — Sprint M0.5-BUILD-06; extended in BUILD-07.
 *
 * Full-screen modal that shows all documents linked to a case so the
 * worker can verify what they're labelling. Per BUILD-06 hard-stop
 * rules: no zoom, no editing, no annotation, no built-in PDF viewer
 * (PDFs open in a new tab via the signed URL).
 *
 * Mirrors OverrideModal's interaction model — body scroll lock, Esc to
 * close, backdrop tap to close — for a consistent worker experience.
 *
 * Per ChatGPT round 5 critique: "preview is not a feature — preview is
 * permission to think." The job here is verification, not display
 * polish.
 *
 * Sprint M0.5-BUILD-07 — onChangeType prop added so the worker can
 * fix a misclassification in the same gesture as verifying it (the
 * SEE → THINK → ACT pattern). The override modal is composed by the
 * parent, NOT duplicated inside this component.
 *
 * Esc handling: when the parent renders OverrideModal on top, it must
 * pass `suppressEscape={true}` so Esc closes the override layer first
 * rather than dropping the worker all the way out of preview.
 */

type PreviewModalProps = {
  open: boolean
  caseId: string | null
  docTypeLabel: string
  onClose: () => void
  /** When provided, renders a "Change type" button in the header. */
  onChangeType?: () => void
  /** Set true while a sibling modal is layered above; pauses Esc. */
  suppressEscape?: boolean
  /**
   * Sprint M0.5-BUILD-08 — when true, the document image dims to
   * opacity-70 so the worker's attention shifts to the layered
   * modal's selector. Header buttons + non-image content stay at
   * full opacity (still tappable, still readable). 70 is per
   * ChatGPT V2: 50 was too dark for ESL workers to recognize the
   * doc as context.
   */
  isOverlayOpen?: boolean
  /**
   * Sprint M0.5-BUILD-11 — composable slot rendered below the
   * stacked document images. Caller passes the appropriate facts
   * card (PayslipFactsCard for payslip cases; future bucket cards
   * for contract / bank / super). Keeps PreviewModal generic;
   * domain-specific UI lives where it belongs.
   */
  factsCard?: React.ReactNode
}

export function PreviewModal({
  open,
  caseId,
  docTypeLabel,
  onClose,
  onChangeType,
  suppressEscape = false,
  isOverlayOpen = false,
  factsCard,
}: PreviewModalProps) {
  const { documents, isLoading, hasError } = useDocumentPreview(
    open ? caseId : null,
  )

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  useEffect(() => {
    if (!open || suppressEscape) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, suppressEscape])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${docTypeLabel}`}
      className="fixed inset-0 z-50"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />

      <div className="absolute inset-0 flex flex-col bg-pc-bg">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-pc-border bg-pc-bg px-5 py-3.5">
          <h2 className="min-w-0 flex-1 truncate text-pc-h2 font-semibold text-pc-text">
            {docTypeLabel}
          </h2>
          {onChangeType && (
            <Button variant="secondary" onClick={onChangeType}>
              Change type
            </Button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-2 text-pc-text-muted hover:bg-pc-border hover:text-pc-text"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoading && (
            <div className="flex h-40 items-center justify-center text-pc-caption text-pc-text-muted">
              Loading…
            </div>
          )}

          {!isLoading && hasError && (
            <div className="mx-auto mt-8 max-w-md rounded-2xl border border-pc-coral-soft bg-pc-coral-soft p-4 text-center text-pc-caption text-pc-text">
              Couldn't load preview — close and try again.
            </div>
          )}

          {!isLoading && !hasError && documents.length === 0 && (
            <div className="mx-auto mt-8 max-w-md rounded-2xl border border-pc-border bg-pc-surface p-4 text-center text-pc-caption text-pc-text-muted">
              No pages linked to this paper yet.
            </div>
          )}

          {!isLoading && !hasError && documents.length > 0 && (
            <ul className="mx-auto flex max-w-2xl flex-col gap-4">
              {documents.map((doc, index) => (
                <li key={doc.documentId}>
                  <DocumentPreview
                    doc={doc}
                    pageNumber={index + 1}
                    isOverlayOpen={isOverlayOpen}
                  />
                </li>
              ))}
            </ul>
          )}

          {factsCard && (
            <div className="mx-auto mt-6 max-w-2xl">{factsCard}</div>
          )}
        </div>
      </div>
    </div>
  )
}

function DocumentPreview({
  doc,
  pageNumber,
  isOverlayOpen,
}: {
  doc: PreviewableDocument
  pageNumber: number
  isOverlayOpen: boolean
}) {
  if (doc.errorMessage || !doc.signedUrl) {
    return (
      <div className="rounded-2xl border border-pc-coral-soft bg-pc-coral-soft p-4 text-pc-caption text-pc-text">
        Page {pageNumber}: couldn't load this one.
      </div>
    )
  }

  if (doc.mimeType.startsWith('image/')) {
    return (
      <figure
        className={cn(
          'overflow-hidden rounded-2xl border border-pc-border bg-pc-surface',
          'transition-opacity duration-200',
          isOverlayOpen ? 'opacity-70' : 'opacity-100',
        )}
      >
        <img
          src={doc.signedUrl}
          alt={`Page ${pageNumber}`}
          className="block w-full object-contain"
          loading="lazy"
        />
        <figcaption className="border-t border-pc-border bg-pc-surface px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-pc-text-muted">
          Page {pageNumber}
        </figcaption>
      </figure>
    )
  }

  if (doc.mimeType === 'application/pdf') {
    return (
      <div className="rounded-2xl border border-pc-border bg-pc-surface p-4">
        <div className="text-pc-body font-medium text-pc-text">
          Page {pageNumber} — PDF
        </div>
        <p className="mt-1 text-pc-caption text-pc-text-muted">
          {doc.filename}
        </p>
        <div className="mt-3">
          <a
            href={doc.signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center justify-center rounded-xl px-4 py-2 text-pc-body font-medium',
              'bg-pc-navy text-white hover:bg-pc-navy-hover',
            )}
          >
            Open PDF
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-pc-border bg-pc-surface p-4">
      <div className="text-pc-body font-medium text-pc-text">
        Page {pageNumber}
      </div>
      <p className="mt-1 text-pc-caption text-pc-text-muted">
        Can't preview this file type ({doc.mimeType}).
      </p>
      <div className="mt-3">
        <Button
          variant="secondary"
          onClick={() => window.open(doc.signedUrl ?? '', '_blank')}
        >
          Open in new tab
        </Button>
      </div>
    </div>
  )
}
