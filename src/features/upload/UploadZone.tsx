import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, FileText, Image as ImageIcon, Upload as UploadIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { ACCEPTED_MIME_TYPES } from '@/lib/upload'
import { useUploadBatch, type FileEntry, type FileStatus } from './useUploadBatch'
import { useClassifyBatch, type ClassifyStatus } from './useClassifyBatch'

const ACCEPT_ATTR = ACCEPTED_MIME_TYPES.join(',')

type CombinedStatus =
  | FileStatus // 'pending' | 'uploading' | 'uploaded' | 'duplicate' | 'failed'
  | 'reading' // post-upload classify in flight
  | 'auto_routed'
  | 'review_pending'
  | 'consent_required' // server-side ISS-006 gate fired (post-mount edge case)

export function UploadZone() {
  const navigate = useNavigate()
  const { state: uploadState, addFiles, startUpload } = useUploadBatch()
  const { entries: classifyEntries, classifyBatch } = useClassifyBatch()
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)

  // Track which documentIds have already been queued for classify so the
  // chain effect doesn't re-trigger a fetch on every render.
  const queuedClassifyRef = useRef<Set<string>>(new Set())

  // Chain: when an upload reaches 'uploaded' status, queue its document_id
  // for classification. Duplicates get queued too — the API will return the
  // existing classification idempotently.
  useEffect(() => {
    const fresh: string[] = []
    for (const f of uploadState.files) {
      const docId =
        f.status === 'uploaded'
          ? f.documentId
          : f.status === 'duplicate'
            ? f.existingDocumentId
            : undefined
      if (!docId) continue
      if (queuedClassifyRef.current.has(docId)) continue
      queuedClassifyRef.current.add(docId)
      fresh.push(docId)
    }
    if (fresh.length > 0) {
      void classifyBatch(fresh)
    }
  }, [uploadState.files, classifyBatch])

  const onPickFiles = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (files.length === 0) return
      addFiles(files)
      void startUpload()
      e.target.value = ''
    },
    [addFiles, startUpload],
  )

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      const files = Array.from(e.dataTransfer.files ?? [])
      if (files.length === 0) return
      addFiles(files)
      void startUpload()
    },
    [addFiles, startUpload],
  )

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  // Build the merged display list — one entry per file with the latest
  // status from either upload or classify side.
  const rows = useMemo(
    () => mergeRows(uploadState.files, classifyEntries),
    [uploadState.files, classifyEntries],
  )

  const counts = countByCombinedStatus(rows)
  const allUploaded =
    uploadState.files.length > 0 &&
    counts.pending === 0 &&
    counts.uploading === 0
  const allClassified =
    allUploaded &&
    counts.reading === 0 &&
    (counts.auto_routed > 0 ||
      counts.review_pending > 0 ||
      counts.failed > 0 ||
      counts.consent_required > 0)
  const consentRequiredCount = counts.consent_required

  return (
    <main className="flex min-h-screen flex-col bg-pc-bg text-pc-text">
      <header className="px-5 pt-6">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="text-pc-caption text-pc-text-muted hover:text-pc-text"
        >
          ← Back to your data
        </button>
        <h1 className="mt-4 text-[26px] font-semibold leading-tight [text-wrap:pretty]">
          Add documents
        </h1>
        <p className="mt-2 text-pc-body leading-normal text-pc-text-muted [text-wrap:pretty]">
          Take a photo or pick files from your phone. We'll read them and you check
          what we found.
        </p>
      </header>

      <div className="flex-1 px-5 pb-8 pt-6">
        {consentRequiredCount > 0 && (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-pc-amber-soft bg-pc-amber-soft p-4 text-pc-caption text-pc-text"
          >
            <p className="font-medium">
              Some files couldn't be read until your privacy setup is done.
            </p>
            <div className="mt-2">
              <Button
                variant="primary"
                onClick={() => navigate('/onboarding')}
              >
                Complete setup
              </Button>
            </div>
          </div>
        )}

        {uploadState.workerError && (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-pc-coral-soft bg-pc-coral-soft p-4 text-pc-caption text-pc-text"
          >
            <p className="font-medium">
              We couldn't set up your upload area.
            </p>
            <p className="mt-1">
              Try refreshing the page. If it keeps happening,{' '}
              <button
                type="button"
                onClick={() => navigate('/onboarding')}
                className="font-medium text-pc-navy underline hover:text-pc-navy-hover"
              >
                finish your account setup
              </button>{' '}
              and come back.
            </p>
            <span className="mt-2 block font-mono text-[11px] text-pc-text-muted">
              {uploadState.workerError}
            </span>
          </div>
        )}

        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={cn(
            'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-pc-surface px-5 py-10 text-center transition-colors',
            isDragging
              ? 'border-pc-navy bg-pc-navy-soft'
              : 'border-pc-border-strong',
          )}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pc-navy-soft text-pc-navy">
            <UploadIcon size={26} strokeWidth={1.75} />
          </div>
          <div className="mt-4 text-pc-body font-medium text-pc-text">
            Drop files here
          </div>
          <div className="mt-1 text-pc-caption text-pc-text-muted">
            Photos, PDFs, screenshots — anything that shows your pay
          </div>
          <div className="mt-5 flex flex-col gap-2 w-full max-w-xs">
            <Button
              variant="primary"
              block
              onClick={() => fileInputRef.current?.click()}
              disabled={
                uploadState.isResolvingWorker || !!uploadState.workerError
              }
            >
              Choose files
            </Button>
            <Button
              variant="secondary"
              block
              onClick={() => cameraInputRef.current?.click()}
              disabled={
                uploadState.isResolvingWorker || !!uploadState.workerError
              }
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Camera size={18} strokeWidth={1.75} />
                Take a photo
              </span>
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            multiple
            onChange={onPickFiles}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={onPickFiles}
            className="hidden"
          />
        </div>

        {rows.length > 0 && (
          <section className="mt-6">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-pc-h2 font-semibold text-pc-text">
                {!allUploaded
                  ? 'This batch'
                  : !allClassified
                    ? 'Reading them now'
                    : 'Done'}
              </h2>
              <span className="font-mono text-[11px] uppercase tracking-wide text-pc-text-muted">
                {summarise(counts)}
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {rows.map((row) => (
                <RowItem key={row.id} row={row} />
              ))}
            </ul>
          </section>
        )}

        {allClassified && (
          <section className="mt-6 rounded-2xl border border-pc-border bg-pc-sage-soft p-4">
            <div className="text-pc-body font-medium text-pc-text">
              {counts.review_pending > 0
                ? 'Some need your check'
                : counts.failed > 0
                  ? 'Some couldn\'t be read'
                  : 'All set'}
            </div>
            <p className="mt-1 text-pc-caption text-pc-text">
              {counts.review_pending > 0
                ? `${counts.review_pending} document${counts.review_pending === 1 ? '' : 's'} need a quick check before we save them.`
                : counts.failed > 0
                  ? 'You can re-upload, or enter your details manually below.'
                  : 'We saved your documents. Reading the values is the next step.'}
            </p>
            <div className="mt-3">
              <Button variant="primary" onClick={() => navigate('/dashboard')}>
                Continue
              </Button>
            </div>
          </section>
        )}

        <div className="mt-8 border-t border-pc-border pt-5 text-pc-caption text-pc-text-muted">
          Don't have your documents yet?{' '}
          <button
            type="button"
            onClick={() => navigate('/buckets/employment-contract')}
            className="font-medium text-pc-navy underline hover:text-pc-navy-hover"
          >
            Enter your details manually
          </button>
        </div>
      </div>
    </main>
  )
}

