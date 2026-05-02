import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import {
  usePayslipFacts,
  type EarningsLine,
  type PayslipFact,
} from './usePayslipFacts'

/**
 * Sprint M0.5-BUILD-11 — PayslipFactsCard.
 * Sprint M0.5-BUILD-11.6 — copy: "Did we get these right?" → "Check
 *   this matches your payslip"
 * Sprint M0.5-BUILD-12 — structured visibility + minimal edit:
 *   - Renders employer_name above the values
 *   - Renders earnings[] line-item breakdown read-only
 *   - Inline edit on Hours worked (single field, the wedge into
 *     "user becomes authority" per fact-model intent)
 *
 * State machine (driven by payslip_facts.extraction_status):
 *   pending   — "Reading your payslip…" + skeleton
 *   extracted — "We found these values" + breakdown + confirm CTA +
 *               inline edit on Hours
 *   confirmed — read-only display with ✓
 *   failed    — "We couldn't read this clearly" + guidance
 *
 * Architecture invariants preserved:
 * - DB CHECK still enforces payslip_facts_confirmed_integrity:
 *   period_start, period_end, gross_pay, net_pay all required for
 *   confirm. UI disables [Looks right] when missing.
 * - log_psf_history audit trigger handles edit-after-confirm:
 *   editing a column resets confirmed_at to NULL automatically
 *   (worker re-confirms). UI doesn't need to handle that here —
 *   the next refetch sees the new state.
 */

type Props = {
  caseId: string | null
}

export function PayslipFactsCard({ caseId }: Props) {
  const {
    fact,
    isLoading,
    hasError,
    isPolling,
    confirmFact,
    updateReportedHours,
  } = usePayslipFacts(caseId)

  if (!caseId) return null

  if (hasError) {
    return (
      <div className="rounded-2xl border border-pc-coral-soft bg-pc-coral-soft p-4">
        <div className="text-pc-body font-medium text-pc-text">
          Couldn't load extracted values
        </div>
        <p className="mt-1 text-pc-caption text-pc-text">
          Close and reopen the preview to retry.
        </p>
      </div>
    )
  }

  const isPending =
    !fact || fact.extractionStatus === 'pending' || (isLoading && !fact)

  if (isPending) {
    return (
      <div className="rounded-2xl border border-pc-border bg-pc-surface p-4">
        <div className="text-pc-body font-medium text-pc-text">
          Reading your payslip…
        </div>
        <p className="mt-1 text-pc-caption text-pc-text-muted">
          {isPolling
            ? 'This can take a few seconds.'
            : 'Hang tight — values will appear here.'}
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    )
  }

  if (fact.extractionStatus === 'failed') {
    return (
      <div className="rounded-2xl border border-pc-coral-soft bg-pc-coral-soft p-4">
        <div className="text-pc-body font-medium text-pc-text">
          We couldn't read this clearly
        </div>
        <p className="mt-1 text-pc-caption text-pc-text">
          Try uploading a clearer photo, or check that all corners are visible.
        </p>
      </div>
    )
  }

  if (fact.extractionStatus === 'confirmed') {
    return <ConfirmedCard fact={fact} />
  }

  return (
    <ExtractedCard
      fact={fact}
      confirmFact={confirmFact}
      updateReportedHours={updateReportedHours}
    />
  )
}

function ExtractedCard({
  fact,
  confirmFact,
  updateReportedHours,
}: {
  fact: PayslipFact
  confirmFact: () => Promise<boolean>
  updateReportedHours: (hours: number) => Promise<boolean>
}) {
  const [pending, setPending] = useState(false)
  const [errorToast, setErrorToast] = useState<string | null>(null)

  const canConfirm =
    fact.periodStart !== null &&
    fact.periodEnd !== null &&
    fact.grossPay !== null &&
    fact.netPay !== null

  const handleLooksRight = useCallback(async () => {
    setPending(true)
    const ok = await confirmFact()
    setPending(false)
    if (!ok) {
      setErrorToast("Couldn't save that — try again.")
      window.setTimeout(() => setErrorToast(null), 3000)
    }
  }, [confirmFact])

  const handleSaveHours = useCallback(
    async (hours: number): Promise<boolean> => {
      const ok = await updateReportedHours(hours)
      if (!ok) {
        setErrorToast("Couldn't save that — try again.")
        window.setTimeout(() => setErrorToast(null), 3000)
      }
      return ok
    },
    [updateReportedHours],
  )

  return (
    <div className="rounded-2xl border border-pc-border bg-pc-surface p-4">
      {fact.employerName && (
        <div className="mb-3 border-b border-pc-border pb-3">
          <div className="text-pc-caption text-pc-text-muted">Employer</div>
          <div className="mt-0.5 text-pc-body font-medium text-pc-text">
            {fact.employerName}
          </div>
        </div>
      )}

      <div className="text-pc-body font-medium text-pc-text">
        We found these values
      </div>

      <FactRows fact={fact} editableHours onSaveHours={handleSaveHours} />

      <EarningsBreakdown earnings={fact.earnings} />

      {!canConfirm && (
        <p className="mt-3 text-pc-caption text-pc-amber">
          Some required values weren't visible. Try a clearer photo before
          confirming.
        </p>
      )}

      <p className="mt-4 text-pc-body text-pc-text">
        Check this matches your payslip
      </p>

      <div className="mt-3">
        <Button
          variant="primary"
          block
          onClick={handleLooksRight}
          disabled={pending || !canConfirm}
        >
          {pending ? 'Saving…' : 'Looks right'}
        </Button>
      </div>

      {errorToast && (
        <div
          role="status"
          className="mt-3 rounded-xl border border-pc-amber-soft bg-pc-amber-soft px-3 py-2 text-pc-caption text-pc-text"
        >
          {errorToast}
        </div>
      )}
    </div>
  )
}

