import { useState, type ReactNode } from 'react'
import { UserButton } from '@clerk/clerk-react'
import {
  FileText,
  Download,
  Calendar,
  Wallet,
  Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

type BucketStatus = 'empty'

type Bucket = {
  key: string
  id: string
  name: string
  desc: string
  Icon: typeof FileText
  primary: string
  capture: string
}

// Mirrors public/design-system/.../YourData.jsx — five worker-facing buckets.
// `id` letters preserve the workflow letter codes (A/B/F/D/E) — F-not-C
// for shifts is intentional per docs/product/workflows.md.
const BUCKETS: Bucket[] = [
  {
    key: 'contract',
    id: 'A',
    name: 'Employment contract',
    desc: 'What your employer promised — hours, rate, classification.',
    Icon: FileText,
    primary: 'Upload contract',
    capture: 'Photo · PDF · manual entry',
  },
  {
    key: 'payslips',
    id: 'B',
    name: 'Payslips',
    desc: 'What your employer says happened each pay cycle.',
    Icon: Download,
    primary: 'Add payslip',
    capture: 'Photo · PDF · forward email',
  },
  {
    key: 'shifts',
    id: 'F',
    name: 'Shifts',
    desc: 'What you say actually happened — logged as you work.',
    Icon: Calendar,
    primary: 'Log a shift',
    capture: 'Logged in-app',
  },
  {
    key: 'super',
    id: 'D',
    name: 'Super fund statements',
    desc: 'Ground truth — what your super fund actually received.',
    Icon: Wallet,
    primary: 'Add statement',
    capture: 'Screenshot · PDF · forward email',
  },
  {
    key: 'bank',
    id: 'E',
    name: 'Bank deposit records',
    desc:
      'Ground truth — what your bank actually received. We only look at employer deposits; the rest is discarded.',
    Icon: Lock,
    primary: 'Add bank record',
    capture: 'Screenshot · PDF · forward email',
  },
]

function StatusPill({ status }: { status: BucketStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium',
        status === 'empty' &&
          'border border-dashed border-pc-border-strong bg-transparent text-pc-text-muted',
      )}
    >
      Empty
    </span>
  )
}

function BucketCard({
  bucket,
  onPrimaryClick,
}: {
  bucket: Bucket
  onPrimaryClick: () => void
}) {
  const { Icon } = bucket
  return (
    <div className="rounded-2xl border border-dashed border-pc-border-strong bg-pc-surface p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pc-border text-pc-text-muted">
          <Icon size={22} strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[15px] font-semibold text-pc-text">
              {bucket.name}
            </div>
            <span className="font-mono text-[11px] font-medium text-[#9B9485]">
              {bucket.id}
            </span>
          </div>
          <p className="mt-1 text-pc-caption leading-snug text-pc-text-muted [text-wrap:pretty]">
            {bucket.desc}
          </p>
        </div>
      </div>

      <div className="mt-3.5">
        <StatusPill status="empty" />
      </div>

      <div className="mt-3.5">
        <Button variant="primary" block onClick={onPrimaryClick}>
          {bucket.primary}
        </Button>
      </div>

      <div className="mt-2.5 font-mono text-[11px] uppercase tracking-[0.05em] text-[#9B9485]">
        {bucket.capture}
      </div>
    </div>
  )
}

function Toast({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-6 mx-auto w-fit max-w-[90vw] rounded-pc-card border border-pc-border bg-pc-text px-4 py-3 text-pc-caption text-white shadow-pc-modal">
      {children}
    </div>
  )
}

function Dashboard() {
  const [toast, setToast] = useState<string | null>(null)

  function comingSoon(label: string) {
    setToast(`${label} — Phase 0, not wired yet`)
    window.setTimeout(() => setToast(null), 2400)
  }

  return (
    <main className="min-h-screen bg-pc-bg text-pc-text">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-pc-border bg-pc-bg px-5 py-3.5">
        <div>
          <div className="text-[13px] font-medium uppercase tracking-widest text-pc-text-muted">
            Your data
          </div>
          <h1 className="mt-0.5 text-pc-h1 font-semibold [text-wrap:pretty]">
            What's in, what's missing.
          </h1>
        </div>
        <UserButton afterSignOutUrl="/" />
      </header>

      <section className="mx-auto max-w-2xl px-5 pb-12 pt-5">
        <p className="text-pc-body text-pc-text-muted [text-wrap:pretty]">
          Five buckets you'll fill over time. Add what you have; we'll guide
          you through the rest. None of these are wired yet — Phase 0 is
          still building out each one.
        </p>

        <div className="mt-6 pl-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-pc-text-muted">
          Your data buckets
        </div>

        <div className="mt-3 flex flex-col gap-3">
          {BUCKETS.map((bucket) => (
            <BucketCard
              key={bucket.key}
              bucket={bucket}
              onPrimaryClick={() => comingSoon(bucket.primary)}
            />
          ))}
        </div>

        <p className="mt-4 px-1 text-center text-[13px] leading-normal text-pc-text-muted [text-wrap:pretty]">
          Add what you have. We'll ask for the rest when it becomes useful.
        </p>
      </section>

      {toast && <Toast>{toast}</Toast>}
    </main>
  )
}

export default Dashboard
