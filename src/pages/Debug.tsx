import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useSupabaseClient } from '@/lib/supabase'
import {
  ensureWorker,
  uploadPayslip,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from '@/lib/upload'
import { Button } from '@/components/ui/Button'

type UploadState =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'success'; documentId: string; storagePath: string }
  | { kind: 'error'; message: string }

/**
 * Dev-only smoke-test surface for the upload pipeline. Lifted off
 * /onboarding in s003 hour 3 once onboarding became the educational flow.
 * Production builds redirect to /dashboard via the route definition.
 */
export default function Debug() {
  const { isLoaded, isSignedIn, user } = useUser()
  const supabase = useSupabaseClient()
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<UploadState>({ kind: 'idle' })

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-pc-bg p-6">
        <p className="text-pc-caption text-pc-text-muted">Loading…</p>
      </main>
    )
  }

  if (!isSignedIn || !user) {
    return <Navigate to="/sign-in" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!file || !user) return
    setState({ kind: 'uploading' })
    try {
      const workerId = await ensureWorker(supabase, user.id)
      const result = await uploadPayslip(file, supabase, workerId)
      setState({ kind: 'success', ...result })
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return (
    <main className="min-h-screen bg-pc-bg p-6 max-w-2xl text-pc-text">
      <Link to="/dashboard" className="text-pc-caption text-pc-text-muted">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-pc-h1 font-semibold">Debug — upload pipeline</h1>
      <p className="mt-1 text-pc-caption text-pc-text-muted">
        Dev-only smoke surface. PNG / JPEG / PDF up to{' '}
        {MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <input
          type="file"
          accept={ALLOWED_MIME_TYPES.join(',')}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null)
            setState({ kind: 'idle' })
          }}
          className="block text-pc-body"
        />
        <Button
          type="submit"
          disabled={!file || state.kind === 'uploading'}
          variant="primary"
        >
          {state.kind === 'uploading' ? 'Uploading…' : 'Upload'}
        </Button>
      </form>

      {state.kind === 'success' && (
        <pre className="mt-4 overflow-x-auto rounded-pc-card bg-pc-surface p-3 text-pc-caption">
          {`documentId:  ${state.documentId}\nstoragePath: ${state.storagePath}`}
        </pre>
      )}
      {state.kind === 'error' && (
        <p className="mt-4 text-pc-caption text-pc-coral">
          Error: {state.message}
        </p>
      )}
    </main>
  )
}
