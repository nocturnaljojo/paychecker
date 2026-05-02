import { useCallback, useEffect, useRef, useState } from 'react'
import { useSupabaseClient } from '@/lib/supabase'

/**
 * Sprint M0.5-BUILD-11 — payslip-facts read hook.
 *
 * Reads payslip_facts rows linked to a case via worker RLS. Singleton
 * case-per-upload in M0.5, but the table allows multiple rows per case
 * (e.g., re-extraction history). We surface the LATEST row by
 * extracted_at desc — the freshest extraction is always what the UI
 * cares about.
 *
 * Async extraction handling: when no row exists yet OR the latest row
 * is in 'pending' status, the hook polls every 2.5s for up to 30s. The
 * extraction endpoint normally returns within 5–15s; the cap is a soft
 * timeout so the UI eventually renders the "couldn't read" state if
 * the extract function silently dropped the work.
 *
 * Confirmation: `confirmFact` updates extraction_status='confirmed' +
 * confirmed_at=now(). The DB still enforces
 * payslip_facts_confirmed_integrity (Migration 0009 CHECK): the four
 * core fields (period_start, period_end, gross_pay, net_pay) MUST be
 * non-null. The UI pre-validates and disables [Looks right] when
 * fields are missing — but defence-in-depth, we surface a toast on
 * the rare DB error path.
 */

export type PayslipFactExtractionStatus =
  | 'pending'
  | 'extracted'
  | 'confirmed'
  | 'failed'

export type PayslipFact = {
  id: string
  caseId: string | null
  sourceDocId: string | null
  payDate: string | null
  periodStart: string | null
  periodEnd: string | null
  grossPay: number | null
  netPay: number | null
  superAmount: number | null
  reportedHours: number | null
  hourlyRate: number | null
  taxWithheld: number | null
  extractionStatus: PayslipFactExtractionStatus
  extractedAt: string | null
  confirmedAt: string | null
}

type Row = {
  id: string
  case_id: string | null
  source_doc_id: string | null
  pay_date: string | null
  period_start: string | null
  period_end: string | null
  gross_pay: number | null
  net_pay: number | null
  super_amount: number | null
  ordinary_hours: number | null
  ordinary_rate: number | null
  tax: number | null
  extraction_status: PayslipFactExtractionStatus
  extracted_at: string | null
  confirmed_at: string | null
}

export type UsePayslipFactsState = {
  fact: PayslipFact | null
  isLoading: boolean
  hasError: boolean
  isPolling: boolean
  refetch: () => Promise<void>
  confirmFact: () => Promise<boolean>
}

const POLL_INTERVAL_MS = 2500
const POLL_MAX_MS = 30_000

export function usePayslipFacts(caseId: string | null): UsePayslipFactsState {
  const supabase = useSupabaseClient()
  const [fact, setFact] = useState<PayslipFact | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isPolling, setIsPolling] = useState(false)

  // Track first-fetch timestamp so we can stop polling at the cap even
  // if mountains of re-renders happen.
  const pollStartRef = useRef<number | null>(null)

  const fetchOnce = useCallback(async () => {
    if (!caseId) {
      setFact(null)
      setIsLoading(false)
      setHasError(false)
      return
    }
    const result = await supabase
      .from('payslip_facts')
      .select(
        'id, case_id, source_doc_id, pay_date, period_start, period_end, ' +
          'gross_pay, net_pay, super_amount, ordinary_hours, ordinary_rate, ' +
          'tax, extraction_status, extracted_at, confirmed_at',
      )
      .eq('case_id', caseId)
      .order('extracted_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()
    if (result.error) {
      setHasError(true)
      setIsLoading(false)
      return
    }
    if (!result.data) {
      setFact(null)
      setHasError(false)
      setIsLoading(false)
      return
    }
    const r = result.data as unknown as Row
    setFact({
      id: r.id,
      caseId: r.case_id,
      sourceDocId: r.source_doc_id,
      payDate: r.pay_date,
      periodStart: r.period_start,
      periodEnd: r.period_end,
      grossPay: r.gross_pay,
      netPay: r.net_pay,
      superAmount: r.super_amount,
      reportedHours: r.ordinary_hours,
      hourlyRate: r.ordinary_rate,
      taxWithheld: r.tax,
      extractionStatus: r.extraction_status,
      extractedAt: r.extracted_at,
      confirmedAt: r.confirmed_at,
    })
    setHasError(false)
    setIsLoading(false)
  }, [caseId, supabase])

  useEffect(() => {
    let cancelled = false
    let timer: number | null = null

    async function tick() {
      if (cancelled) return
      await fetchOnce()
      if (cancelled) return
    }

    setIsLoading(true)
    pollStartRef.current = Date.now()
    void tick()

    return () => {
      cancelled = true
      if (timer !== null) window.clearTimeout(timer)
    }
  }, [fetchOnce])

  // Poll while no row OR row is still pending. Stops when extracted /
  // confirmed / failed, or when the soft cap elapses.
  useEffect(() => {
    if (!caseId) {
      setIsPolling(false)
      return
    }
    const shouldPoll =
      fact === null || fact.extractionStatus === 'pending'
    if (!shouldPoll) {
      setIsPolling(false)
      return
    }
    const elapsed = Date.now() - (pollStartRef.current ?? Date.now())
    if (elapsed >= POLL_MAX_MS) {
      setIsPolling(false)
      return
    }
    setIsPolling(true)
    const handle = window.setTimeout(() => {
      void fetchOnce()
    }, POLL_INTERVAL_MS)
    return () => window.clearTimeout(handle)
  }, [caseId, fact, fetchOnce])

  const confirmFact = useCallback(async (): Promise<boolean> => {
    if (!fact) return false
    const result = await supabase
      .from('payslip_facts')
      .update({
        extraction_status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', fact.id)
    if (result.error) {
      return false
    }
    await fetchOnce()
    return true
  }, [fact, supabase, fetchOnce])

  return {
    fact,
    isLoading,
    hasError,
    isPolling,
    refetch: fetchOnce,
    confirmFact,
  }
}
