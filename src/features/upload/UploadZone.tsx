import {
  useCallback,
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

const ACCEPT_ATTR = ACCEPTED_MIME_TYPES.join(',')

export function UploadZone() {
  const navigate = useNavigate()
  const { state, addFiles, startUpload } = useUploadBatch()
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)

  const onPickFiles = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (files.length === 0) return
      addFiles(files)
      void startUpload()
      // reset the input so the same file can be picked again later
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

  const counts = countByStatus(state.files)
  const allDone =
    state.files.length > 0 &&
    counts.pending === 0 &&
    counts.uploading === 0

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
        {state.workerError && (
          <p className="mb-4 rounded-2xl border border-pc-coral-soft bg-pc-coral-soft p-4 text-pc-caption text-pc-text">
            We couldn't load your account. Try refreshing the page.
            <span className="mt-1 block font-mono text-[11px] text-pc-text-muted">
              {state.workerError}
            </span>
          </p>
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
              disabled={state.isResolvingWorker}
            >
              Choose files
            </Button>
            <Button
              variant="secondary"
              block
              onClick={() => cameraInputRef.current?.click()}
              disabled={state.isResolvingWorker}
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

        {state.files.length > 0 && (
          <section className="mt-6">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-pc-h2 font-semibold text-pc-text">
                This batch
              </h2>
              <span className="font-mono text-[11px] uppercase tracking-wide text-pc-text-muted">
                {summarise(counts)}
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {state.files.map((entry) => (
                <FileRow key={entry.id} entry={entry} />
              ))}
            </ul>
          </section>
        )}

        {allDone && (
          <section className="mt-6 rounded-2xl border border-pc-border bg-pc-sage-soft p-4">
            <div className="text-pc-body font-medium text-pc-text">
              Got your files. We'll read them next.
            </div>
            <p className="mt-1 text-pc-caption text-pc-text">
              Reading is the next step — coming soon.
            </p>
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

function FileRow({ entry }: { entry: FileEntry }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-pc-border bg-pc-surface p-3">
      <div className="flex items-center gap-3 min-w-0">
        <FileIcon mime={entry.file.type} />
        <div className="min-w-0">
          <div className="truncate text-pc-body text-pc-text">
            {entry.file.name}
          </div>
          <div className="font-mono text-[11px] uppercase tracking-wide text-pc-text-muted">
            {formatSize(entry.file.size)}
            {entry.error && (
              <span className="ml-2 text-pc-coral">{entry.error}</span>
            )}
          </div>
        </div>
      </div>
      <StatusPill status={entry.status} />
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

function StatusPill({ status }: { status: FileStatus }) {
  const map: Record<
    FileStatus,
    { label: string; className: string }
  > = {
    pending: {
      label: 'Waiting',
      className: 'bg-pc-border text-pc-text-muted',
    },
    uploading: {
      label: 'Uploading…',
      className: 'bg-pc-navy-soft text-pc-navy',
    },
    uploaded: {
      label: 'Uploaded',
      className: 'bg-pc-sage-soft text-pc-sage',
    },
    duplicate: {
      label: 'Already uploaded',
      className: 'bg-pc-amber-soft text-[#7A5A1E]',
    },
    failed: {
      label: 'Failed',
      className: 'bg-pc-coral-soft text-[#7A3B33]',
    },
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

function countByStatus(files: FileEntry[]) {
  const counts: Record<FileStatus, number> = {
    pending: 0,
    uploading: 0,
    uploaded: 0,
    duplicate: 0,
    failed: 0,
  }
  for (const f of files) counts[f.status] += 1
  return counts
}

function summarise(counts: Record<FileStatus, number>): string {
  const parts: string[] = []
  if (counts.uploaded) parts.push(`${counts.uploaded} uploaded`)
  if (counts.duplicate) parts.push(`${counts.duplicate} dupes`)
  if (counts.failed) parts.push(`${counts.failed} failed`)
  if (counts.uploading || counts.pending) {
    parts.push(`${counts.uploading + counts.pending} in flight`)
  }
  return parts.join(' · ')
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
