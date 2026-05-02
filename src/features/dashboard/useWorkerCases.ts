import { useEffect, useMemo, useState } from 'react'
import { useSupabaseClient } from '@/lib/supabase'
import type { CaseCompletionStatus } from '@/features/upload/useCaseFeedback'

/**
 * Sprint M0.5-BUILD-02 (ADR-014).
 *
 * Reads ALL document_cases for the signed-in worker, grouped by doc_type,
 * for the dashboard ("Your papers") view. Groups by the same five buckets
 * Dashboard.tsx renders so a count maps cleanly per bucket.
 *
 * This hook DOES NOT mutate state — purely a read. The mutate path
 * (confirm/change) lives in useCaseFeedback (BUILD-01) which is scoped
 * to a single upload batch. Keeping the two concerns separate.
 */

export type BucketKey =
  | 'contract'
  | 'payslips'
  | 'shifts'
  | 'super'
  | 'bank'

type CaseRow = {
  case_id: string
  doc_type: string | null
  completion_status: CaseCompletionStatus
  created_at: string
  updated_at: string
}

export type WorkerCase = {
  caseId: string
  docType: string | null
  bucketKey: BucketKey | 'other'
  completionStatus: CaseCompletionStatus
  createdAt: string
  updatedAt: string
}

export type CountByBucket = Record<BucketKey, number>

export type WorkerCasesState = {
  cases: WorkerCase[]
  countByBucket: CountByBucket
  totalCases: number
  readyCount: number       // 'suggested' + 'confirmed' + 'partial' + 'complete'
  confirmedCount: number   // 'confirmed' + 'partial' + 'complete'
  isLoading: boolean
  hasError: boolean
}

const EMPTY_COUNT: CountByBucket = {
  contract: 0,
  payslips: 0,
  shifts: 0,
  super: 0,
  bank: 0,
}

// Maps the api/classify.ts detected_type values onto dashboard bucket keys.
// `other` is intentionally NOT mapped — orphan cases live there until the
// worker overrides the label (M0.5-BUILD-02/03 ships override; today they
// just don't count toward any bucket).
function bucketKeyForDocType(docType: string | null): BucketKey | 'other' {
  switch ((docType ?? '').toLowerCase()) {
    case 'contract':
      return 'contract'
    case 'payslip':
      return 'payslips'
    case 'shift':
      return 'shifts'
    case 'super_statement':
      return 'super'
    case 'bank_export':
      return 'bank'
    default:
      return 'other'
  }
}

export function useWorkerCases(): WorkerCasesState {
  const supabase = useSupabaseClient()
  const [rows, setRows] = useState<CaseRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setIsLoading(true)
      setHasError(false)
      const result = await supabase
        .from('document_cases')
        .select('case_id, doc_type, completion_status, created_at, updated_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (result.error) {
        setRows([])
        setIsLoading(false)
        setHasError(true)
        return
      }
      setRows((result.data ?? []) as CaseRow[])
      setIsLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  const state = useMemo<WorkerCasesState>(() => {
    const cases: WorkerCase[] = rows.map((r) => ({
      caseId: r.case_id,
      docType: r.doc_type,
      bucketKey: bucketKeyForDocType(r.doc_type),
      completionStatus: r.completion_status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))

    const countByBucket: CountByBucket = { ...EMPTY_COUNT }
    let readyCount = 0
    let confirmedCount = 0
    for (const c of cases) {
      // 'draft' rows aren't surfaced as ready — they're pre-classification.
      const isReady = c.completionStatus !== 'draft'
      const isConfirmed =
        c.completionStatus === 'confirmed' ||
        c.completionStatus === 'partial' ||
        c.completionStatus === 'complete'
      if (isReady) readyCount += 1
      if (isConfirmed) confirmedCount += 1
      if (c.bucketKey !== 'other') {
        countByBucket[c.bucketKey] += 1
      }
    }

    return {
      cases,
      countByBucket,
      totalCases: cases.length,
      readyCount,
      confirmedCount,
      isLoading,
      hasError,
    }
  }, [rows, isLoading, hasError])

  return state
}

/**
 * Suggested-next-step computation. Returns null when worker has all 5
 * basics covered (or when zero cases — we let the empty-state hero
 * carry that copy).
 */
export function nextStepFor(countByBucket: CountByBucket): string | null {
  const total = Object.values(countByBucket).reduce((s, n) => s + n, 0)
  if (total === 0) return null

  const order: { key: BucketKey; copy: string }[] = [
    { key: 'contract', copy: 'Next: Add your contract' },
    { key: 'payslips', copy: 'Next: Add a payslip' },
    { key: 'bank', copy: 'Next: Add a bank deposit' },
    { key: 'super', copy: 'Next: Add a super statement' },
    { key: 'shifts', copy: 'Next: Add a shift roster' },
  ]
  for (const step of order) {
    if (countByBucket[step.key] === 0) return step.copy
  }
  return "You've got the basics. Add more to make checks stronger."
}

/**
 * Worker-facing label for the bucket "type badge" row at the top of the
 * dashboard ("✔ Contract", "✔ Payslip", …). Capitalised, singular per
 * vocabulary lock; never raw doc_type tokens.
 */
export function bucketBadgeLabel(key: BucketKey): string {
  switch (key) {
    case 'contract':
      return 'Contract'
    case 'payslips':
      return 'Payslip'
    case 'shifts':
      return 'Shift'
    case 'super':
      return 'Super'
    case 'bank':
      return 'Bank'
  }
}
