import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export const ONB_TOTAL = 6

type ProgressProps = { current: number; total?: number }

function Progress({ current, total = ONB_TOTAL }: ProgressProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const stepIndex = i + 1
        const state =
          stepIndex === current
            ? 'current'
            : stepIndex < current
              ? 'past'
              : 'future'
        return (
          <span
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all duration-200 ease-out',
              state === 'current' && 'w-5 bg-pc-navy',
              state === 'past' && 'w-1.5 bg-pc-navy/45',
              state === 'future' && 'w-1.5 bg-pc-border-strong',
            )}
          />
        )
      })}
      <span className="ml-1 text-pc-micro text-pc-text-muted font-medium">
        {current} of {total}
      </span>
    </div>
  )
}

type TopBarProps = {
  step: number
  onBack?: () => void
  onSkip?: () => void
}

function TopBar({ step, onBack, onSkip }: TopBarProps) {
  return (
    <div className="sticky top-0 z-10 grid h-14 grid-cols-[48px_1fr_auto] items-center bg-pc-bg border-b border-pc-border px-2">
      <div>
        {onBack ? (
          <button
            type="button"
            aria-label="Back"
            onClick={onBack}
            className="flex h-12 w-12 items-center justify-center text-pc-text hover:text-pc-navy"
          >
            <ChevronLeft size={22} strokeWidth={1.75} />
          </button>
        ) : null}
      </div>
      <div className="flex justify-center">
        <Progress current={step} />
      </div>
      <div className="pr-2">
        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className="px-1.5 py-2.5 text-pc-caption font-medium text-pc-text-muted hover:text-pc-text"
          >
            Skip
          </button>
        ) : null}
      </div>
    </div>
  )
}

type ShellProps = {
  step: number
  onBack?: () => void
  onSkip?: () => void
  eyebrow?: ReactNode
  title?: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer: ReactNode
}

export function OnboardingShell({
  step,
  onBack,
  onSkip,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: ShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-pc-bg">
      <TopBar step={step} onBack={onBack} onSkip={onSkip} />
      <div className="flex-1 overflow-auto px-6 pb-4 pt-5">
        {eyebrow && (
          <div className="mb-2.5 font-mono text-[11px] font-medium uppercase tracking-widest text-pc-text-muted">
            {eyebrow}
          </div>
        )}
        {title && (
          <h1 className="text-[26px] font-semibold leading-tight text-pc-text [text-wrap:pretty]">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="mt-2.5 text-pc-body leading-normal text-pc-text-muted [text-wrap:pretty]">
            {subtitle}
          </p>
        )}
        <div className="mt-5">{children}</div>
      </div>
      <div className="border-t border-pc-border bg-pc-bg px-5 pb-6 pt-3">
        {footer}
      </div>
    </div>
  )
}

type IconTone = 'navy' | 'sage' | 'amber' | 'coral'

const toneClasses: Record<IconTone, string> = {
  navy: 'bg-pc-navy-soft text-pc-navy',
  sage: 'bg-pc-sage-soft text-pc-sage',
  amber: 'bg-pc-amber-soft text-[#7A5A1E]',
  coral: 'bg-pc-coral-soft text-[#7A3B33]',
}

export function IconTile({
  children,
  tone = 'navy',
  size = 11,
}: {
  children: ReactNode
  tone?: IconTone
  size?: 9 | 11
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl',
        size === 11 ? 'h-11 w-11' : 'h-9 w-9',
        toneClasses[tone],
      )}
    >
      {children}
    </div>
  )
}

export function InfoCard({
  icon,
  tone,
  title,
  body,
}: {
  icon: ReactNode
  tone: IconTone
  title: ReactNode
  body: ReactNode
}) {
  return (
    <div className="flex items-start gap-3.5 rounded-2xl border border-pc-border bg-pc-surface p-4">
      <IconTile tone={tone}>{icon}</IconTile>
      <div className="flex-1">
        <div className="text-[15px] font-semibold text-pc-text">{title}</div>
        <div className="mt-0.5 text-pc-caption leading-snug text-pc-text-muted [text-wrap:pretty]">
          {body}
        </div>
      </div>
    </div>
  )
}
