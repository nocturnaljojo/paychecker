# Architecture — risks

Failure modes the system must defend against. Different from `STATE-PRJ-issues.md` (those are bugs that exist now). These are things that could go wrong **by design** — categorical risks the architecture has to account for whether or not we've seen them yet.

**Format:** R-NNN | Description | Blast radius | Current mitigation | Residual risk | Review trigger.

Risks are append-only. If a risk is resolved or eliminated, mark it Resolved with a forward link to the change that did it; never delete.

---

## R-001 — OCR extracts wrong numbers

- **Description.** When the Phase 5 OCR pipeline lands, extracted values from a payslip / contract / super statement may be subtly wrong: dollar signs lost, decimals shifted, zero confused with O, hours misread as minutes. A wrong extraction that the worker confirms without spotting the typo lands in `*_facts` as `ocr_suggested_confirmed` and feeds the comparison engine as if it were ground truth.
- **Blast radius.** Single worker, single comparison output. Reputation impact if the worker takes a wrong number to FWO.
- **Current mitigation.** OCR not yet built (Phase 5). Architecture pre-mitigates: ADR-001 (LLM never authoritative), `ocr_suggested` ≠ `ocr_suggested_confirmed`, every confirm screen shows the source ("from your payslip — please check the $X figure").
- **Residual risk.** **HIGH at Phase 5 launch.** Workers will skim and confirm on a small phone screen. Expect a non-trivial confirm-without-reading rate.
- **Review trigger.** When OCR ships (Phase 5). Add a side-by-side "extracted vs original" view; require explicit confirm per field; surface low-confidence fields for re-entry rather than confirmation.

## R-002 — Award rates stale on FWC update

- **Description.** The FWC publishes Annual Wage Review variations around 1 June with rates effective 1 July. If our `award_rates` table doesn't reflect the new rates by 1 July, every comparison after that date computes against last year's rate. The number we surface is wrong without us knowing.
- **Blast radius.** Every active worker on the affected award, until the rates are updated. Highest regulatory + reputation risk in the system.
- **Current mitigation.** Manual process — `REF-AWARDS-list.md` documents the cadence. `researcher` agent slated to run scheduled (annual June–July sweep) once Phase 1 backend exists. Banner alert on the comparison output ("rates last reviewed YYYY-MM-DD") so reviewers can sanity-check against the current FWC consolidation.
- **Residual risk.** MED. Single-operator solo founder = single point of failure if Jovi misses the window. Mitigated partially by the banner, but the banner only catches it if the worker or advocate reads the date.
- **Review trigger.** Annually, between 1 June and 1 July. Also any out-of-cycle FWC variation order — re-research within 7 days of becoming aware.

## R-003 — Worker confirms wrong value (then notices later)

- **Description.** Worker mistyped or mis-confirmed a Layer 1 fact (wrong classification code, wrong start date) or a Layer 3 fact (mistyped a payslip line). Later realises the error.
- **Blast radius.** Comparisons run between the wrong-confirmation and the correction reflect the wrong value.
- **Current mitigation.** Edit a fact → trigger fires → row writes to `*_history` and `confirmed_at` clears → worker re-confirms → calc re-eligible. Past comparisons (immutable snapshots) preserve the value at the time they ran. UI surfaces "X facts changed since this comparison" on the affected comparison.
- **Residual risk.** LOW. The architecture is built for this; the cost is one extra screen ("re-confirm and re-run") and one extra comparison row.
- **Review trigger.** First real instance from Apete's actual usage. If the re-confirmation UX feels punishing, tune it.

## R-004 — Abusive employer accesses worker account

- **Description.** PALM-scheme employer who controls accommodation, visa sponsorship, and (often) the worker's phone or shared Wi-Fi gains physical access to the worker's PayChecker session — directly (forced unlock), via shoulder-surfing, or via a network device they control. Sees that the worker is checking pay, sees the gap, retaliates.
- **Blast radius.** Single worker, but with potential for cascading harm: visa cancellation, accommodation eviction, deportation. **The worst-blast-radius risk in the system.**
- **Current mitigation.** Affirmative-consent ceremony at onboarding ("What this app isn't" screen reinforces the worker is in control). RLS scopes data to the authenticated worker. Onboarding mock explicitly avoids displaying employer name/ABN unprompted (per `personas.md` design implications). No push notifications, no inbound emails, no employer-visible identifiers. Phase 0 is single-device — sign-in is per-device.
- **Residual risk.** **HIGH. Software cannot fully mitigate this.** The mitigation that matters is human: PALM advocacy organisations, the FWO's Visa Holders Information line, community legal centres. PayChecker's role is to not make the situation worse — never to claim it can solve it.
- **Review trigger.** Before any feature that could make the worker's PayChecker activity visible to a third party (push notifications, email summaries, shared dashboards, employer-side anything). Every such feature requires worker-safety review per CLAUDE.md rule 18 and a written pause-or-ship decision.

## R-005 — Worker treats output as legal advice

