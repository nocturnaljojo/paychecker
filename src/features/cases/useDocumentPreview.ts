import { useCallback, useEffect, useState } from 'react'
import { useSupabaseClient } from '@/lib/supabase'
import { signPayslipUrl } from '@/lib/upload'

/**
 * Sprint M0.5-BUILD-06.
 *
 * Reads all documents linked to a case (via documents.case_id) and
 * generates a signed URL per document so the worker can preview them.
 * Worker RLS already enforces "only own documents" at the SELECT
 * layer — this hook adds no new authorization surface.
 *
 * Per BUILD-06 hard-stop: signed URLs are NEVER cached in localStorage
 * (TTL is the security model; persisting them defeats it). Hook
 * regenerates on every open of the modal — cheap operation, fresh
 * 1-hour expiry.
 *
 * Per-document errors are surfaced on the entry itself (errorMessage)
 * rather than failing the whole batch — a single broken doc shouldn't
 * blank the whole preview.
 */

export type PreviewableDocument = {
  documentId: string
  storagePath: string
  mimeType: string
  filename: string
  signedUrl: string | null
  errorMessage: string | null
}

export type UseDocumentPreviewState = {
  documents: PreviewableDocument[]
  isLoading: boolean
  hasError: boolean
  refresh: () => Promise<void>
}

type DocumentRow = {
  id: string
  storage_path: string
  mime_type: string | null
  original_filename: string | null
  created_at: string
}

export function useDocumentPreview(
  caseId: string | null,
): UseDocumentPreviewState {
  const supabase = useSupabaseClient()
  const [documents, setDocuments] = useState<PreviewableDocument[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)

  const fetchDocuments = useCallback(async () => {
    if (!caseId) {
      setDocuments([])
      setIsLoading(false)
      setHasError(false)
      return
    }

    setIsLoading(true)
    setHasError(false)

    const result = await supabase
      .from('documents')
      .select('id, storage_path, mime_type, original_filename, created_at')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true })

    if (result.error) {
      setDocuments([])
      setIsLoading(false)
      setHasError(true)
      return
    }

    const rows = (result.data ?? []) as DocumentRow[]

    const signed = await Promise.all(
      rows.map(async (row): Promise<PreviewableDocument> => {
        try {
          const url = await signPayslipUrl(supabase, row.storage_path)
          return {
            documentId: row.id,
            storagePath: row.storage_path,
            mimeType: row.mime_type ?? 'application/octet-stream',
            filename: row.original_filename ?? 'document',
            signedUrl: url,
            errorMessage: null,
          }
        } catch (err) {
          return {
            documentId: row.id,
            storagePath: row.storage_path,
            mimeType: row.mime_type ?? 'application/octet-stream',
            filename: row.original_filename ?? 'document',
            signedUrl: null,
            errorMessage:
              err instanceof Error ? err.message : 'Couldn\'t load preview',
          }
        }
      }),
    )

    setDocuments(signed)
    setIsLoading(false)
  }, [caseId, supabase])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await fetchDocuments()
      if (cancelled) return
    })()
    return () => {
      cancelled = true
    }
  }, [fetchDocuments])

  return {
    documents,
    isLoading,
    hasError,
    refresh: fetchDocuments,
  }
}
