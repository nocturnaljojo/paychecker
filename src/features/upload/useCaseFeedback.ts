import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSupabaseClient } from '@/lib/supabase'
import { docTypeLabel } from '@/features/cases/vocabulary'

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

  // [Change → pick label] — overrides doc_type AND flips to 'confirmed'.
  // Sprint M0.5-BUILD-03. OPTIMISTIC UI per ChatGPT Round 1 finding 2:
  //   1. Snapshot the current case state in case we need to revert.
  //   2. Update local state IMMEDIATELY (UI reflects new label instantly).
  //   3. Fire the RLS-protected RPC in the background.
  //   4. On failure: restore from snapshot. Caller surfaces the toast.
  // The owner (CaseCard) is responsible for closing the modal before
  // calling this — that's what makes it feel optimistic. The revert
  // path is silent until the toast appears.
  const updateCaseLabel = useCallback(
    async (caseId: string, newDocType: string): Promise<boolean> => {
      const snapshot = cases.find((c) => c.caseId === caseId)
      if (!snapshot) return false

      // Optimistic: paint the new state first.
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
        // Revert.
        setCases((prev) =>
          prev.map((c) => (c.caseId === caseId ? snapshot : c)),
        )
        return false
      }

      await refetchReadyCount()
      return true
    },
    [supabase, cases, refetchReadyCount],
  )

  return { cases, readyCount, isLoading, confirmCase, updateCaseLabel }
}

/**
 * Re-export from src/features/cases/vocabulary.ts. Sprint M0.5-BUILD-03
 * promoted the type-label mapping out of this hook so the dashboard,
 * upload zone, and override modal share one source of truth.
 *
 * Kept as a re-export for backward compat with existing imports
 * (UploadZone.tsx + useWorkerCases.ts both reference it).
 */
export const formatDocTypeLabel = docTypeLabel