- **Description.** Worker reads "the difference is $X" as "you are owed $X, take it to your boss / FWO / a lawyer". The framing was meant as information; the worker hears advice. Acts on it. Damages a working relationship, files a wrong claim, or escalates without context.
- **Blast radius.** Single worker per incident; reputation harm to PayChecker if a pattern emerges.
- **Current mitigation.** ADR-003 codifies the information-tool framing. Diagnostic copy ("we found / your payslip shows / the difference is") banned-phrase list (no "you should", no "owed", no "wage theft"). Mandatory FWO 13 13 94 footer on every comparison output and PDF. "What this app isn't" onboarding screen.
- **Residual risk.** MED. Framing reduces but does not eliminate. ESL workers may read the screen literally and miss the diagnostic register; advocates skimming a PDF may extract just the dollar figure.
- **Review trigger.** First reported instance of a worker (or advocate, or journalist) treating PayChecker output as advice. Tighten copy; consider an "interpretation guidance" companion screen.

## R-006 — Privacy Act breach via support / debugging

- **Description.** Operator (Jovi or future support staff) has to debug a worker issue. The path of least resistance is to look at the worker's data — query the database with service-role credentials, read it locally, screenshot it for a Slack thread. PII leaves its scoped storage; APP 11 obligations breached.
- **Blast radius.** Single worker per incident — but a single incident is a regulator-grade breach.
- **Current mitigation.** RLS on every table; no service-role key in the repo (verified against `tasks/lessons.md` SEC-001). Service-role only in Supabase dashboard, future password manager (INFRA-003). Logs do not contain PII (per `REF-PRIVACY-baseline.md` rule 1). LLM calls strip identity before sending text (per APP 8 + the privacy baseline).
- **Residual risk.** MED while we have no ops runbook for "how to debug a worker issue without seeing the worker's data". Drops to LOW once we have an operator-facing read-redacted view + a documented support flow.
- **Review trigger.** Before Phase 1 onboarding of a second person to the project. Required artefact: `docs/operations/support-runbook.md` with the "debug without seeing PII" pattern.

## R-007 — Comparisons table grows unbounded

- **Description.** `comparisons` is immutable + insert-only by design. Apete running 1 comparison per fortnight = 26/year × N years × M workers. The `inputs_snapshot` jsonb on each row is non-trivial in size. Without an archive strategy, the table grows linearly and the indexes on it grow superlinearly.
- **Blast radius.** Performance degradation (Phase 1+); storage cost; eventually slow comparison list views.
- **Current mitigation.** ADR-005 (indexing not looping) keeps the comparison engine off the full table — the engine reads the snapshot of the comparison being computed, not the history. `comparisons_worker_id_idx` exists. Privacy Act 7-year retention provides a natural archive horizon.
- **Residual risk.** LOW at Phase 0 (one worker). Will become MED at Phase 2 (real volume). Plan: Phase 1 add `created_at`-based partial indexes; Phase 2 add cold-storage archival of comparisons older than 7 years (post Privacy Act minimum retention) with a path to restore on subject-access request.
- **Review trigger.** Any comparison list view that takes >500ms to render in production, or any Supabase storage alert that names this table.

## R-008 — Worker's primary device dies / lost / stolen

- **Description.** Apete loses his phone. New phone — wants his account, his comparisons, his uploaded payslips. Any data that lived only on the device is gone.
- **Blast radius.** Single worker; recoverable if the architecture is right.
- **Current mitigation.** Clerk owns session; recovery via email-on-file. No data persisted to device beyond the Clerk session — every fact, document, comparison lives in Supabase. Storage objects survive device loss. RLS gates the new device by JWT, not device fingerprint.
- **Residual risk.** LOW for data; MED for re-onboarding UX (a worker who lost their phone, lost their email password, and never set up Clerk recovery is a hard support case). Phase 0+1 should ensure email recovery is set during sign-up; Phase 2+ may add a recovery-code printout for advocates to keep on file.
- **Review trigger.** First real "I lost my phone" support case. Build the runbook from it.

## R-009 — Bulk-upload feature gap (NEW)

- **Description.** A reasonable user expectation is "upload a folder of documents (payslips, contracts, super statements, bank statements all mixed) and PayChecker sorts each into the right bucket". PayChecker is **not designed for that**. The current architecture assumes the worker uploads one document at a time per bucket and tells us what it is at upload time (`documents.doc_type`).
- **Blast radius.** User confusion, misclassified documents, stalled comparisons. If a worker bulk-uploads expecting auto-sort and we silently store everything as `other`, the comparison engine sees zero usable Layer 3 facts and refuses to run — potentially misread by the worker as "PayChecker is broken".
- **Current mitigation.** Per-bucket upload entry points clearly labeled in the "Your data" home screen (each bucket card has a primary CTA: "Upload contract" / "Add payslip" / etc.). No global "drop a folder here" surface exists. `documents.doc_type` is non-null and CHECK-constrained to a small enum so you can't store an "unsorted" document.
- **Residual risk.** MED. Phase 0 scope is locked; if a worker tries to bulk-upload via a future folder picker, the per-bucket CTAs reroute them. But a paid-tier worker (Phase 2 persona) is much more likely to have this expectation than Apete is.
- **Review trigger.** First user request for bulk-upload (founder feedback or user research). Decision must escalate via `SKILL-PRJ-idea-to-execution.md` — the doc-classification path is non-trivially LLM-shaped and would touch ADR-001 (which says LLM is never authoritative). Until that review, bulk-upload stays out of scope; the per-bucket CTAs are the answer.
