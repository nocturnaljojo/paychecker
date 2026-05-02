import { useCallback, useEffect, useState } from 'react'
import { useSupabaseClient } from '@/lib/supabase'
import type { CaseCompletionStatus } from '@/features/upload/useCaseFeedback'

/**
 * Sprint M0.5-BUILD-04 (ADR-014).
 *
 * Reads ALL document_cases for the signed-in worker plus the page count
 * per case (from documents.case_id). Used by the /cases route ("Your
 * papers") to render a flat list the worker can navigate back to and
 * edit.
 *
 * This hook is the read-write surface for the worker's full case
 * history. It deliberately overlaps with useWorkerCases (BUILD-02
 * dashboard summary) and useCaseFeedback (BUILD-01 batch-scoped
 * upload feedback) — different scopes, different concerns:
 *
 *   useCaseFeedback: cases for the in-flight upload batch only
 *   useWorkerCases:  count summaries + bucket grouping for dashboard
 *   useAllCases:     flat list w/ page counts + mutations for /cases
 *
 * The mutation surface (`updateCaseLabel`) mirrors the BUILD-03
 * optimistic-UI pattern: snapshot → paint → RPC → revert on failure.
 * Per ChatGPT critique 2026-05-01 round 3, this is the meta-fix that
 * makes misclassifications recoverable — workers can navigate back
 * here and re-label any case at any time.
 */

export type CaseListEntry = {
  caseId: string
  docType: string | null
  completionStatus: CaseCompletionStatus
  pageCount: number
  createdAt: string
  updatedAt: string
}

type CaseRow = {
  case_id: string
  doc_type: string | null
  completion_status: CaseCompletionStatus
  created_at: string
  updated_at: string
}

type DocumentRow = {
  case_id: string | null
}

export type UseAllCasesState = {
  cases: CaseListEntry[]
  isLoading: boolean
  hasError: boolean
  refetch: () => Promise<void>
  updateCaseLabel: (caseId: string, newDocType: string) => Promise<boolean>
  softDeleteCase: (caseId: string) => Promise<boolean>
}

export function useAllCases(): UseAllCasesState {
  const supabase = useSupabaseClient()
  const [cases, setCases] = useState<CaseListEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    setHasError(false)
    // Required filter — Migration 0020 dropped `deleted_at IS NULL`
    // from `document_cases_select_own.qual` because the RLS clause
    // failed UPDATE attempts that mutated `deleted_at` (the post-
    // UPDATE row no longer satisfied SELECT-USING; ISS-016). From
    // 0020 onwards every list query against `document_cases` carries
    // `.is('deleted_at', null)` at the application layer — no
    // exceptions, even where the filter is logically redundant.
    const caseResult = await supabase
      .from('document_cases')
      .select('case_id, doc_type, completion_status, created_at, updated_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (caseResult.error) {
      setCases([])
      setIsLoading(false)
      setHasError(true)
      return
    }
    const caseRows = (caseResult.data ?? []) as CaseRow[]
    if (caseRows.length === 0) {
      setCases([])
      setIsLoading(false)
      return
    }

    // One round-trip for the page counts. We could pull these per-case
    // (N round-trips) but a single SELECT keyed on case_id IN (...) is
    // both simpler and more accurate against the live DB — page count
    // is the truth source per ChatGPT critique 2026-05-01 round 2 #2.
    const ids = caseRows.map((r) => r.case_id)
    const docResult = await supabase
      .from('documents')
      .select('case_id')
      .in('case_id', ids)
    const counts = new Map<string, number>()
    if (!docResult.error) {
      for (const r of (docResult.data ?? []) as DocumentRow[]) {
        if (!r.case_id) continue
        counts.set(r.case_id, (counts.get(r.case_id) ?? 0) + 1)
      }
    }

    const entries: CaseListEntry[] = caseRows.map((r) => ({
      caseId: r.case_id,
      docType: r.doc_type,
      completionStatus: r.completion_status,
      pageCount: counts.get(r.case_id) ?? 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))
    setCases(entries)
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await fetchAll()
      if (cancelled) return
    })()
    return () => {
      cancelled = true
    }
  }, [fetchAll])

  // Optimistic UI per ChatGPT 2026-05-01 round 1 #2 (BUILD-03 pattern).
  // Snapshot → paint → RPC → revert + return false on failure. Caller
  // surfaces the toast.
  const updateCaseLabel = useCallback(
    async (caseId: string, newDocType: string): Promise<boolean> => {
      const snapshot = cases.find((c) => c.caseId === caseId)
      if (!snapshot) return false

      setCases((prev) =>
        prev.map((c) =>
          c.caseId === caseId
            ? { ...c, docType: newDocType, completionStatus: 'confirmed' }
            : c,
        ),
      )

      const result = await supabase
        .from('document_cases')
        .update({ doc_type: newDocType, completion_status: 'confirmed' })
        .eq('case_id', caseId)

      if (result.error) {
        setCases((prev) =>
          prev.map((c) => (c.caseId === caseId ? snapshot : c)),
        )
        return false
      }
      return true
    },
    [supabase, cases],
  )

  // Soft delete (APP 11.2). Optimistic UI mirrors updateCaseLabel:
  // snapshot the local list, remove the row immediately, fire the
  // UPDATE, restore on failure. After 012A.1 / Migration 0020 the
  // DB SELECT policy no longer filters `deleted_at`; the row is
  // hidden from refetches by the application-layer filter at the
  // SELECT chain above. The local removal just makes the UX instant.
  //
  // Storage object is deliberately left in place per Session 012A
  // hard-stop. Hard-delete cron is separate work.
  const softDeleteCase = useCallback(
    async (caseId: string): Promise<boolean> => {
      const snapshot = cases
      setCases((prev) => prev.filter((c) => c.caseId !== caseId))

      const result = await supabase
        .from('document_cases')
        .update({ deleted_at: new Date().toISOString() })
        .eq('case_id', caseId)

      if (result.error) {
        setCases(snapshot)
        return false
      }
      return true
    },
    [supabase, cases],
  )

  return {
    cases,
    isLoading,
    hasError,
    refetch: fetchAll,
    updateCaseLabel,
    softDeleteCase,
  }
}