// ─────────────────────────────────────────────────────────────────
// Row + helpers
// ─────────────────────────────────────────────────────────────────

type DisplayRow = {
  id: string // local UI id (FileEntry.id)
  fileName: string
  fileMime: string
  fileSize: number
  combinedStatus: CombinedStatus
  errorMessage?: string
}

function mergeRows(
  files: FileEntry[],
  classify: ReadonlyArray<{
    documentId: string
    status: ClassifyStatus
    reason?: string
  }>,
): DisplayRow[] {
  const classifyByDoc = new Map(classify.map((c) => [c.documentId, c]))

  return files.map((f): DisplayRow => {
    const docId =
      f.status === 'uploaded'
        ? f.documentId
        : f.status === 'duplicate'
          ? f.existingDocumentId
          : undefined
    const classifyEntry = docId ? classifyByDoc.get(docId) : undefined

    let status: CombinedStatus = f.status
    let errorMessage = f.error
    if (classifyEntry && f.status === 'uploaded') {
      // Upload finished; classify state is the live one.
      status = classifyEntry.status === 'idle' ? 'reading' : classifyEntry.status
      errorMessage = classifyEntry.reason
    } else if (classifyEntry && f.status === 'duplicate') {
      // Duplicate uploads also flow through classify (idempotent server-side).
      status = classifyEntry.status === 'idle' ? 'duplicate' : classifyEntry.status
      errorMessage = classifyEntry.reason
    } else if (f.status === 'uploaded') {
      // Just uploaded; classify hasn't kicked off yet (mid-effect).
      status = 'reading'
    }

    return {
      id: f.id,
      fileName: f.file.name,
      fileMime: f.file.type,
      fileSize: f.file.size,
      combinedStatus: status,
      errorMessage,
    }
  })
}

