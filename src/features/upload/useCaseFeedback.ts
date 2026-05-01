import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSupabaseClient } from '@/lib/supabase'

/**
 * Sprint M0.5-BUILD-01 (ADR-014).
 *
 * Reads document_cases linked to a freshly-classified upload batch via RLS
 * (worker SELECT own; worker UPDATE own). Provides the [Looks right] action
 * that flips a case from `suggested` → `confirmed` without going through
 * the server — the RLS policy gates the write.
 *
 * Why this hook exists separately from useClassifyBatch: classify is the
 * server pipeline (Anthropic → document_classifications → case via RPC).
 * Case feedback is the client-side reflection — what cases got created
 * for THIS batch, plus the worker's running ready-count. Mixing them in
 * one hook would couple two concerns.
 */

export type CaseCompletionStatus =
  | 'draft'
  | 'suggested'
  | 'confirmed'
  | 'partial'
  | 'complete'

export type CaseEntry = {
  caseId: string
  documentId: string
  docType: string | null
  completionStatus: CaseCompletionStatus
}

type DocumentRow = {
  id: string
  case_id: string | null
}

type CaseRow = {
  case_id: string
  doc_type: string | null
  completion_status: CaseCompletionStatus
}

export function useCaseFeedback(documentIds: ReadonlyArray<string>) {
  const supabase = useSupabaseClient()
  const [cases, setCases] = useState<CaseEntry[]>([])
  const [readyCount, setReadyCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)

  // Stable cache key — array identity changes every render, sorted string
  // doesn't until the underlying ID set actually changes.
  const idKey = useMemo(
    () => (documentIds.length === 0 ? '' : [...documentIds].sort().join(',')),
    [documentIds],
  )

  const refetchReadyCount = useCallback(async () => {
    const { count, error } = await supabase
      .from('document_cases')
      .select('case_id', { count: 'exact', head: true })
      .in('completion_status', ['suggested', 'confirmed'])
    if (!error && typeof count === 'number') {
      setReadyCount(count)
    }
  }, [supabase])

  // Fetch case entries for this batch + the worker-wide ready count.
  useEffect(() => {
    let cancelled = false
    if (!idKey) {
      setCases([])
      setReadyCount(0)
      return
    }
    void (async () => {
      setIsLoading(true)
      const ids = idKey.split(',')

      // Step 1 — read documents.case_id for the batch.
      const docResult = await supabase
        .from('documents')
        .select('id, case_id')
        .in('id', ids)
      if (cancelled) return
      if (docResult.error) {
        // RLS on documents already protects scope. Failure here means we
        // can't surface case feedback for the batch — leave UI in fallback.
        setCases([])
        setIsLoading(false)
        return
      }

      const docRows = (docResult.data ?? []) as DocumentRow[]
      const docToCase = new Map<string, string>()
      const caseIds: string[] = []
      for (const r of docRows) {
        if (r.case_id) {
          docToCase.set(r.id, r.case_id)
          caseIds.push(r.case_id)
        }
      }

      if (caseIds.length === 0) {
        setCases([])
        setIsLoading(false)
        await refetchReadyCount()
        return
      }

      // Step 2 — read the cases.
      const caseResult = await supabase
        .from('document_cases')
        .select('case_id, doc_type, completion_status')
        .in('case_id', caseIds)
      if (cancelled) return
      if (caseResult.error) {
        setCases([])
        setIsLoading(false)
        return
      }
      const caseRows = (caseResult.data ?? []) as CaseRow[]
      const caseById = new Map(caseRows.map((c) => [c.case_id, c]))

      const merged: CaseEntry[] = docRows
        .filter((r) => r.case_id)
        .map((r): CaseEntry | null => {
          const c = caseById.get(r.case_id!)
          if (!c) return null
          return {
            caseId: c.case_id,
            documentId: r.id,
            docType: c.doc_type,
            completionStatus: c.completion_status,
          }
        })
        .filter((c): c is CaseEntry => c !== null)

      setCases(merged)
      setIsLoading(false)
      await refetchReadyCount()
    })()
    return () => {
      cancelled = true
    }
  }, [idKey, supabase, refetchReadyCount])

  // [Looks right] — flip status to 'confirmed' via RLS-protected update.
  const confirmCase = useCallback(
    async (caseId: string): Promise<boolean> => {
      const result = await supabase
        .from('document_cases')
        .update({ completion_status: 'confirmed' })
        .eq('case_id', caseId)
      if (result.error) return false
      setCases((prev) =>
        prev.map((c) =>
          c.caseId === caseId ? { ...c, completionStatus: 'confirmed' } : c,
        ),
      )
      // Ready count unchanged (suggested + confirmed both count) but refresh
      // anyway in case other tabs/windows changed state.
      await refetchReadyCount()
      return true
    },
    [supabase, refetchReadyCount],
  )

  return { cases, readyCount, isLoading, confirmCase }
}

/**
 * Worker-facing display label for a doc_type. The detected_type values
 * are lowercase tokens (payslip / contract / super_statement / bank_export
 * / shift / other). Per the M0.5 vocabulary, we render them title-cased
 * with the underscore types collapsed to single words ("Super", "Bank").
 */
export function formatDocTypeLabel(docType: string | null | undefined): string {
  switch ((docType ?? '').toLowerCase()) {
    case 'payslip':
      return 'Payslip'
    case 'contract':
      return 'Contract'
    case 'super_statement':
      return 'Super'
    case 'bank_export':
      return 'Bank'
    case 'shift':
      return 'Time sheet'
    case 'other':
      return 'Other'
    default:
      return 'Other'
  }
}
