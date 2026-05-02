import { useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import {
  usePayslipFacts,
  type PayslipFact,
} from './usePayslipFacts'

/**
 * Sprint M0.5-BUILD-11 — PayslipFactsCard.
 *
 * First user-visible surface of the extraction layer. Renders one of
 * four states based on payslip_facts.extraction_status:
 *
 *   pending   — "Reading your payslip…" + skeleton (extraction in flight)
 *   extracted — "We found these values" + confirm CTA
 *   confirmed — read-only display with ✓
 *   failed    — "We couldn't read this clearly" + guidance
 *
 * Per BUILD-11 hard-stop:
 * - [Edit values] button is DISABLED with "Editing coming next" hint.
 *   No click handler — honest UI placeholder until BUILD-12.
 * - Null fields render as muted "not visible" — honest about what the
 *   model could and couldn't read.
 * - [Looks right] is disabled when DB integrity check would fail
 *   (period_start, period_end, gross_pay, net_pay all required for
 *   confirm per Migration 0009 CHECK).
 */

type Props = {
  caseId: string | null
}

export function PayslipFactsCard({ caseId }: Props) {
  const { fact, isLoading, hasError, isPolling, confirmFact } =
    usePayslipFacts(caseId)

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

  // Pending: either no row exists yet, or status='pending'.
  // While polling we keep the same calm copy.
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

  return <ExtractedCard fact={fact} confirmFact={confirmFact} />
}

function ExtractedCard({
  fact,
  confirmFact,
}: {
  fact: PayslipFact
  confirmFact: () => Promise<boolean>
}) {
  const [pending, setPending] = useState(false)
  const [errorToast, setErrorToast] = useState(false)

  // DB integrity (Migration 0009 CHECK): all four required for confirm.
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
      setErrorToast(true)
      window.setTimeout(() => setErrorToast(false), 3000)
    }
  }, [confirmFact])

  return (
    <div className="rounded-2xl border border-pc-border bg-pc-surface p-4">
      <div className="text-pc-body font-medium text-pc-text">
        We found these values
      </div>

      <FactRows fact={fact} />

      {!canConfirm && (
        <p className="mt-3 text-pc-caption text-pc-amber">
          Some required values weren't visible. Try a clearer photo before
          confirming.
        </p>
      )}

      <p className="mt-4 text-pc-body text-pc-text">
        Did we get these right?
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          variant="primary"
          block
          onClick={handleLooksRight}
          disabled={pending || !canConfirm}
        >
          {pending ? 'Saving…' : 'Looks right'}
        </Button>
        <div className="flex flex-col gap-1">
          <Button variant="secondary" block disabled>
            Edit values
          </Button>
          <span className="text-center text-[11px] text-pc-text-muted">
            Editing coming next
          </span>
        </div>
      </div>

      {errorToast && (
        <div
          role="status"
          className="mt-3 rounded-xl border border-pc-amber-soft bg-pc-amber-soft px-3 py-2 text-pc-caption text-pc-text"
        >
          Couldn't save that — try again.
        </div>
      )}
    </div>
  )
}

function ConfirmedCard({ fact }: { fact: PayslipFact }) {
  return (
    <div className="rounded-2xl border border-pc-border bg-pc-sage-soft p-4">
      <div className="text-pc-body font-medium text-pc-text">
        ✓ We found these values (confirmed)
      </div>
      <FactRows fact={fact} />
      <p className="mt-3 text-pc-caption text-pc-text-muted">
        Confirmed by you
      </p>
    </div>
  )
}

function FactRows({ fact }: { fact: PayslipFact }) {
  return (
    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-pc-body">
      <Row label="Pay date" value={formatDate(fact.payDate)} />
      <Row
        label="Pay period"
        value={formatPeriod(fact.periodStart, fact.periodEnd)}
      />
      <Row label="Hours worked" value={formatHours(fact.reportedHours)} />
      <Row label="Hourly rate" value={formatCurrency(fact.hourlyRate)} />
      <Row label="Gross pay" value={formatCurrency(fact.grossPay)} />
      <Row label="Net pay" value={formatCurrency(fact.netPay)} />
      <Row label="Super" value={formatCurrency(fact.superAmount)} />
      <Row label="Tax" value={formatCurrency(fact.taxWithheld)} />
    </dl>
  )
}

function Row({ label, value }: { label: string; value: { text: string; missing: boolean } }) {
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
  // Drop trailing .00 for whole hours; keep decimals when meaningful.
  const text = Number.isInteger(n) ? `${n}` : n.toFixed(2)
  return { text, missing: false }
}
