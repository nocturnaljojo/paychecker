import { useCallback, useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useSupabaseClient } from '@/lib/supabase'
import { ensureWorker, uploadDocument } from '@/lib/upload'
import { generateBatchId, validateFile } from './uploadHelpers'

export type FileStatus =
  | 'pending'
  | 'uploading'
  | 'uploaded'
  | 'duplicate'
  | 'failed'

export type FileEntry = {
  id: string
  file: File
  status: FileStatus
  documentId?: string
  existingDocumentId?: string
  error?: string
}

export type UploadBatchState = {
  workerId: string | null
  batchId: string | null
  files: FileEntry[]
  isResolvingWorker: boolean
  workerError: string | null
}

export function useUploadBatch() {
  const { user } = useUser()
  const supabase = useSupabaseClient()

  const [state, setState] = useState<UploadBatchState>({
    workerId: null,
    batchId: null,
    files: [],
    isResolvingWorker: true,
    workerError: null,
  })

  // refs let async upload tasks read the latest worker/batch ids without
  // re-creating callbacks on every state change.
  const workerIdRef = useRef<string | null>(null)
  const batchIdRef = useRef<string | null>(null)

  // Mount: resolve workers.id from Clerk user (mirrors Sprint 7's pattern).
  useEffect(() => {
    let cancelled = false
    if (!user) return

    async function resolve() {
      try {
        const workerId = await ensureWorker(supabase, user!.id)
        if (cancelled) return
        workerIdRef.current = workerId
        setState((prev) => ({
          ...prev,
          workerId,
          isResolvingWorker: false,
        }))
      } catch (err) {
        if (cancelled) return
        setState((prev) => ({
          ...prev,
          isResolvingWorker: false,
          workerError: err instanceof Error ? err.message : String(err),
        }))
      }
    }
    void resolve()
    return () => {
      cancelled = true
    }
  }, [user, supabase])

  /**
   * Add files to the current batch. Files that fail pre-flight validation
   * land in 'failed' state immediately; valid files are queued as 'pending'
   * and processed by startUpload().
   *
   * First call to addFiles in a session generates a fresh batch_id; all
   * subsequent files added before reset() share the same batch_id.
   */
  const addFiles = useCallback((files: File[]) => {
    if (files.length === 0) return
    setState((prev) => {
      const nextBatchId = prev.batchId ?? generateBatchId()
      batchIdRef.current = nextBatchId

      const entries: FileEntry[] = files.map((file) => {
        const validationError = validateFile(file)
        return {
          id: crypto.randomUUID(),
          file,
          status: validationError ? 'failed' : 'pending',
          error: validationError ?? undefined,
        }
      })

      return {
        ...prev,
        batchId: nextBatchId,
        files: [...prev.files, ...entries],
      }
    })
  }, [])

  /**
   * Process all 'pending' files in the batch. Per-file calls run in parallel
   * (up to a small concurrency cap) — each transitions through
   *   pending → uploading → (uploaded | duplicate | failed)
   * with no byte-level progress (status only).
   */
  const startUpload = useCallback(async () => {
    const workerId = workerIdRef.current
    const batchId = batchIdRef.current

    // Worker resolution didn't complete (RLS denied, network, etc).
    // Fail every queued 'pending' file loudly so the UI flips from
    // "Waiting" to "Couldn't read" instead of hanging silently — closes
    // ISS-005. The workerError banner above the drop zone explains the
    // root cause; this just stops the row pill from getting stuck.
    if (!workerId || !batchId) {
      setState((prev) => ({
        ...prev,
        files: prev.files.map((f) =>
          f.status === 'pending'
            ? {
                ...f,
                status: 'failed' as const,
                error: 'Account not ready — try refreshing.',
              }
            : f,
        ),
      }))
      return
    }

    // Snapshot pending files once; new files added mid-upload aren't picked up
    // until the next startUpload() call.
    let pending: FileEntry[] = []
    setState((prev) => {
      pending = prev.files.filter((f) => f.status === 'pending')
      if (pending.length === 0) return prev
      const next = prev.files.map((f) =>
        f.status === 'pending' ? { ...f, status: 'uploading' as const } : f,
      )
      return { ...prev, files: next }
    })

    if (pending.length === 0) return

    // Upload concurrency: small cap so a slow regional connection isn't
    // overwhelmed. Tune later from real Apete usage.
    const CONCURRENCY = 3
    const queue = [...pending]
    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () =>
      processWorker(),
    )

    async function processWorker() {
      while (queue.length > 0) {
        const entry = queue.shift()
        if (!entry) return
        try {
          const result = await uploadDocument(
            entry.file,
            supabase,
            workerId!,
            batchId!,
          )
          updateEntry(entry.id, mapResult(result))
        } catch (err) {
          updateEntry(entry.id, {
            status: 'failed',
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }
    }

    await Promise.all(workers)
  }, [supabase])

  function updateEntry(entryId: string, patch: Partial<FileEntry>) {
    setState((prev) => ({
      ...prev,
      files: prev.files.map((f) => (f.id === entryId ? { ...f, ...patch } : f)),
    }))
  }

  const reset = useCallback(() => {
    batchIdRef.current = null
    setState((prev) => ({
      ...prev,
      batchId: null,
      files: [],
    }))
  }, [])

  return {
    state,
    addFiles,
    startUpload,
    reset,
  }
}

function mapResult(
  result: Awaited<ReturnType<typeof uploadDocument>>,
): Partial<FileEntry> {
  switch (result.status) {
    case 'uploaded':
      return { status: 'uploaded', documentId: result.documentId }
    case 'duplicate':
      return {
        status: 'duplicate',
        existingDocumentId: result.existingDocumentId,
      }
    case 'failed':
      return { status: 'failed', error: result.error }
  }
}
