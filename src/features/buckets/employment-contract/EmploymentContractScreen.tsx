import { useState, useMemo, type ChangeEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  useEmploymentFact,
  type AwardRate,
  type EmploymentForm,
} from './useEmploymentFact'

// Implements ADR-012 5-stage pattern (Layer 1 — employer fact) per
// docs/architecture/add-fact-pattern.md §7.
// Stages are visible as `STAGE 1..5` comment blocks below.

const FIELD_LABELS: Record<keyof EmploymentForm, string> = {
  legal_name: 'employer name',
  abn: 'ABN',
  classification_code: 'classification',
}

export function EmploymentContractScreen() {
  const navigate = useNavigate()
  const { state, awardRates, errorMessage, save, confirm, edit, discard } =
    useEmploymentFact()

  const [pendingDiscard, setPendingDiscard] = useState(false)

  const form = state.status === 'loading' ? null : state.form
  const selectedCode = form?.classification_code ?? null
  const selectedRate = useMemo(
    () => awardRates.find((r) => r.classification_code === selectedCode),
    [awardRates, selectedCode],
  )

  if (state.status === 'loading' || form === null) {
    return (
      <main className="flex min-h-screen flex-col bg-pc-bg">
        <TopBar onBack={() => navigate('/dashboard')} />
        <div className="flex-1" />
      </main>
    )
  }

  const isComplete = isFormComplete(form)
  const firstMissing = firstMissingField(form)
  const showConfirmedView = state.status === 'confirmed' && !pendingDiscard

  return (
    <main className="flex min-h-screen flex-col bg-pc-bg text-pc-text">
      <TopBar onBack={() => navigate('/dashboard')} />

      <div className="flex-1 overflow-auto px-5 pb-8 pt-5">
        {/* === STAGE 1 — ENTRY === */}
        <header>
          <div className="mb-2 font-mono text-[11px] font-medium uppercase tracking-widest text-pc-text-muted">
            Bucket A · Employment contract
          </div>
          <h1 className="text-[26px] font-semibold leading-tight [text-wrap:pretty]">
            {showConfirmedView
              ? 'Confirmed. We have your employer.'
              : 'About your employer.'}
          </h1>
          {!showConfirmedView && (
            <p className="mt-2.5 text-pc-body leading-normal text-pc-text-muted [text-wrap:pretty]">
              PayChecker needs to know who pays you and what level you're on
              so we can compare your pay to the right award rate.
            </p>
          )}
          {state.status === 'editing' &&
            !showConfirmedView &&
            !!form.legal_name && (
              <ResumeBanner form={form} />
            )}
        </header>

        {/* === STAGE 5 — AFTERMATH === (precedes 2-4 in render order while confirmed) */}
        {showConfirmedView && (
          <AftermathPanel
            form={form}
            rate={selectedRate ?? null}
            onEdit={edit}
            onRequestDiscard={() => setPendingDiscard(true)}
          />
        )}

        {/* === STAGE 2 — SUGGEST ===
            Layer 1 first-time: empty per Rule 2.3.
            Layer 1 edit-after-confirm: prior values populate the INPUT
            fields directly with provenance labels (Rule 2.2 editable-in-place
            is the SUGGEST surface).
        */}
        {/* (no separate SUGGEST element rendered — handled inline) */}

        {/* === STAGE 3 — INPUT === */}
        {!showConfirmedView && (
          <section className="mt-6 flex flex-col gap-3.5">
            <Field
              label="Employer legal name"
              hint="How it appears on your payslip."
              provenance={
                state.status !== 'first_time' ? 'you typed this' : null
              }
              required
            >
              <TextInput
                value={form.legal_name}
                onChange={(v) => save({ legal_name: v })}
                placeholder="e.g. Acme Poultry Pty Ltd"
              />
            </Field>

            <Field
              label="ABN"
              hint="11 digits if you have it. Leave empty if not."
              optional
              provenance={form.abn ? 'you typed this' : null}
            >
              <TextInput
                value={form.abn}
                onChange={(v) => save({ abn: v })}
                placeholder="e.g. 12 345 678 901"
                inputMode="numeric"
              />
            </Field>

            <Field
              label="Classification"
              hint="Pick the level that matches your duties."
              provenance={
                form.classification_code
                  ? 'you picked this from the FWC schedule'
                  : null
              }
              required
            >
              <ClassificationPicker
                rates={awardRates}
                selectedCode={form.classification_code}
                onSelect={(code) => save({ classification_code: code })}
                disabled={form.legal_name.trim().length === 0}
                disabledHint="Type your employer name first."
              />
            </Field>

            <HourlyRateDisplay rate={selectedRate ?? null} />
          </section>
        )}

        {/* === STAGE 4 — CONFIRM === */}
        {!showConfirmedView && (
          <section className="mt-7">
            <ConfirmSummary form={form} rate={selectedRate ?? null} />
            <div className="mt-4">
              <Button
                variant="primary"
                block
                disabled={!isComplete}
                onClick={() => void confirm()}
              >
                Confirm employer
              </Button>
              {!isComplete && firstMissing && (
                <p className="mt-2 text-pc-caption text-pc-text-muted">
                  {disabledHint(firstMissing)}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Discard confirmation step (Rule 5.3 — tertiary + confirm step). */}
        {pendingDiscard && (
          <DiscardConfirmStep
            onCancel={() => setPendingDiscard(false)}
            onConfirm={async () => {
              setPendingDiscard(false)
              await discard()
            }}
          />
        )}

        {errorMessage && (
          <p className="mt-4 text-pc-caption text-pc-coral">{errorMessage}</p>
        )}
      </div>
    </main>
  )
}

// =========================================================================
// Sub-components
// =========================================================================

function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <div className="sticky top-0 z-10 grid h-14 grid-cols-[48px_1fr_48px] items-center bg-pc-bg border-b border-pc-border px-2">
      <button
        type="button"
        aria-label="Back"
        onClick={onBack}
        className="flex h-12 w-12 items-center justify-center text-pc-text hover:text-pc-navy"
      >
        <ChevronLeft size={22} strokeWidth={1.75} />
      </button>
      <div />
      <div />
    </div>
  )
}

function Field({
  label,
  hint,
  optional,
  required,
  provenance,
  children,
}: {
  label: string
  hint?: string
  optional?: boolean
  required?: boolean
  provenance: string | null
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-pc-caption font-medium text-pc-text">
          {label}
        </span>
        {optional && (
          <span className="text-[12px] text-pc-text-muted">Optional</span>
        )}
        {required && (
          <span className="text-[12px] text-pc-text-muted">Required</span>
        )}
      </div>
      {children}
      <div className="mt-1.5 flex items-baseline justify-between gap-3">
        {hint && (
          <span className="text-[13px] leading-snug text-pc-text-muted">
            {hint}
          </span>
        )}
        {provenance && (
          <span className="font-mono text-[11px] uppercase tracking-wide text-pc-text-muted shrink-0">
            {provenance}
          </span>
        )}
      </div>
    </div>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  inputMode?: 'text' | 'numeric'
}) {
  return (
    <input
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      className="block w-full rounded-pc-input border-[1.5px] border-pc-border bg-pc-surface px-3.5 py-3 text-pc-body text-pc-text placeholder:text-pc-text-muted focus:border-pc-navy focus:outline-none"
      style={{ height: 52 }}
    />
  )
}

function ClassificationPicker({
  rates,
  selectedCode,
  onSelect,
  disabled,
  disabledHint,
}: {
  rates: AwardRate[]
  selectedCode: string | null
  onSelect: (code: string) => void
  disabled?: boolean
  disabledHint?: string
}) {
  if (disabled) {
    return (
      <div
        className="flex items-center justify-between rounded-pc-input border-[1.5px] border-dashed border-pc-border bg-pc-surface px-3.5 text-pc-body text-pc-text-muted"
        style={{ height: 52 }}
      >
        <span>{disabledHint ?? 'Pick a level'}</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {rates.map((rate) => {
        const selected = rate.classification_code === selectedCode
        return (
          <button
            key={rate.classification_code}
            type="button"
            onClick={() => onSelect(rate.classification_code)}
            className={cn(
              'flex items-start gap-3 rounded-2xl border bg-pc-surface px-4 py-3 text-left transition-colors',
              selected
                ? 'border-pc-navy bg-pc-navy-soft'
                : 'border-pc-border hover:border-pc-border-strong',
            )}
          >
            <div
              className={cn(
                'mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-[1.5px]',
                selected
                  ? 'border-pc-navy bg-pc-navy'
                  : 'border-pc-border-strong bg-pc-surface',
              )}
            >
              {selected && (
                <Check size={12} strokeWidth={3} className="text-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="text-pc-body font-medium text-pc-text">
                {labelForClassification(rate.classification_code)}
              </div>
              <div className="mt-0.5 font-mono text-[13px] tabular-nums text-pc-text-muted">
                {formatAud(rate.amount)} / hour
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function HourlyRateDisplay({ rate }: { rate: AwardRate | null }) {
  if (!rate) return null
  return (
    <div className="rounded-2xl border border-pc-border bg-pc-surface p-4">
      <div className="text-pc-caption font-medium text-pc-text">
        Hourly rate
      </div>
      <div className="mt-1 font-mono text-[20px] tabular-nums text-pc-text">
        {formatAud(rate.amount)}
      </div>
      <div className="mt-1 font-mono text-[11px] uppercase tracking-wide text-pc-text-muted">
        from the award; current as at {formatDate(rate.effective_from)}
      </div>
    </div>
  )
}

function ConfirmSummary({
  form,
  rate,
}: {
  form: EmploymentForm
  rate: AwardRate | null
}) {
  const rows: Array<{ label: string; value: string; provenance: string }> = [
    {
      label: 'Employer',
      value: form.legal_name || '—',
      provenance: 'you typed this',
    },
    {
      label: 'ABN',
      value: form.abn || '(not provided)',
      provenance: form.abn ? 'you typed this' : '—',
    },
    {
      label: 'Classification',
      value: form.classification_code
        ? labelForClassification(form.classification_code)
        : '—',
      provenance: form.classification_code
        ? 'you picked this from the FWC schedule'
        : '—',
    },
    {
      label: 'Hourly rate',
      value: rate ? formatAud(rate.amount) : '—',
      provenance: rate ? 'from the award; you accepted' : '—',
    },
  ]
  return (
    <div className="rounded-2xl border border-pc-border bg-pc-surface p-4">
      <div className="text-pc-caption font-medium uppercase tracking-wide text-pc-text-muted">
        Before you confirm
      </div>
      <ul className="mt-3 flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.label} className="flex items-baseline justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[13px] uppercase tracking-wide text-pc-text-muted">
                {row.label}
              </span>
              <span className="mt-0.5 text-pc-body text-pc-text">
                {row.value}
              </span>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-wide text-pc-text-muted text-right shrink-0 max-w-[45%]">
              {row.provenance}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ResumeBanner({ form }: { form: EmploymentForm }) {
  const filled = [
    !!form.legal_name && 'name',
    !!form.abn && 'ABN',
    !!form.classification_code && 'classification',
  ].filter(Boolean) as string[]
  return (
    <div className="mt-4 rounded-2xl border border-pc-border bg-pc-navy-soft px-4 py-3 text-pc-caption text-pc-text">
      You started this earlier — your saved details are below.
      {filled.length > 0 && (
        <span className="ml-1 text-pc-text-muted">
          ({filled.join(', ')} so far)
        </span>
      )}
    </div>
  )
}

function AftermathPanel({
  form,
  rate,
  onEdit,
  onRequestDiscard,
}: {
  form: EmploymentForm
  rate: AwardRate | null
  onEdit: () => void
  onRequestDiscard: () => void
}) {
  const rows: Array<{ label: string; value: string; provenance: string }> = [
    {
      label: 'Employer',
      value: form.legal_name,
      provenance: 'you typed this',
    },
    {
      label: 'ABN',
      value: form.abn || '(not provided)',
      provenance: form.abn ? 'you typed this' : '—',
    },
    {
      label: 'Classification',
      value: form.classification_code
        ? labelForClassification(form.classification_code)
        : '—',
      provenance: 'you picked this from the FWC schedule',
    },
    {
      label: 'Hourly rate',
      value: rate ? formatAud(rate.amount) : '—',
      provenance: 'from the award; you accepted',
    },
  ]
  return (
    <section className="mt-6 rounded-2xl border border-pc-border bg-pc-sage-soft p-4">
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-baseline justify-between gap-3"
          >
            <div className="flex flex-col">
              <span className="text-[13px] uppercase tracking-wide text-pc-text-muted">
                {row.label}
              </span>
              <span className="mt-0.5 text-pc-body text-pc-text">
                {row.value}
              </span>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-wide text-pc-text-muted text-right shrink-0 max-w-[45%]">
              {row.provenance}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-center justify-between border-t border-pc-border pt-4">
        <button
          type="button"
          onClick={onEdit}
          className="text-pc-caption font-medium text-pc-navy hover:text-pc-navy-hover"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onRequestDiscard}
          className="text-pc-caption font-medium text-pc-text-muted hover:text-pc-text"
        >
          Remove employer
        </button>
      </div>

      <p className="mt-5 text-pc-caption text-pc-text-muted">
        Next: add a payslip when you have your first one.
      </p>
    </section>
  )
}

function DiscardConfirmStep({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="mt-6 rounded-2xl border border-pc-coral-soft bg-pc-coral-soft p-4">
      <div className="text-pc-body font-medium text-pc-text">
        Remove this employer?
      </div>
      <p className="mt-1 text-pc-caption text-pc-text">
        You'll lose what you confirmed. You can add an employer again later.
      </p>
      <div className="mt-4 flex gap-2">
        <Button
          variant="secondary"
          onClick={onConfirm}
          className="border-pc-coral text-pc-coral hover:bg-pc-coral-soft"
        >
          Yes, remove
        </Button>
        <Button variant="tertiary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

// =========================================================================
// Helpers
// =========================================================================

function isFormComplete(form: EmploymentForm) {
  return (
    form.legal_name.trim().length > 0 &&
    form.classification_code !== null &&
    form.classification_code.length > 0
  )
}

function firstMissingField(form: EmploymentForm): keyof EmploymentForm | null {
  if (form.legal_name.trim().length === 0) return 'legal_name'
  if (!form.classification_code) return 'classification_code'
  return null
}

function disabledHint(field: keyof EmploymentForm) {
  if (field === 'classification_code') {
    return 'Pick a classification before you confirm.'
  }
  return `Add your ${FIELD_LABELS[field]} before you confirm.`
}

function labelForClassification(code: string): string {
  // Codes seeded by migration 0005 are PE_LEVEL_1 ... PE_LEVEL_6
  // (per FWC Schedule A "Process Employee Level N" terminology — see
  // docs/research/awards-ma000074-v02.md §A.1.x).
  const m = /^PE_LEVEL_(\d+)$/.exec(code)
  if (m) return `Process Employee Level ${m[1]}`
  return code
}

function formatAud(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(iso: string): string {
  // "2025-07-01" → "1 July 2025"
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`
}
