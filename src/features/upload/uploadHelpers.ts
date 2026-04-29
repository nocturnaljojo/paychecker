// Filename generation, content hashing, type validation for the upload flow.
// All decisions locked in docs/architecture/storage-architecture-v01.md.

export const ACCEPTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/heic',
  'image/heif',
  'image/webp',
  'application/pdf',
] as const

export type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number]

// Mirrors documents storage bucket file_size_limit set in migration 0011.
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

/** UUIDv4 for grouping a multi-file upload session. */
export function generateBatchId(): string {
  return crypto.randomUUID()
}

/**
 * SHA-256 hex of the file content. Used as the dedup key
 * (UNIQUE on documents (worker_id, content_hash) per migration 0011).
 */
export async function computeContentHash(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buf)
  const bytes = new Uint8Array(digest)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

/**
 * Canonical pre-CLASSIFY path per storage-architecture-v01.md:
 *   {worker_uuid}/_unclassified/{ISO-timestamp}_{4-hex}.{ext}
 *
 * Sprint B2 moves the object to {type}/ once classification commits.
 */
export function generateUnclassifiedPath(workerId: string, file: File): string {
  const isoTs = new Date()
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replace(/[:.]/g, '-')
  const disambiguator = crypto.randomUUID().replace(/-/g, '').slice(0, 4)
  const ext = getFileExtension(file)
  return `${workerId}/_unclassified/${isoTs}_${disambiguator}.${ext}`
}

/**
 * Extract a lowercased file extension from a File. Falls back to a MIME-derived
 * extension when the original filename has none. Always returns a non-empty string.
 */
export function getFileExtension(file: File): string {
  const fromName = file.name.includes('.')
    ? file.name.split('.').pop()?.toLowerCase()
    : undefined
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName

  switch (file.type) {
    case 'image/png':
      return 'png'
    case 'image/jpeg':
      return 'jpg'
    case 'image/heic':
      return 'heic'
    case 'image/heif':
      return 'heif'
    case 'image/webp':
      return 'webp'
    case 'application/pdf':
      return 'pdf'
    default:
      return 'bin'
  }
}

/** Pre-flight type + size validation. Returns null if valid, else a worker-readable error string. */
export function validateFile(file: File): string | null {
  if (!ACCEPTED_MIME_TYPES.includes(file.type as AcceptedMimeType)) {
    return `This file type isn't supported — try a photo (PNG/JPG/HEIC) or PDF.`
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    return `${file.name} is ${mb} MB. Max is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB. Try a smaller copy.`
  }
  return null
}

/**
 * Slugify an employer name for filename use. Sprint B2 will use this when
 * routing classified docs into typed subpaths (currently exported for reuse;
 * not consumed in B1 because pre-CLASSIFY uploads don't know the employer yet).
 *
 * Per storage-architecture-v01.md: lowercase, [a-z0-9-], max 32 chars.
 */
export function slugifyEmployerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32)
}
