import type { SupabaseClient } from '@supabase/supabase-js'

export const PAYSLIPS_BUCKET = 'payslips'
export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'application/pdf',
] as const
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB — mirrors bucket config

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

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
 *
 * Call before any operation that needs a workers.id (uploads, fact entry).
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
 * Upload a payslip file to storage and record it in `documents`.
 *
 * Path layout: `payslips/{workerId}/{uuid}-{safeFilename}`. Storage RLS
 * uses the first folder segment to authorise — `workerId` must be the
 * caller's own workers.id, otherwise the upload is rejected.
 *
 * Client-side validation here mirrors the bucket's allowed_mime_types
 * and file_size_limit so users get a clear local error instead of a
 * generic storage-API rejection. The bucket config is still authoritative.
 *
 * On documents-insert failure after a successful upload we leave the
 * storage object as an orphan rather than hard-deleting (no DELETE
 * policy, by design — audit trail integrity). A Phase 1 janitor will
 * sweep orphans by joining storage.objects against documents.
 */
export async function uploadPayslip(
  file: File,
  supabase: SupabaseClient,
  workerId: string,
): Promise<UploadPayslipResult> {
  if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
    throw new Error(
      `File type ${file.type || '(unknown)'} not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}.`,
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
    .from(PAYSLIPS_BUCKET)
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
 * Sign a storage path for download with a TTL.
 * Default 1 hour (3600 s). Use sparingly: signed URLs survive the user's
 * session, so prefer regenerating each view rather than caching.
 */
export async function signPayslipUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const result = await supabase.storage
    .from(PAYSLIPS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds)
  if (result.error) throw result.error
  return result.data.signedUrl
}
