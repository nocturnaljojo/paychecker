import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useSupabaseClient } from '@/lib/supabase'
import {
  ensureWorker,
  uploadPayslip,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from '@/lib/upload'

type UploadState =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'success'; documentId: string; storagePath: string }
  | { kind: 'error'; message: string }

function Onboarding() {
  const { isLoaded, isSignedIn, user } = useUser()
  const supabase = useSupabaseClient()
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<UploadState>({ kind: 'idle' })

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
    <main className="min-h-screen bg-pc-bg text-pc-text font-sans p-6 max-w-2xl">
      <Link to="/" className="text-pc-caption text-pc-text-muted">
        ← Home
      </Link>

      {!isLoaded ? (
        <p className="text-pc-caption text-pc-text-muted mt-4">Loading…</p>
      ) : isSignedIn && user ? (
        <h1 className="text-pc-h1 font-semibold mt-4">
          Welcome, {user.firstName ?? user.username ?? 'there'}.
        </h1>
      ) : (
        <h1 className="text-pc-h1 font-semibold mt-4">Onboarding</h1>
      )}

      <p className="text-pc-body mt-2">
        Layer 1 facts capture (employer, classification, pay terms) goes here.
      </p>
      <p className="text-pc-caption text-pc-text-muted mt-1">
        Placeholder — wired in a later session per PLAN-PRJ-mvp-phases.md.
      </p>

      {isLoaded && isSignedIn && user && (
        <section className="mt-8 border-t border-pc-border pt-6">
          <h2 className="text-pc-h2 font-semibold">Upload a payslip (test)</h2>
          <p className="text-pc-caption text-pc-text-muted mt-1">
            PNG / JPEG / PDF, up to {MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.
            Phase 0 smoke-test UI; the real upload flow lands later.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <input
              type="file"
              accept={ALLOWED_MIME_TYPES.join(',')}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
                setState({ kind: 'idle' })
              }}
              className="block text-pc-body"
            />
            <button
              type="submit"
              disabled={!file || state.kind === 'uploading'}
              className="px-4 py-2 rounded-pc-button bg-pc-navy text-white disabled:opacity-50"
            >
              {state.kind === 'uploading' ? 'Uploading…' : 'Upload'}
            </button>
          </form>

          {state.kind === 'success' && (
            <pre className="mt-4 p-3 rounded-pc-card bg-pc-surface text-pc-caption overflow-x-auto">
              {`documentId:  ${state.documentId}\nstoragePath: ${state.storagePath}`}
            </pre>
          )}
          {state.kind === 'error' && (
            <p className="mt-4 text-pc-caption text-pc-coral">
              Error: {state.message}
            </p>
          )}
        </section>
      )}
    </main>
  )
}

export default Onboarding
