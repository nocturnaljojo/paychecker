import { useCallback, useEffect, useState } from 'react'
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

export type AddFilesResult = {
  entries: FileEntry[]
  batchId: string
}

const POOL_SIZE = 3

/**
 * Upload-batch hook for the upload-first pipeline (ADR-013).
 *
 * Sprint B1.8 refactor (closes ISS-008 / POL-009 / POL-010):
 *   - No refs-mirroring-state. State is the sole source of truth.
 *   - addFiles returns { entries, batchId } synchronously so the caller
 *     can drive startUpload immediately, without depending on React to
 *     commit any deferred setState updater.
 *   - startUpload takes explicit (entries, workerId, batchId) params.
 *     The TypeScript signature makes the previously-impossible-but-
 *     observed null states unreachable; the B1.5 worker-null loud-fail
 *     branch is gone (POL-010 closed by removal).
 *   - All setState calls use pure functional updaters with no closure
 *     side effects (this is the discipline ISS-007 + ISS-008 violated).
 */
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

  // Worker resolution effect.
  // ensureWorker auto-creates the workers row on miss (B1.5 behavior).
  // Re-runs only when supabase client or Clerk user id changes.
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    ensureWorker(supabase, user.id)
      .then((workerId) => {
        if (cancelled) return
        setState((prev) => ({
          ...prev,
          workerId,
          isResolvingWorker: false,
        }))
      })
      .catch((err) => {
        if (cancelled) return
        setState((prev) => ({
          ...prev,
          isResolvingWorker: false,
          workerError: err instanceof Error ? err.message : String(err),
        }))
      })

    return () => {
      cancelled = true
    }
  }, [supabase, user?.id])

  /**
   * Validate, ID, and stage a batch of files into the upload queue.
   * Returns the new entries + the batch id synchronously so the caller
   * can drive `startUpload` without waiting for React to commit state.
   *
   * Generates a fresh `batchId` only when none is already in flight;
   * subsequent calls within the same session reuse the same batch.
   */
  const addFiles = useCallback(
    (files: File[]): AddFilesResult => {
      const batchId = state.batchId ?? generateBatchId()
      if (files.length === 0) return { entries: [], batchId }

      const entries: FileEntry[] = files.map((file) => {
        const validationError = validateFile(file)
        return {
          id: crypto.randomUUID(),
          file,
          status: validationError ? 'failed' : 'pending',
          error: validationError ?? undefined,
        }
      })

      setState((prev) => ({
        ...prev,
        batchId: prev.batchId ?? batchId,
        files: [...prev.files, ...entries],
      }))

      return { entries, batchId }
    },
    [state.batchId],
  )

  /**
   * Process the given pending entries through the upload pipeline.
   * Caller passes `entries`, `workerId`, and `batchId` explicitly — no
   * implicit ref reads, no closure-stale state. The non-nullable
   * parameter types make the previously-observed silent-stall states
   * unreachable.
   */
  const startUpload = useCallback(
    async (
      entries: FileEntry[],
      workerId: string,
      batchId: string,
    ): Promise<void> => {
      const pending = entries.filter((e) => e.status === 'pending')
      if (pending.length === 0) return

      const pendingIds = new Set(pending.map((p) => p.id))
      setState((prev) => ({
        ...prev,
        files: prev.files.map((f) =>
          pendingIds.has(f.id) ? { ...f, status: 'uploading' as const } : f,
        ),
      }))

      const queue = [...pending]

      async function processOne(entry: FileEntry) {
        try {
          const result = await uploadDocument(
            entry.file,
            supabase,
            workerId,
            batchId,
          )
          setState((prev) => ({
            ...prev,
            files: prev.files.map((f) =>
              f.id === entry.id ? { ...f, ...mapResult(result) } : f,
            ),
          }))
        } catch (err) {
          setState((prev) => ({
            ...prev,
            files: prev.files.map((f) =>
              f.id === entry.id
                ? {
                    ...f,
                    status: 'failed' as const,
                    error: err instanceof Error ? err.message : String(err),
                  }
                : f,
            ),
          }))
        }
      }

      const workers = Array.from(
        { length: Math.min(POOL_SIZE, queue.length) },
        async () => {
          while (queue.length > 0) {
            const next = queue.shift()
            if (!next) break
            await processOne(next)
          }
        },
      )

      await Promise.all(workers)
    },
    [supabase],
  )

  /**
   * Clear the current batch + file list. Preserves the resolved worker
   * so subsequent uploads don't re-trigger worker resolution.
   */
  const reset = useCallback(() => {
    setState((prev) => ({
      workerId: prev.workerId,
      batchId: null,
      files: [],
      isResolvingWorker: prev.isResolvingWorker,
      workerError: prev.workerError,
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
