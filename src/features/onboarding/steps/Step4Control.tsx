import { User, Upload, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { OnboardingShell, InfoCard } from '@/features/onboarding/Shell'

type Props = {
  onBack: () => void
  onNext: () => void
  onSkip: () => void
}

export function Step4Control({ onBack, onNext, onSkip }: Props) {
  return (
    <OnboardingShell
      step={4}
      onBack={onBack}
      onSkip={onSkip}
      eyebrow="Your control"
      title="Three promises about your data."
      footer={
        <Button variant="primary" block onClick={onNext}>
          Continue
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <InfoCard
          icon={<User size={22} strokeWidth={1.75} />}
          tone="sage"
          title="Your data stays yours"
          body="Nothing is shared without your permission."
        />
        <InfoCard
          icon={<Upload size={22} strokeWidth={1.75} />}
          tone="sage"
          title="Only what you upload"
          body="We never connect to your bank account. We only see documents you choose to share."
        />
        <InfoCard
          icon={<Lock size={22} strokeWidth={1.75} />}
          tone="sage"
          title="Raw documents deleted"
          body="After we extract what matters, we delete the originals. We keep the numbers, not the images."
        />
      </div>
    </OnboardingShell>
  )
}