function RowItem({ row }: { row: DisplayRow }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-pc-border bg-pc-surface p-3">
      <div className="flex items-center gap-3 min-w-0">
        <FileIcon mime={row.fileMime} />
        <div className="min-w-0">
          <div className="truncate text-pc-body text-pc-text">{row.fileName}</div>
          <div className="font-mono text-[11px] uppercase tracking-wide text-pc-text-muted">
            {formatSize(row.fileSize)}
            {row.errorMessage && (
              <span className="ml-2 text-pc-coral break-words">{row.errorMessage}</span>
            )}
          </div>
        </div>
      </div>
      <StatusPill status={row.combinedStatus} />
    </li>
  )
}

function FileIcon({ mime }: { mime: string }) {
  const isImage = mime.startsWith('image/')
  return (
    <div
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
        isImage
          ? 'bg-pc-navy-soft text-pc-navy'
          : 'bg-pc-amber-soft text-[#7A5A1E]',
      )}
    >
      {isImage ? (
        <ImageIcon size={18} strokeWidth={1.75} />
      ) : (
        <FileText size={18} strokeWidth={1.75} />
      )}
    </div>
  )
}

function StatusPill({ status }: { status: CombinedStatus }) {
  const map: Record<CombinedStatus, { label: string; className: string }> = {
    pending: { label: 'Waiting', className: 'bg-pc-border text-pc-text-muted' },
    uploading: { label: 'Uploading…', className: 'bg-pc-navy-soft text-pc-navy' },
    uploaded: { label: 'Uploaded', className: 'bg-pc-sage-soft text-pc-sage' },
    duplicate: { label: 'Already uploaded', className: 'bg-pc-amber-soft text-[#7A5A1E]' },
    reading: { label: 'Reading…', className: 'bg-pc-navy-soft text-pc-navy' },
    auto_routed: { label: 'Saved', className: 'bg-pc-sage-soft text-pc-sage' },
    review_pending: { label: 'Needs your check', className: 'bg-pc-amber-soft text-[#7A5A1E]' },
    failed: { label: 'Couldn\'t read', className: 'bg-pc-coral-soft text-[#7A3B33]' },
    consent_required: { label: 'Privacy setup first', className: 'bg-pc-amber-soft text-[#7A5A1E]' },
  }
  const { label, className } = map[status]
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-3 py-1 text-[12px] font-medium',
        className,
      )}
    >
      {label}
    </span>
  )
}

type CombinedCounts = Record<CombinedStatus, number>

function countByCombinedStatus(rows: DisplayRow[]): CombinedCounts {
  const counts: CombinedCounts = {
    pending: 0,
    uploading: 0,
    uploaded: 0,
    duplicate: 0,
    reading: 0,
    auto_routed: 0,
    review_pending: 0,
    failed: 0,
    consent_required: 0,
  }
  for (const r of rows) counts[r.combinedStatus] += 1
  return counts
}

function summarise(counts: CombinedCounts): string {
  const parts: string[] = []
  if (counts.auto_routed) parts.push(`${counts.auto_routed} saved`)
  if (counts.review_pending) parts.push(`${counts.review_pending} need check`)
  if (counts.consent_required) parts.push(`${counts.consent_required} privacy setup`)
  if (counts.duplicate) parts.push(`${counts.duplicate} dupes`)
  if (counts.failed) parts.push(`${counts.failed} failed`)
  if (counts.uploading || counts.pending || counts.uploaded || counts.reading) {
    parts.push(
      `${counts.uploading + counts.pending + counts.uploaded + counts.reading} in flight`,
    )
  }
  return parts.join(' · ')
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
