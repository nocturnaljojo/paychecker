import { FileText, Download, Calendar, Wallet, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { OnboardingShell, IconTile } from '@/features/onboarding/Shell'

type Props = {
  onBack: () => void
  onNext: () => void
  onSkip: () => void
}

const items = [
  {
    Icon: FileText,
    title: 'Your employment contract',
    body: 'Or an offer letter. Tells us what was promised.',
  },
  {
    Icon: Download,
    title: 'Your payslips',
    body: 'One each pay cycle. Photo, PDF, or forward the email.',
  },
  {
    Icon: Calendar,
    title: 'Your shifts',
    body: 'Log them in the app as you work.',
  },
  {
    Icon: Wallet,
    title: 'Your super fund statements',
    body: 'Add them when you get them — usually each quarter.',
  },
  {
    Icon: Lock,
    title: 'Your bank deposit records',
    body: 'Only when we need to check a payment actually arrived.',
  },
]

export function Step3Share({ onBack, onNext, onSkip }: Props) {
  return (
    <OnboardingShell
      step={3}
      onBack={onBack}
      onSkip={onSkip}
      eyebrow="What you'll share"
      title="Five things, over time."
      subtitle="You don't need all of this now. Add what you have; we'll guide you through the rest."
      footer={
        <Button variant="primary" block onClick={onNext}>
          Continue
        </Button>
      }
    >
      <div className="flex flex-col gap-2.5">
        {items.map(({ Icon, title, body }, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-pc-border bg-pc-surface px-3.5 py-3"
          >
            <IconTile tone="navy">
              <Icon size={22} strokeWidth={1.75} />
            </IconTile>
            <div className="flex-1">
              <div className="text-pc-caption font-medium text-pc-text">
                {title}
              </div>
              <div className="mt-0.5 text-[13px] leading-snug text-pc-text-muted">
                {body}
              </div>
            </div>
          </div>
        ))}
      </div>
    </OnboardingShell>
  )
}