function ConfirmedCard({ fact }: { fact: PayslipFact }) {
  return (
    <div className="rounded-2xl border border-pc-border bg-pc-sage-soft p-4">
      {fact.employerName && (
        <div className="mb-3 border-b border-pc-border pb-3">
          <div className="text-pc-caption text-pc-text-muted">Employer</div>
          <div className="mt-0.5 text-pc-body font-medium text-pc-text">
            {fact.employerName}
          </div>
        </div>
      )}
      <div className="text-pc-body font-medium text-pc-text">
        ✓ We found these values (confirmed)
      </div>
      <FactRows fact={fact} />
      <EarningsBreakdown earnings={fact.earnings} />
      <p className="mt-3 text-pc-caption text-pc-text-muted">
        Confirmed by you
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// FactRows — summary table. The Hours row is editable in the
// extracted state (BUILD-12 wedge: one field, demonstrating the
// "user becomes authority" pattern). Other rows stay read-only
// until BUILD-13+.
// ─────────────────────────────────────────────────────────────────

function FactRows({
  fact,
  editableHours = false,
  onSaveHours,
}: {
  fact: PayslipFact
  editableHours?: boolean
  onSaveHours?: (hours: number) => Promise<boolean>
}) {
  return (
    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-pc-body">
      <Row label="Pay date" value={formatDate(fact.payDate)} />
      <Row
        label="Pay period"
        value={formatPeriod(fact.periodStart, fact.periodEnd)}
      />
      {editableHours && onSaveHours ? (
        <EditableHoursRow value={fact.reportedHours} onSave={onSaveHours} />
      ) : (
        <Row label="Hours worked" value={formatHours(fact.reportedHours)} />
      )}
      <Row label="Hourly rate" value={formatCurrency(fact.hourlyRate)} />
      <Row label="Gross pay" value={formatCurrency(fact.grossPay)} />
      <Row label="Net pay" value={formatCurrency(fact.netPay)} />
      <Row label="Super" value={formatCurrency(fact.superAmount)} />
      <Row label="Tax" value={formatCurrency(fact.taxWithheld)} />
    </dl>
  )
}

function Row({
  label,
  value,
}: {
  label: string
  value: { text: string; missing: boolean }
}) {
  return (
    <>
      <dt className="text-pc-caption text-pc-text-muted">{label}</dt>
      <dd
        className={cn(
          'text-pc-body',
          value.missing ? 'italic text-pc-text-muted' : 'text-pc-text',
        )}
      >
        {value.text}
      </dd>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────
// EditableHoursRow — first user-edit affordance in the system.
// Read state shows the value + an "Edit" link. Tap → input +
// Save/Cancel. Save fires UPDATE; on success the parent refetches
// and the row re-renders with the new value (and confirmed_at gets
// reset to NULL by the audit trigger if the row was confirmed —
// next mount of the card will reflect that).
// ─────────────────────────────────────────────────────────────────

function EditableHoursRow({
  value,
  onSave,
}: {
  value: number | null
  onSave: (hours: number) => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync the draft when the underlying value changes mid-edit (e.g.,
  // refetch happened). Only resets when not actively editing.
  useEffect(() => {
    if (!editing) {
      setDraft(value === null ? '' : String(value))
    }
  }, [value, editing])

  const startEdit = useCallback(() => {
    setDraft(value === null ? '' : String(value))
    setError(null)
    setEditing(true)
  }, [value])

  const cancelEdit = useCallback(() => {
    setEditing(false)
    setError(null)
  }, [])

  const save = useCallback(async () => {
    const trimmed = draft.trim()
    if (trimmed.length === 0) {
      setError('Enter the hours from your payslip.')
      return
    }
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('That doesn\'t look like a valid number.')
      return
    }
    if (parsed > 168) {
      setError("That's more than a week of hours — check the value.")
      return
    }
    setSaving(true)
    const ok = await onSave(parsed)
    setSaving(false)
    if (ok) {
      setEditing(false)
      setError(null)
    } else {
      setError("Couldn't save that — try again.")
    }
  }, [draft, onSave])

  const formatted = formatHours(value)

  if (!editing) {
    return (
      <>
        <dt className="text-pc-caption text-pc-text-muted">Hours worked</dt>
        <dd className="flex flex-wrap items-baseline gap-2 text-pc-body">
          <span
            className={cn(
              formatted.missing
                ? 'italic text-pc-text-muted'
                : 'text-pc-text',
            )}
          >
            {formatted.text}
          </span>
          <button
            type="button"
            onClick={startEdit}
            className="text-pc-caption font-medium text-pc-navy underline hover:text-pc-navy-hover"
          >
            Edit
          </button>
        </dd>
      </>
    )
  }

  return (
    <>
      <dt className="text-pc-caption text-pc-text-muted">Hours worked</dt>
      <dd className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.25"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={saving}
            className={cn(
              'w-28 rounded-xl border border-pc-border bg-white px-3 py-2 text-pc-body',
              'focus-visible:outline-none focus-visible:shadow-pc-focus',
            )}
            aria-label="Hours worked"
          />
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="tertiary" onClick={cancelEdit} disabled={saving}>
            Cancel
          </Button>
        </div>
        {error && (
          <p className="text-pc-caption text-pc-amber">{error}</p>
        )}
      </dd>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────
// EarningsBreakdown — read-only structured view of earnings[].
// Renders only when extraction returned at least one entry. v01
// extractions (pre-BUILD-11.6) have empty earnings arrays; the
// section silently doesn't render in that case.
// ─────────────────────────────────────────────────────────────────

function EarningsBreakdown({ earnings }: { earnings: EarningsLine[] }) {
  if (earnings.length === 0) return null

  return (
    <div className="mt-4 border-t border-pc-border pt-3">
      <div className="text-pc-caption text-pc-text-muted">Breakdown</div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {earnings.map((line, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3">
            <span className="text-pc-body text-pc-text">
              {earningsLabel(line)}
            </span>
            <span className="font-mono text-pc-body text-pc-text">
              {formatCurrency(line.amount).text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function earningsLabel(line: EarningsLine): string {
  // Prefer the model's preserved label (e.g., "Saturday penalty",
  // "Leading Hand"). Fall back to the type token if no label.
  const base =
    line.label && line.label.trim().length > 0
      ? line.label.trim()
      : typeLabel(line.type)
  if (line.hours !== null) {
    const hoursText = Number.isInteger(line.hours)
      ? `${line.hours}`
      : line.hours.toFixed(2)
    return `${base} · ${hoursText} h`
  }
  return base
}

function typeLabel(t: EarningsLine['type']): string {
  switch (t) {
    case 'ordinary':
      return 'Ordinary'
    case 'penalty':
      return 'Penalty'
    case 'overtime':
      return 'Overtime'
    case 'allowance':
      return 'Allowance'
    case 'other':
    default:
      return 'Other'
  }
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-3 w-24 animate-pulse rounded bg-pc-border" />
      <div className="h-3 flex-1 animate-pulse rounded bg-pc-border" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Formatters — null-safe, ESL-clear
// ─────────────────────────────────────────────────────────────────

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function formatDate(iso: string | null): { text: string; missing: boolean } {
  if (!iso) return { text: 'not visible', missing: true }
  const parts = iso.split('-')
  if (parts.length !== 3) return { text: iso, missing: false }
  const [y, m, d] = parts
  const monthIdx = parseInt(m, 10) - 1
  if (Number.isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) {
    return { text: iso, missing: false }
  }
  return {
    text: `${parseInt(d, 10)} ${MONTHS_SHORT[monthIdx]} ${y}`,
    missing: false,
  }
}

function formatPeriod(
  start: string | null,
  end: string | null,
): { text: string; missing: boolean } {
  if (!start && !end) return { text: 'not visible', missing: true }
  const s = start ? formatDate(start).text : '—'
  const e = end ? formatDate(end).text : '—'
  return { text: `${s} → ${e}`, missing: false }
}

function formatCurrency(n: number | null): { text: string; missing: boolean } {
  if (n === null || n === undefined) {
    return { text: 'not visible', missing: true }
  }
  const formatted = n.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return { text: formatted, missing: false }
}

function formatHours(n: number | null): { text: string; missing: boolean } {
  if (n === null || n === undefined) {
    return { text: 'not visible', missing: true }
  }
  const text = Number.isInteger(n) ? `${n}` : n.toFixed(2)
  return { text, missing: false }
}
