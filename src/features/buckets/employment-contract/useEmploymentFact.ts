import { useCallback, useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useSupabaseClient } from '@/lib/supabase'
import { ensureWorker } from '@/lib/upload'

const AWARD_CODE = 'MA000074'

export type AwardRate = {
  classification_code: string
  amount: number
  effective_from: string
  effective_to: string | null
  award_id: string
}

export type EmploymentForm = {
  legal_name: string
  abn: string
  classification_code: string | null
}

export type EmploymentFactState =
  | { status: 'loading' }
  | {
      status: 'first_time' | 'editing' | 'confirmed'
      workerId: string
      employerId: string | null
      factId: string | null
      form: EmploymentForm
      confirmedAt: string | null
    }

type Refs = {
  workerId: string
  employerId: string | null
  factId: string | null
}

// Single Layer 1 employer fact per worker for Phase 0 / Apete-shape scope.
// If/when multi-employer is in scope, this hook becomes a list manager.
export function useEmploymentFact() {
  const { user } = useUser()
  const supabase = useSupabaseClient()

  const [state, setState] = useState<EmploymentFactState>({ status: 'loading' })
  const [awardRates, setAwardRates] = useState<AwardRate[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [refs, setRefs] = useState<Refs>({
    workerId: '',
    employerId: null,
    factId: null,
  })
  // Serialize concurrent saves so two fast keystrokes can't double-INSERT
  // the employer/wcf rows. The ref is the source of truth during a save;
  // queued patches collapse so only the latest form state is persisted.
  const savingRef = useRef(false)
  const queuedPatchRef = useRef<Partial<EmploymentForm> | null>(null)
  const refsRef = useRef<Refs>(refs)
  refsRef.current = refs

  // ---------------------------------------------------------------
  // Mount: ensure worker, load award rates + existing fact.
  // ---------------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    if (!user) return

    async function load() {
      try {
        const workerId = await ensureWorker(supabase, user!.id)
        const { rates, awardId } = await fetchAwardRates(supabase)
        if (cancelled) return
        setAwardRates(rates.map((r) => ({ ...r, award_id: awardId })))

        const fact = await fetchLatestFact(supabase, workerId)
        if (cancelled) return

        if (!fact) {
          setRefs({ workerId, employerId: null, factId: null })
          setState({
            status: 'first_time',
            workerId,
            employerId: null,
            factId: null,
            form: { legal_name: '', abn: '', classification_code: null },
            confirmedAt: null,
          })
          return
        }

        const employer = await fetchEmployer(supabase, fact.employer_id)
        if (cancelled) return

        const form: EmploymentForm = {
          legal_name: employer?.legal_name ?? '',
          abn: employer?.abn ?? '',
          classification_code: fact.classification_code,
        }
        setRefs({
          workerId,
          employerId: fact.employer_id,
          factId: fact.id,
        })
        setState({
          status: fact.confirmed_at ? 'confirmed' : 'editing',
          workerId,
          employerId: fact.employer_id,
          factId: fact.id,
          form,
          confirmedAt: fact.confirmed_at,
        })
      } catch (err) {
        if (cancelled) return
        setErrorMessage(err instanceof Error ? err.message : String(err))
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [user, supabase])

  // ---------------------------------------------------------------
  // save({ field, value }): persist a single field touch.
  // First call to a field that requires an employer (legal_name) creates
  // the employer row + the proposed wcf row in one go. Subsequent calls
  // update.
  //
  // ABN-only first-touches are deferred to local state until legal_name
  // is provided, because employers.legal_name is NOT NULL and we don't
  // want a placeholder name (would surface as "(unnamed)" if the worker
  // never returned to fill it in — worse than no row at all).
  // ---------------------------------------------------------------
  const save = useCallback(
    async (patch: Partial<EmploymentForm>) => {
      if (state.status === 'loading') return
      setErrorMessage(null)

      const nextForm: EmploymentForm = { ...state.form, ...patch }

      // Optimistic local update — proposed-state UX should never feel laggy.
      setState({ ...state, form: nextForm })

      // If a save is already in-flight, fold this patch into the queue and bail.
      // The in-flight save will drain the queue when it finishes.
      if (savingRef.current) {
        queuedPatchRef.current = {
          ...(queuedPatchRef.current ?? {}),
          ...patch,
        }
        return
      }
      savingRef.current = true

      try {
        const { workerId } = refsRef.current
        let { employerId, factId } = refsRef.current

        // Need legal_name before we can create employer + wcf rows.
        const haveName = nextForm.legal_name.trim().length > 0
        if (!haveName) return

        // (a) Ensure employer.
        if (!employerId) {
          const ins = await supabase
            .from('employers')
            .insert({
              legal_name: nextForm.legal_name.trim(),
              abn: nextForm.abn.trim() || null,
            })
            .select('id')
            .single()
          if (ins.error) throw ins.error
          employerId = ins.data.id as string
        } else {
          // Update employer fields if they changed.
          const upd = await supabase
            .from('employers')
            .update({
              legal_name: nextForm.legal_name.trim(),
              abn: nextForm.abn.trim() || null,
            })
            .eq('id', employerId)
          if (upd.error) throw upd.error
        }

        // (b) Ensure proposed-state worker_classification_facts row.
        if (!factId) {
          const ins = await supabase
            .from('worker_classification_facts')
            .insert({
              worker_id: workerId,
              employer_id: employerId,
              provenance: 'worker_entered',
              classification_code: nextForm.classification_code,
            })
            .select('id')
            .single()
          if (ins.error) throw ins.error
          factId = ins.data.id as string
        } else if (
          'classification_code' in patch &&
          patch.classification_code !== undefined
        ) {
          const upd = await supabase
            .from('worker_classification_facts')
            .update({ classification_code: patch.classification_code })
            .eq('id', factId)
          if (upd.error) throw upd.error
        }

        setRefs({ workerId, employerId, factId })
        setState((prev) =>
          prev.status === 'loading'
            ? prev
            : {
                status: prev.status === 'confirmed' ? 'editing' : prev.status,
                workerId,
                employerId,
                factId,
                form: prev.form,
                confirmedAt:
                  prev.status === 'confirmed' ? null : prev.confirmedAt,
              },
        )
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : String(err))
      } finally {
        savingRef.current = false
        const queued = queuedPatchRef.current
        queuedPatchRef.current = null
        if (queued) {
          // Drain the latest queued patch.
          void save(queued)
        }
      }
    },
    [state, supabase],
  )

  // ---------------------------------------------------------------
  // confirm(): set confirmed_at + ensure all required fields populated.
  // CHECK constraint enforces classification_code/award_id/effective_from
  // are NOT NULL on confirmed rows. Trigger trusts NEW.confirmed_at when
  // OLD is NULL (proposed-state) per migration 0010.
  // ---------------------------------------------------------------
  const confirm = useCallback(async () => {
    if (state.status === 'loading') return
    if (!refs.factId || !state.form.classification_code) return
    setErrorMessage(null)

    const rate = awardRates.find(
      (r) => r.classification_code === state.form.classification_code,
    )
    if (!rate) {
      setErrorMessage('Could not find the matching award rate.')
      return
    }

    try {
      const now = new Date().toISOString()
      const upd = await supabase
        .from('worker_classification_facts')
        .update({
          classification_code: state.form.classification_code,
          award_id: rate.award_id,
          effective_from: rate.effective_from,
          confirmed_at: now,
        })
        .eq('id', refs.factId)
      if (upd.error) throw upd.error

      setState({ ...state, status: 'confirmed', confirmedAt: now })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
    }
  }, [state, refs, supabase, awardRates])

  // ---------------------------------------------------------------
  // edit(): UI-only switch from confirmed → editing. The first save()
  // will UPDATE the fact, which the trigger will auto-unconfirm.
  // ---------------------------------------------------------------
  const edit = useCallback(() => {
    setState((prev) =>
      prev.status === 'confirmed' ? { ...prev, status: 'editing' } : prev,
    )
  }, [])

  // ---------------------------------------------------------------
  // discard(): hard-delete fact + employer (Phase 0; no other facts
  // reference the employer in this scope). Returns to first-time state.
  // ---------------------------------------------------------------
  const discard = useCallback(async () => {
    if (state.status === 'loading') return
    setErrorMessage(null)
    try {
      if (refs.factId) {
        const del = await supabase
          .from('worker_classification_facts')
          .delete()
          .eq('id', refs.factId)
        if (del.error) throw del.error
      }
      if (refs.employerId) {
        const del = await supabase
          .from('employers')
          .delete()
          .eq('id', refs.employerId)
        if (del.error) throw del.error
      }
      setRefs({ workerId: refs.workerId, employerId: null, factId: null })
      setState({
        status: 'first_time',
        workerId: refs.workerId,
        employerId: null,
        factId: null,
        form: { legal_name: '', abn: '', classification_code: null },
        confirmedAt: null,
      })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
    }
  }, [state, refs, supabase])

  return {
    state,
    awardRates,
    errorMessage,
    save,
    confirm,
    edit,
    discard,
  }
}

// =========================================================================
// DB helpers
// =========================================================================

async function fetchAwardRates(supabase: SupabaseClient) {
  // 1) award row → id
  const award = await supabase
    .from('awards')
    .select('id')
    .eq('award_code', AWARD_CODE)
    .single()
  if (award.error) throw award.error
  const awardId = award.data.id as string

  // 2) currently-effective hourly rates
  const today = new Date().toISOString().slice(0, 10)
  const rates = await supabase
    .from('award_rates')
    .select('classification_code, amount, effective_from, effective_to')
    .eq('award_id', awardId)
    .eq('pay_basis', 'hourly')
    .lte('effective_from', today)
    .order('classification_code', { ascending: true })
  if (rates.error) throw rates.error

  return {
    awardId,
    rates: (rates.data ?? []).filter(
      (r) => !r.effective_to || r.effective_to >= today,
    ) as Array<{
      classification_code: string
      amount: number
      effective_from: string
      effective_to: string | null
    }>,
  }
}

async function fetchLatestFact(supabase: SupabaseClient, workerId: string) {
  // Phase 0 invariant: at most one Layer 1 fact per worker (proposed or
  // confirmed). If we ever break that invariant we'll surface it via order
  // and return the most-recent.
  const result = await supabase
    .from('worker_classification_facts')
    .select(
      'id, employer_id, classification_code, award_id, effective_from, confirmed_at',
    )
    .eq('worker_id', workerId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (result.error) throw result.error
  return result.data
}

async function fetchEmployer(supabase: SupabaseClient, employerId: string) {
  const result = await supabase
    .from('employers')
    .select('id, legal_name, abn')
    .eq('id', employerId)
    .maybeSingle()
  if (result.error) throw result.error
  return result.data
}
