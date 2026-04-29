import { useCallback, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'

// Client mirror of api/classify.ts response shape. Kept in sync by hand;
// drift surfaces when the response decoder fails. We do NOT import the
// types from api/ because that would couple the client bundle to
// server-only code (and risk pulling Anthropic-SDK imports across the
// security boundary). The boundary is enforced by an import grep in
// the verify step — see Sprint B2 daily log for the canonical check.
export type ClassifyStatus =
  | 'idle'
  | 'reading'
  | 'auto_routed'
  | 'review_pending'
  | 'failed'

export type ClassifyEntry = {
  documentId: string
  status: ClassifyStatus
  detectedType?: string
  classificationId?: string
  reason?: string
}

type ClassifyResponse =
  | {
      status: 'auto_routed' | 'review_pending'
      document_id: string
      detected_type: string
      doc_type: string
      classification_id: string
    }
  | {
      status: 'failed'
      document_id: string
      reason: string
    }

const CONCURRENCY = 3

/**
 * Client hook for the classify pipeline step. The only thing this file
 * does network-wise is `fetch('/api/classify')` with the Clerk JWT in
 * an Authorization header. All Anthropic SDK + service-role Supabase
 * calls happen server-side in api/classify.ts.
 */
export function useClassifyBatch() {
  const { getToken } = useAuth()
  const [entries, setEntries] = useState<ClassifyEntry[]>([])

  const classifyBatch = useCallback(
    async (documentIds: string[]) => {
      if (documentIds.length === 0) return

      // Seed local state in 'reading' status so the UI can show a spinner
      // for each pending classification call.
      setEntries((prev) => {
        const next = new Map(prev.map((e) => [e.documentId, e]))
        for (const id of documentIds) {
          next.set(id, { documentId: id, status: 'reading' })
        }
        return Array.from(next.values())
      })

      const token = await getToken()
      if (!token) {
        markAllFailed(documentIds, 'Sign-in expired — please reload', setEntries)
        return
      }

      const queue = [...documentIds]
      const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () =>
        worker(),
      )

      async function worker() {
        while (queue.length > 0) {
          const id = queue.shift()
          if (!id) return
          await classifyOne(id, token!, setEntries)
        }
      }

      await Promise.all(workers)
    },
    [getToken],
  )

  const reset = useCallback(() => {
    setEntries([])
  }, [])

  return {
    entries,
    classifyBatch,
    reset,
  }
}

async function classifyOne(
  documentId: string,
  token: string,
  setEntries: React.Dispatch<React.SetStateAction<ClassifyEntry[]>>,
) {
  try {
    const response = await fetch('/api/classify', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ document_id: documentId }),
    })
    if (!response.ok) {
      const errBody = (await safeJson(response)) as { error?: string } | null
      updateEntry(setEntries, documentId, {
        status: 'failed',
        reason: errBody?.error ?? `Classify failed (${response.status})`,
      })
      return
    }
    const body = (await response.json()) as ClassifyResponse
    if (body.status === 'failed') {
      updateEntry(setEntries, documentId, {
        status: 'failed',
        reason: body.reason,
      })
      return
    }
    updateEntry(setEntries, documentId, {
      status: body.status,
      detectedType: body.detected_type,
      classificationId: body.classification_id,
    })
  } catch (err) {
    updateEntry(setEntries, documentId, {
      status: 'failed',
      reason: err instanceof Error ? err.message : String(err),
    })
  }
}

function updateEntry(
  setEntries: React.Dispatch<React.SetStateAction<ClassifyEntry[]>>,
  documentId: string,
  patch: Partial<ClassifyEntry>,
) {
  setEntries((prev) =>
    prev.map((e) => (e.documentId === documentId ? { ...e, ...patch } : e)),
  )
}

function markAllFailed(
  documentIds: string[],
  reason: string,
  setEntries: React.Dispatch<React.SetStateAction<ClassifyEntry[]>>,
) {
  setEntries((prev) => {
    const set = new Set(documentIds)
    return prev.map((e) =>
      set.has(e.documentId) ? { ...e, status: 'failed', reason } : e,
    )
  })
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}
