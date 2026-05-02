import { useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

/**
 * Session 012A — Generic confirm dialog for destructive actions.
 *
 * Mirrors the project's existing modal pattern (OverrideModal,
 * PreviewModal): fixed inset-0 z-50, body-scroll-lock,
 * Esc-to-close, backdrop-tap-to-close. Two action buttons
 * (cancel + destructive primary).
 *
 * Worker-facing copy is the caller's responsibility — this
 * component takes title + body + confirm label as props so
 * vocabulary stays consistent with where it's used (e.g.
 * "papers" not "payslip cases" in /cases).
 *
 * Closing during an in-flight confirm: while `isConfirming`
 * is true the buttons are disabled and Esc/backdrop are
 * ignored. This prevents the worker double-tapping or
 * Esc-closing while the optimistic-UI-then-RPC dance is
 * still resolving.
 */

type ConfirmModalProps = {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  cancelLabel?: string
  /**
   * Called synchronously when the worker taps the destructive
   * button. The caller is expected to:
   *   1. Set isConfirming=true.
   *   2. Apply optimistic UI.
   *   3. Fire the RPC.
   *   4. Close the modal (set open=false) on success or failure.
   *   5. Set isConfirming=false.
   */
  onConfirm: () => void
  onClose: () => void
  isConfirming?: boolean
}

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
  isConfirming = false,
}: ConfirmModalProps) {
  // Body-scroll lock while open. Same pattern as OverrideModal /
  // PreviewModal so the page underneath doesn't jiggle.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  // Esc-to-close — keyboard-friendly. Suppressed while a confirm
  // is in flight so the worker can't accidentally bail mid-RPC.
  useEffect(() => {
    if (!open || isConfirming) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, isConfirming])

  const handleBackdrop = useCallback(() => {
    if (isConfirming) return
    onClose()
  }, [isConfirming, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50"
    >
      <button
        type="button"
        aria-label={cancelLabel}
        onClick={handleBackdrop}
        className="absolute inset-0 bg-black/40"
      />

      <div
        className={cn(
          'absolute left-1/2 top-1/2 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2',
          'rounded-2xl bg-pc-bg p-5 shadow-pc-modal',
        )}
      >
        <h2 className="text-pc-h2 font-semibold text-pc-text">{title}</h2>
        <p className="mt-2 text-pc-body text-pc-text-muted">{body}</p>

        <div className="mt-5 flex flex-col gap-2">
          <Button
            variant="primary"
            block
            onClick={onConfirm}
            disabled={isConfirming}
            className="!bg-pc-coral !text-white hover:!opacity-90 active:!opacity-80"
          >
            {isConfirming ? 'Deleting…' : confirmLabel}
          </Button>
          <Button
            variant="tertiary"
            block
            onClick={onClose}
            disabled={isConfirming}
          >
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
