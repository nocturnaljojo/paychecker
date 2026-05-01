import { useNavigate } from 'react-router-dom'
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
import {
  useWorkerCases,
  nextStepFor,
  bucketBadgeLabel,
  type BucketKey,
} from '@/features/dashboard/useWorkerCases'
import { AttentionPanel } from '@/features/dashboard/AttentionPanel'
import { IdentityIndicator } from '@/components/IdentityIndicator'

type Bucket = {
  key: BucketKey
  name: string
  desc: string
  Icon: typeof FileText
  emptyAction: string
  capture: string
}

// Five worker-facing buckets, named per ratified M0.5 vocabulary
// (docs/document-case-paradigm-v01.md + ChatGPT critique 2026-05-01).
// Letter labels (A/B/F/D/E) and "Ground truth" / "manual entry" /
// "forward email" jargon retired in Sprint M0.5-BUILD-02.
const BUCKETS: Bucket[] = [
  {
    key: 'contract',
    name: 'Contract',
    desc: 'What your employer promised — hours, rate, classification.',
    Icon: FileText,
    emptyAction: 'Add contract',
    capture: 'Photo · PDF · or type it in',
  },
  {
    key: 'payslips',
    name: 'Payslips',
    desc: 'What your employer says happened each pay cycle.',
    Icon: Download,
    emptyAction: 'Add payslip',
    capture: 'Photo · PDF · or send by email',
  },
  {
    key: 'shifts',
    name: 'Shifts',
    desc: 'What you say actually happened — logged as you work.',
    Icon: Calendar,
    emptyAction: 'Log a shift',
    capture: 'Logged in-app',
  },
  {
    key: 'super',
    name: 'Super',
    desc: 'What your super fund actually received.',
    Icon: Wallet,
    emptyAction: 'Add statement',
    capture: 'Screenshot · PDF · or send by email',
  },
  {
    key: 'bank',
    name: 'Bank deposits',
    desc: 'What your bank actually received. We only look at employer deposits; the rest is discarded.',
    Icon: Lock,
    emptyAction: 'Add bank record',
    capture: 'Screenshot · PDF · or send by email',
  },
]

function BucketStatusPill({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium',
          'border border-dashed border-pc-border-strong bg-transparent text-pc-text-muted',
        )}
      >
        Nothing yet
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium',
        'bg-pc-sage-soft text-pc-sage',
      )}
    >
      ✔ {count} added
    </span>
  )
}

function BucketCard({
  bucket,
  count,
  onAdd,
}: {
  bucket: Bucket
  count: number
  onAdd: () => void
}) {
  const { Icon } = bucket
  const hasCases = count > 0
  const action = hasCases ? `Add another ${bucket.name.toLowerCase()}` : bucket.emptyAction

  return (
    <div
      className={cn(
        'rounded-2xl bg-pc-surface p-4',
        hasCases
          ? 'border border-pc-border'
          : 'border border-dashed border-pc-border-strong',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            hasCases
              ? 'bg-pc-sage-soft text-pc-sage'
              : 'bg-pc-border text-pc-text-muted',
          )}
        >
          <Icon size={22} strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-pc-text">
            {bucket.name}
          </div>
          <p className="mt-1 text-pc-caption leading-snug text-pc-text-muted [text-wrap:pretty]">
            {bucket.desc}
          </p>
        </div>
      </div>

      <div className="mt-3.5">
        <BucketStatusPill count={count} />
      </div>

      <div className="mt-3.5">
        <Button variant={hasCases ? 'secondary' : 'primary'} block onClick={onAdd}>
          {action}
        </Button>
      </div>

      <div className="mt-2.5 font-mono text-[11px] uppercase tracking-[0.05em] text-[#9B9485]">
        {bucket.capture}
      </div>
    </div>
  )
}

function Dashboard() {
  const navigate = useNavigate()
  const workerCases = useWorkerCases()
  const { countByBucket, readyCount, totalCases, isLoading } = workerCases

  const nextStep = nextStepFor(countByBucket)
  const hasAnyCases = totalCases > 0
  const presentBuckets: BucketKey[] = (Object.entries(countByBucket) as [
    BucketKey,
    number,
  ][])
    .filter(([, n]) => n > 0)
    .map(([k]) => k)

  function handleBucketTap(bucket: Bucket) {
    // Every bucket routes through the upload flow; the worker takes a
    // photo or picks a file, the classifier suggests a doc_type, and
    // the worker confirms or overrides per ADR-014. The query string
    // is a hint for future filtering — UploadZone doesn't act on it
    // yet.
    navigate(`/upload?bucket=${bucket.key}`)
  }

  return (
    <main className="min-h-screen bg-pc-bg text-pc-text">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-pc-border bg-pc-bg px-5 py-3.5">
        <button
          type="button"
          onClick={() => hasAnyCases && navigate('/cases')}
          disabled={!hasAnyCases}
          className={cn(
            'text-left',
            hasAnyCases &&
              'group cursor-pointer transition-colors hover:opacity-80',
          )}
        >
          <div className="text-[13px] font-medium uppercase tracking-widest text-pc-text-muted">
            Your papers
            {hasAnyCases && (
              <span
                aria-hidden="true"
                className="ml-1 text-pc-text-muted group-hover:text-pc-text"
              >
                ›
              </span>
            )}
          </div>
          <h1 className="mt-0.5 text-pc-h1 font-semibold [text-wrap:pretty]">
            {hasAnyCases
              ? readyCount === 1
                ? '1 paper ready'
                : `${readyCount} papers ready`
              : 'Get started by adding a paper'}
          </h1>
        </button>
        <UserButton afterSignOutUrl="/" />
      </header>

      <section className="mx-auto max-w-2xl px-5 pb-12 pt-5">
        <IdentityIndicator className="mb-3" />
        <AttentionPanel workerCases={workerCases} nextStep={nextStep} />

        {hasAnyCases && presentBuckets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {presentBuckets.map((key) => (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 rounded-full bg-pc-sage-soft px-3 py-1 text-pc-caption text-pc-sage"
              >
                ✔ {bucketBadgeLabel(key)}
              </span>
            ))}
          </div>
        )}

        {!hasAnyCases && !isLoading && (
          <p className="mt-2 text-pc-body text-pc-text-muted [text-wrap:pretty]">
            Five buckets you'll fill over time. Add what you have; we'll guide
            you through the rest.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {BUCKETS.map((bucket) => (
            <BucketCard
              key={bucket.key}
              bucket={bucket}
              count={countByBucket[bucket.key]}
              onAdd={() => handleBucketTap(bucket)}
            />
          ))}
        </div>

        <p className="mt-6 px-1 text-center text-[13px] leading-normal text-pc-text-muted [text-wrap:pretty]">
          {hasAnyCases
            ? "You're getting started — nice work."
            : "We'll guide you step by step."}
        </p>
      </section>
    </main>
  )
}

export default Dashboard
