import { AlertCircle, HelpCircle, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { OnboardingShell } from '@/features/onboarding/Shell'

type Props = {
  onBack: () => void
  onNext: () => void
  onSkip: () => void
}

export function Step5Isnt({ onBack, onNext, onSkip }: Props) {
  return (
    <OnboardingShell
      step={5}
      onBack={onBack}
      onSkip={onSkip}
      eyebrow="Please read this one"
      title="What PayChecker isn't."
      footer={
        <Button variant="primary" block onClick={onNext}>
          I understand
        </Button>
      }
    >
      <div className="flex flex-col gap-3.5 rounded-2xl border border-pc-border bg-pc-surface p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-pc-coral-soft text-[#7A3B33]">
            <AlertCircle size={18} strokeWidth={2} />
          </div>
          <div className="text-[15px] leading-relaxed text-pc-text">
            <div className="mb-1 font-semibold">We are not legal advice.</div>
            We don't tell you if you're owed money. We show you the numbers
            side by side — <b>you decide</b> what to do next.
          </div>
        </div>
        <div className="h-px bg-pc-border" />
        <p className="text-pc-caption leading-relaxed text-pc-text-muted">
          For determinations about pay or entitlements, contact the{' '}
          <b>Fair Work Ombudsman</b>.
        </p>
        <a
          href="tel:131394"
          className="flex items-center gap-2.5 rounded-[10px] border border-pc-border bg-pc-bg px-3.5 py-3 text-pc-text hover:border-pc-border-strong"
        >
          <HelpCircle size={18} strokeWidth={1.75} />
          <div className="flex-1">
            <div className="text-pc-caption font-medium">
              Fair Work Ombudsman
            </div>
            <div className="mt-0.5 font-mono text-pc-body font-medium text-pc-navy tracking-wide">
              13 13 94
            </div>
          </div>
          <ChevronRight size={16} className="text-pc-text-muted" />
        </a>
      </div>
    </OnboardingShell>
  )
}
