import { Wallet } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { OnboardingShell } from '@/features/onboarding/Shell'

type Props = {
  onNext: () => void
  onSkip: () => void
}

export function Step1Welcome({ onNext, onSkip }: Props) {
  return (
    <OnboardingShell
      step={1}
      onSkip={onSkip}
      eyebrow="Welcome to PayChecker"
      title="What your pay should be, what it is, and whether the two line up."
      subtitle="Six short screens. No forms yet — we'll just show you how it works."
      footer={
        <div className="flex flex-col gap-2.5">
          <Button variant="primary" block onClick={onNext}>
            Show me how it works
          </Button>
          <Button variant="tertiary" block onClick={onSkip}>
            I already know — let me in
          </Button>
        </div>
      }
    >
      <div className="flex justify-center pb-2.5 pt-5">
        <div className="flex h-[92px] w-[92px] items-center justify-center rounded-3xl bg-pc-navy text-white shadow-[0_8px_20px_rgba(31,58,95,0.25)]">
          <Wallet size={44} strokeWidth={1.5} />
        </div>
      </div>
    </OnboardingShell>
  )
}
