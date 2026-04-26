import { Wallet, Calendar, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { OnboardingShell, InfoCard } from '@/features/onboarding/Shell'

type Props = {
  onBack: () => void
  onNext: () => void
  onSkip: () => void
}

export function Step2What({ onBack, onNext, onSkip }: Props) {
  return (
    <OnboardingShell
      step={2}
      onBack={onBack}
      onSkip={onSkip}
      eyebrow="What PayChecker does"
      title="Three things, in plain words."
      footer={
        <Button variant="primary" block onClick={onNext}>
          Continue
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <InfoCard
          icon={<Wallet size={22} strokeWidth={1.75} />}
          tone="navy"
          title="Understand"
          body="See your pay clearly. What you earn, what gets taken out, and what reaches you."
        />
        <InfoCard
          icon={<Calendar size={22} strokeWidth={1.75} />}
          tone="navy"
          title="Forecast"
          body="Know what's coming. Enough to plan ahead."
        />
        <InfoCard
          icon={<Check size={22} strokeWidth={1.75} />}
          tone="sage"
          title="Verify"
          body="Check the numbers match what should have happened. We show you; you decide."
        />
      </div>
    </OnboardingShell>
  )
}
