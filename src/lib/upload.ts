import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js'
import {
  ACCEPTED_MIME_TYPES,
  type AcceptedMimeType,
  MAX_FILE_SIZE_BYTES,
  computeContentHash,
  generateUnclassifiedPath,
  validateFile,
} from '@/features/upload/uploadHelpers'

// Single canonical bucket per Migration 0011 + storage-architecture-v01.md.
// (The pre-Migration-0011 'payslips' bucket alias is kept alive at the storage
// layer until POL-003 cleanup; this constant points at the new canonical name
// so all future code paths land in `documents`.)
export const DOCUMENTS_BUCKET = 'documents'

// Backwards-compat alias for any pre-cutover call sites. ISS-001 closure.
export const PAYSLIPS_BUCKET = DOCUMENTS_BUCKET

export { ACCEPTED_MIME_TYPES, MAX_FILE_SIZE_BYTES }
export type { AcceptedMimeType }

// Legacy alias for Sprint 7's manual-fallback path, which historically
// imported ALLOWED_MIME_TYPES.
export const ALLOWED_MIME_TYPES = ACCEPTED_MIME_TYPES

export type UploadDocumentResult =
  | {
      status: 'uploaded'
      documentId: string
      storagePath: string
    }
  | {
      status: 'duplicate'
      existingDocumentId: string
    }
  | {
      status: 'failed'
      error: string
    }

export type UploadPayslipResult = {
  documentId: string
  storagePath: string
}

/**
 * Ensure a workers row exists for the current Clerk user.
 *
 * Idempotent: read first, insert on miss. RLS allows SELECT/INSERT only
 * when clerk_user_id = auth.jwt() ->> 'sub', so this can never create a
 * row for any other user even if `clerkUserId` is wrong.
 */
export async function ensureWorker(
  supabase: SupabaseClient,
  clerkUserId: string,
): Promise<string> {
  const existing = await supabase
    .from('workers')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()
  if (existing.error) throw existing.error
  if (existing.data) return existing.data.id as string

  const created = await supabase
    .from('workers')
    .insert({ clerk_user_id: clerkUserId })
    .select('id')
    .single()
  if (created.error) throw created.error
  return created.data.id as string
}

/**
 * Upload a single document into the upload-first pipeline (per ADR-013).
 *
 * Lands the file at the canonical pre-CLASSIFY path
 *   {worker_uuid}/_unclassified/{ISO-ts}_{4-hex}.{ext}
 * then INSERTs a `documents` row with state='raw'. Sprint B2 picks up
 * documents WHERE state='raw' for classification + routing.
 *
 * Idempotency: the (worker_id, content_hash) UNIQUE INDEX (Migration 0011)
 * catches re-uploads. On a unique violation we return the existing
 * document_id so the UI can surface "you already uploaded this".
 *
 * doc_type is set to 'other' as a placeholder; Sprint B2 transitions it
 * to the classified bucket type.
 */
export async function uploadDocument(
  file: File,
  supabase: SupabaseClient,
  workerId: string,
  batchId: string,
): Promise<UploadDocumentResult> {
  const validationError = validateFile(file)
  if (validationError) {
    return { status: 'failed', error: validationError }
  }

  let contentHash: string
  try {
    contentHash = await computeContentHash(file)
  } catch (err) {
    return {
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
    }
  }

  // Dedup pre-check: if a row already exists with this (worker_id,
  // content_hash), short-circuit before re-uploading the bytes.
  const existing = await supabase
    .from('documents')
    .select('id')
    .eq('worker_id', workerId)
    .eq('content_hash', contentHash)
    .maybeSingle()
  if (existing.error) {
    return { status: 'failed', error: existing.error.message }
  }
  if (existing.data) {
    return {
      status: 'duplicate',
      existingDocumentId: existing.data.id as string,
    }
  }

  const storagePath = generateUnclassifiedPath(workerId, file)

  const upload = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })
  if (upload.error) {
    return { status: 'failed', error: upload.error.message }
  }

  const insert = await supabase
    .from('documents')
    .insert({
      worker_id: workerId,
      doc_type: 'other',
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      batch_id: batchId,
      content_hash: contentHash,
      // state defaults to 'raw' (Migration 0011); Sprint B2 transitions it.
    })
    .select('id')
    .single()

  if (insert.error) {
    // 23505 = unique_violation (the (worker_id, content_hash) constraint).
    // Race window between the dedup pre-check above and the INSERT.
    if (isUniqueViolation(insert.error)) {
      const racy = await supabase
        .from('documents')
        .select('id')
        .eq('worker_id', workerId)
        .eq('content_hash', contentHash)
        .maybeSingle()
      if (racy.data) {
        return {
          status: 'duplicate',
          existingDocumentId: racy.data.id as string,
        }
      }
    }
    return { status: 'failed', error: insert.error.message }
  }

  return {
    status: 'uploaded',
    documentId: insert.data.id as string,
    storagePath,
  }
}

function isUniqueViolation(err: PostgrestError): boolean {
  return err.code === '23505'
}

/**
 * Legacy single-file upload used by Sprint 7's manual-fallback path
 * (`EmploymentContractScreen` / `useEmploymentFact`). Preserved for
 * backwards-compat; new flows should call uploadDocument() instead.
 *
 * This signature throws on failure to match the Sprint 7 contract.
 */
export async function uploadPayslip(
  file: File,
  supabase: SupabaseClient,
  workerId: string,
): Promise<UploadPayslipResult> {
  if (!ACCEPTED_MIME_TYPES.includes(file.type as AcceptedMimeType)) {
    throw new Error(
      `File type ${file.type || '(unknown)'} not allowed. Allowed: ${ACCEPTED_MIME_TYPES.join(', ')}.`,
    )
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File is ${(file.size / 1024 / 1024).toFixed(2)} MB; max is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`,
    )
  }

  const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${workerId}/${crypto.randomUUID()}-${safeFilename}`

  const upload = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })
  if (upload.error) throw upload.error

  const insert = await supabase
    .from('documents')
    .insert({
      worker_id: workerId,
      doc_type: 'payslip',
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select('id')
    .single()
  if (insert.error) throw insert.error

  return { documentId: insert.data.id as string, storagePath }
}

/**
 * Sign a storage path for download with a TTL (default 1 hour).
 */
export async function signPayslipUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const result = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds)
  if (result.error) throw result.error
  return result.data.signedUrl
}
