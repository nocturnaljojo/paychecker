import type { ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { OnboardingShell } from '@/features/onboarding/Shell'
import { cn } from '@/lib/utils'

export type ConsentFormData = {
  name: string
  country: string
  language: string
}

type Props = {
  data: ConsentFormData
  setData: (next: ConsentFormData) => void
  consent: boolean
  setConsent: (next: boolean) => void
  onBack: () => void
  onSkip: () => void
  onComplete: () => void
  isSubmitting: boolean
  errorMessage?: string
}

function MiniField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (next: string) => void
  placeholder: string
}) {
  return (
    <input
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder={placeholder}
      className="block w-full rounded-pc-input border-[1.5px] border-pc-border bg-pc-surface px-3.5 py-3 text-pc-body text-pc-text placeholder:text-pc-text-muted focus:border-pc-navy focus:outline-none"
    />
  )
}

export function Step6Consent({
  data,
  setData,
  consent,
  setConsent,
  onBack,
  onSkip,
  onComplete,
  isSubmitting,
  errorMessage,
}: Props) {
  const canSubmit = consent && data.name.trim().length > 0 && !isSubmitting

  return (
    <OnboardingShell
      step={6}
      onBack={onBack}
      onSkip={onSkip}
      eyebrow="Last thing"
      title="Ready to continue?"
      footer={
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            block
            disabled={!canSubmit}
            onClick={onComplete}
          >
            {isSubmitting ? 'Saving…' : 'Get started'}
          </Button>
          {errorMessage && (
            <p className="text-pc-caption text-pc-coral">{errorMessage}</p>
          )}
        </div>
      }
    >
      <div className="flex items-start gap-3 rounded-2xl border border-pc-border bg-pc-surface p-4">
        <button
          type="button"
          onClick={() => setConsent(!consent)}
          aria-pressed={consent}
          className={cn(
            'mt-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-md p-0',
            consent
              ? 'bg-pc-navy'
              : 'border-[1.5px] border-pc-border-strong bg-pc-surface',
          )}
        >
          {consent && <Check size={16} strokeWidth={2.5} className="text-white" />}
        </button>
        <div className="flex-1 text-pc-caption leading-relaxed text-pc-text">
          I understand and want to continue.
          <div className="mt-1.5">
            <Link
              to="/privacy"
              className="text-[13px] font-medium text-pc-navy underline"
            >
              Read the full privacy policy
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3.5">
        <div>
          <label className="mb-1.5 block text-pc-caption font-medium text-pc-text">
            Your name
          </label>
          <MiniField
            value={data.name}
            onChange={(v) => setData({ ...data, name: v })}
            placeholder="What should we call you?"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-pc-caption font-medium text-pc-text">
              Country of origin
            </span>
            <span className="text-[12px] text-pc-text-muted">Optional</span>
          </div>
          <MiniField
            value={data.country}
            onChange={(v) => setData({ ...data, country: v })}
            placeholder="e.g. Tonga"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-pc-caption font-medium text-pc-text">
              Preferred language
            </span>
            <span className="text-[12px] text-pc-text-muted">
              Defaults to English
            </span>
          </div>
          <MiniField
            value={data.language}
            onChange={(v) => setData({ ...data, language: v })}
            placeholder="English"
          />
        </div>
      </div>
    </OnboardingShell>
  )
}
