import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Camera, FileText, Image as ImageIcon, Upload as UploadIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { ACCEPTED_MIME_TYPES } from '@/lib/upload'
import { useUploadBatch, type FileEntry, type FileStatus } from './useUploadBatch'
import { useClassifyBatch, type ClassifyStatus } from './useClassifyBatch'
import {
  useCaseFeedback,
  formatDocTypeLabel,
  type CaseEntry,
} from './useCaseFeedback'
import { OverrideModal } from './OverrideModal'
import { completionStatusLabel, docTypeLabel } from '@/features/cases/vocabulary'
import { useSupabaseClient } from '@/lib/supabase'

const ACCEPT_ATTR = ACCEPTED_MIME_TYPES.join(',')

type CombinedStatus =
  | FileStatus // 'pending' | 'uploading' | 'uploaded' | 'duplicate' | 'failed'
  | 'reading' // post-upload classify in flight
  | 'auto_routed'
  | 'review_pending'
  | 'consent_required' // server-side ISS-006 gate fired (post-mount edge case)

export function UploadZone() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const supabase = useSupabaseClient()
  const { state: uploadState, addFiles, startUpload } = useUploadBatch()
  const { entries: classifyEntries, classifyBatch } = useClassifyBatch()
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)

  // Sprint M0.5-BUILD-03: when the worker arrives via /upload?case=X
  // (from a CaseCard's "+ Add more pages" link), we attach freshly
  // uploaded documents to that existing case instead of creating a new
  // one. extendingCaseId is read here (early) because the classify-chain
  // useEffect below needs to thread it into classifyBatch().
  const extendingCaseId = searchParams.get('case')

  // Track which documentIds have already been queued for classify so the
  // chain effect doesn't re-trigger a fetch on every render.
  const queuedClassifyRef = useRef<Set<string>>(new Set())

  // Chain: when an upload reaches 'uploaded' status, queue its document_id
  // for classification. Duplicates get queued too — the API will return the
  // existing classification idempotently. When the worker arrived via
  // /upload?case=X (extending an existing case), the case_id rides along
  // so api/classify.ts can take the extend path.
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
      void classifyBatch(fresh, extendingCaseId ?? undefined)
    }
  }, [uploadState.files, classifyBatch, extendingCaseId])

  const onPickFiles = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      e.target.value = ''
      if (files.length === 0) return

      const { workerId, isResolvingWorker, workerError } = uploadState
      if (isResolvingWorker || workerError || !workerId) return

      const { entries, batchId } = addFiles(files)
      if (entries.length === 0) return
      void startUpload(entries, workerId, batchId)
    },
    [uploadState, addFiles, startUpload],
  )

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)

      const { workerId, isResolvingWorker, workerError } = uploadState
      if (isResolvingWorker || workerError || !workerId) return

      const files = Array.from(e.dataTransfer.files ?? [])
      if (files.length === 0) return

      const { entries, batchId } = addFiles(files)
      if (entries.length === 0) return
      void startUpload(entries, workerId, batchId)
    },
    [uploadState, addFiles, startUpload],
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

  // ADR-014 / Sprint M0.5-BUILD-01 — collect document IDs whose classify
  // pass has finished, so the case-feedback hook can read their cases.
  // Cases are created server-side (api/classify.ts → classify_with_case
  // RPC) once classification is determined; we wait for that signal here.
  const settledDocumentIds = useMemo(() => {
    const ids: string[] = []
    for (const f of uploadState.files) {
      const docId =
        f.status === 'uploaded'
          ? f.documentId
          : f.status === 'duplicate'
            ? f.existingDocumentId
            : undefined
      if (!docId) continue
      const ce = classifyEntries.find((c) => c.documentId === docId)
      if (
        ce &&
        (ce.status === 'auto_routed' ||
          ce.status === 'review_pending' ||
          ce.status === 'failed')
      ) {
        ids.push(docId)
      }
    }
    return ids
  }, [uploadState.files, classifyEntries])

  const { cases, readyCount, confirmCase, updateCaseLabel } =
    useCaseFeedback(settledDocumentIds)

  // Owning state for the visual anchor + page-count surface — both
  // refetch on mount and on caseId change (no caching).
  const [extendingCase, setExtendingCase] = useState<
    { docType: string | null; pageCount: number } | null
  >(null)

  // Per ChatGPT Round 2 finding 3: anchor refreshes on every mount —
  // no caching. If the worker overrode the case's label between visits,
  // the anchor must reflect the CURRENT case_type, not a stale snapshot.
  useEffect(() => {
    if (!extendingCaseId) {
      setExtendingCase(null)
      return
    }
    let cancelled = false
    void (async () => {
      const caseRow = await supabase
        .from('document_cases')
        .select('doc_type')
        .eq('case_id', extendingCaseId)
        .maybeSingle()
      if (cancelled || caseRow.error || !caseRow.data) {
        setExtendingCase(null)
        return
      }
      const countRow = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('case_id', extendingCaseId)
      if (cancelled) return
      setExtendingCase({
        docType: caseRow.data.doc_type as string | null,
        pageCount: countRow.count ?? 0,
      })
    })()
    return () => {
      cancelled = true
    }
  }, [extendingCaseId, supabase])

  // After the extend-classify completes for a fresh upload, refresh
  // the page count so "Page added! Your X now has N pages" reads the
  // post-link count from the DB (per ChatGPT Round 2 finding 2 — never
  // local state). settledDocumentIds changes when classify finishes.
  const settledKey = settledDocumentIds.join(',')
  useEffect(() => {
    if (!extendingCaseId || !settledKey) return
    let cancelled = false
    void (async () => {
      const countRow = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('case_id', extendingCaseId)
      if (cancelled) return
      setExtendingCase((prev) =>
        prev ? { ...prev, pageCount: countRow.count ?? prev.pageCount } : prev,
      )
    })()
    return () => {
      cancelled = true
    }
  }, [extendingCaseId, supabase, settledKey])

  const pageCountByCase = useMemo<Record<string, number>>(() => {
    if (extendingCaseId && extendingCase) {
      return { [extendingCaseId]: extendingCase.pageCount }
    }
    return {}
  }, [extendingCaseId, extendingCase])

  const handleAddMorePages = useCallback(
    (caseId: string) => {
      navigate(`/upload?case=${caseId}`)
      // Also reset the local upload batch so the next photo starts fresh.
      // useUploadBatch handles this internally per FileEntry; navigation
      // alone is enough to update searchParams + trigger the anchor.
    },
    [navigate],
  )

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
        {extendingCaseId && (
          <VisualAnchor
            docType={extendingCase?.docType ?? null}
            isLoading={extendingCase === null}
          />
        )}

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

        {allClassified && cases.length > 0 && (
          <CaseFeedbackPanel
            cases={cases}
            readyCount={readyCount}
            pageCountByCase={pageCountByCase}
            isExtending={!!extendingCaseId}
            extendingDocType={extendingCase?.docType ?? null}
            onConfirm={confirmCase}
            onChange={updateCaseLabel}
            onAddMorePages={handleAddMorePages}
            onContinue={() => navigate('/dashboard')}
          />
        )}

        {allClassified && cases.length === 0 && (
          // Fallback for the rare case where classify succeeded but the
          // case RPC failed (logged server-side as case_rpc_error). Worker
          // is never blocked — same Continue path as before.
          <section className="mt-6 rounded-2xl border border-pc-border bg-pc-sage-soft p-4">
            <div className="text-pc-body font-medium text-pc-text">
              {counts.review_pending > 0
                ? 'Some need your check'
                : counts.failed > 0
                  ? 'Some couldn\'t be read'
                  : 'All set'}
            </div>
            <p className="mt-1 text-pc-caption text-pc-text">
              We saved your documents. Reading the values is the next step.
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

// ─────────────────────────────────────────────────────────────────
// VisualAnchor — Sprint M0.5-BUILD-03.
//
// Per ChatGPT critique 2026-05-01 Round 1 finding 3, when the worker
// arrives at /upload?case=X they need a persistent on-screen reminder
// of WHICH case they're extending. Mobile workers context-switch
// (notifications, lock-screen, returning to the tab) and the URL bar
// is hidden — the anchor card carries that context visually.
//
// Per Round 2 finding 3, the anchor MUST reflect the CURRENT case
// doc_type, not a stale value. The owning component refetches the
// case data on every mount; this component just renders what's passed.
// ─────────────────────────────────────────────────────────────────

function VisualAnchor({
  docType,
  isLoading,
}: {
  docType: string | null
  isLoading: boolean
}) {
  const label = docType ? docTypeLabel(docType) : 'Adding more pages'
  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-pc-border bg-pc-sage-soft px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-pc-sage">
        <FileText size={20} strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <div className="text-pc-body font-semibold text-pc-text">
          {isLoading ? '…' : label}
        </div>
        <div className="text-pc-caption text-pc-text-muted">
          Adding another page
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// CaseFeedbackPanel — Sprint M0.5-BUILD-01.
//
// First user-visible product moment after ADR-014 ratification: replaces
// the generic "All set" pill with case-specific feedback that names what
// the system understood ("Type: Contract (suggested)") and gives the
// worker a confirm-or-change affordance.
//
// Per docs/planning/M0.5-ui-spec-v01.md PART 5.6 (Confirmed state) and
// the BUILD-01 brief — the [Change] override flow ships in BUILD-02/03;
// in BUILD-01 it's a placeholder toast.
// ─────────────────────────────────────────────────────────────────

function CaseFeedbackPanel({
  cases,
  readyCount,
  pageCountByCase,
  isExtending,
  extendingDocType,
  onConfirm,
  onChange,
  onAddMorePages,
  onContinue,
}: {
  cases: CaseEntry[]
  readyCount: number
  pageCountByCase: Record<string, number>
  isExtending: boolean
  extendingDocType: string | null
  onConfirm: (caseId: string) => Promise<boolean>
  onChange: (caseId: string, newDocType: string) => Promise<boolean>
  onAddMorePages: (caseId: string) => void
  onContinue: () => void
}) {
  // Sprint M0.5-BUILD-03: when the worker arrived via /upload?case=X,
  // the panel speaks a different sentence. "Page added!" + the existing
  // case type, never "Looks like X" — the classifier doesn't get a vote
  // here.
  if (isExtending && cases.length > 0) {
    const existing = cases[0]
    const pages = pageCountByCase[existing.caseId] ?? 1
    const typeLabel = docTypeLabel(extendingDocType ?? existing.docType)
    return (
      <section className="mt-6 flex flex-col gap-3">
        <div className="rounded-2xl border border-pc-border bg-pc-sage-soft p-4">
          <div className="text-pc-body font-medium text-pc-text">
            ✔ Page added!
          </div>
          <p className="mt-1 text-pc-caption text-pc-text">
            Your {typeLabel} now has {pages} {pages === 1 ? 'page' : 'pages'}.
          </p>
        </div>
        <div>
          <Button variant="primary" onClick={onContinue}>
            Continue
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="mt-6 flex flex-col gap-3">
      <div className="rounded-2xl border border-pc-border bg-pc-sage-soft p-4">
        <div className="text-pc-body font-medium text-pc-text">
          ✔ {cases.length === 1 ? 'You added a paper' : `You added ${cases.length} papers`}
        </div>
        <p className="mt-1 text-pc-caption text-pc-text">
          {readyCount === 1 ? '1 paper ready' : `${readyCount} papers ready`}
        </p>
      </div>

      {cases.map((c) => (
        <CaseCard
          key={c.caseId}
          entry={c}
          onConfirm={onConfirm}
          onChange={onChange}
          onAddMorePages={onAddMorePages}
        />
      ))}

      <div>
        <Button variant="secondary" onClick={onContinue}>
          Continue
        </Button>
      </div>
    </section>
  )
}

function CaseCard({
  entry,
  onConfirm,
  onChange,
  onAddMorePages,
}: {
  entry: CaseEntry
  onConfirm: (caseId: string) => Promise<boolean>
  onChange: (caseId: string, newDocType: string) => Promise<boolean>
  onAddMorePages: (caseId: string) => void
}) {
  const [pending, setPending] = useState(false)
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [revertedToast, setRevertedToast] = useState(false)

  const isConfirmed = entry.completionStatus === 'confirmed'
  const typeLabel = formatDocTypeLabel(entry.docType)
  const statusLabel = completionStatusLabel(entry.completionStatus)

  const handleLooksRight = useCallback(async () => {
    setPending(true)
    await onConfirm(entry.caseId)
    setPending(false)
  }, [entry.caseId, onConfirm])

  const handleChange = useCallback(() => {
    setOverrideOpen(true)
  }, [])

  // Sprint M0.5-BUILD-03 — optimistic UI per ChatGPT Round 1 finding 2.
  // Modal closes synchronously; updateCaseLabel paints the new state
  // first, then fires the RPC. On RPC failure the hook reverts the
  // local state and we surface a toast here.
  const handleOverrideSelect = useCallback(
    async (newDocType: string) => {
      setOverrideOpen(false)
      const ok = await onChange(entry.caseId, newDocType)
      if (!ok) {
        setRevertedToast(true)
        window.setTimeout(() => setRevertedToast(false), 3000)
      }
    },
    [entry.caseId, onChange],
  )

  return (
    <div className="rounded-2xl border border-pc-border bg-pc-surface p-4">
      <div className="text-pc-caption text-pc-text-muted">Type:</div>
      <div className="mt-0.5 text-pc-h2 font-semibold text-pc-text">
        {typeLabel}
        {!isConfirmed && (
          <span className="ml-2 align-middle text-pc-caption font-normal text-pc-text-muted">
            ({statusLabel.toLowerCase()})
          </span>
        )}
        {isConfirmed && (
          <span className="ml-2 align-middle text-pc-caption font-normal text-pc-sage">
            ✔ {statusLabel}
          </span>
        )}
      </div>

      {!isConfirmed && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            variant="primary"
            block
            onClick={handleLooksRight}
            disabled={pending}
          >
            {pending ? 'Saving…' : 'Looks right'}
          </Button>
          <Button variant="secondary" block onClick={handleChange}>
            Change
          </Button>
        </div>
      )}

      {isConfirmed && (
        <div className="mt-3">
          <Button variant="tertiary" onClick={handleChange}>
            Change
          </Button>
        </div>
      )}

      <div className="mt-3 border-t border-pc-border pt-3">
        <button
          type="button"
          onClick={() => onAddMorePages(entry.caseId)}
          className="text-pc-caption font-medium text-pc-navy underline hover:text-pc-navy-hover"
        >
          + Add more pages
        </button>
      </div>

      {revertedToast && (
        <div
          role="status"
          className="mt-3 rounded-xl border border-pc-amber-soft bg-pc-amber-soft px-3 py-2 text-pc-caption text-pc-text"
        >
          Couldn't save that — try again.
        </div>
      )}

      <OverrideModal
        open={overrideOpen}
        currentDocType={entry.docType}
        onSelect={handleOverrideSelect}
        onClose={() => setOverrideOpen(false)}
      />
    </div>
  )
}
