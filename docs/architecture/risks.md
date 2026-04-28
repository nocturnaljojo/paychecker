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

## R-009 — Bulk-upload feature gap

- **Description.** A reasonable user expectation is "upload a folder of documents (payslips, contracts, super statements, bank statements all mixed) and PayChecker sorts each into the right bucket". PayChecker is **not designed for that** at the time R-009 was written; **superseded in spirit by ADR-013** (Sprint A1, 2026-04-29) which adopts upload-first with classification — the architecture R-009 warned against is now the design. The original residual concern (worker confusion if classification mis-buckets a document) is mitigated by ADR-013's confidence-bucketed routing (`auto_routed` ≥0.85 / `review_pending` 0.50–0.85 / `manual_required` <0.50) and worker-correction at the ROUTE review screen.
- **Blast radius.** User confusion, misclassified documents, stalled comparisons. If a worker bulk-uploads expecting auto-sort and we silently store everything as `other`, the comparison engine sees zero usable Layer 3 facts and refuses to run — potentially misread by the worker as "PayChecker is broken".
- **Current mitigation.** Pre-ADR-013: per-bucket upload entry points clearly labeled in the "Your data" home screen (each bucket card has a primary CTA: "Upload contract" / "Add payslip" / etc.). Post-ADR-013 (Sprint B1+): single upload zone with classification + routing review + manual escape hatch. `documents.doc_type` remains non-null and CHECK-constrained to a small enum so you can't store an "unsorted" document.
- **Residual risk.** Pre-ADR-013: MED. Post-ADR-013: LOW once Sprint B1–B3 ship the routing review surface; the routing review screen is the explicit answer to bulk-upload mis-classification anxiety.
- **Review trigger.** Post-ADR-013: first user feedback that classification is mis-bucketing in production; route to extraction-service-v01.md confidence-threshold tuning.

## R-010 — Anthropic API as data processor (document content boundary)

- **Description.** ADR-013's upload-first fact capture sends document content (payslip / contract / super statement / bank export / shift roster images and PDFs) to Anthropic's API for classification (Haiku 4.5) and extraction (Sonnet 4.6). Document content is PII + financial data; the moment it leaves Supabase boundary, it lives — for the duration of the API session — in Anthropic infrastructure. Risk: misconfiguration on either side could result in retention beyond the API session, training-on-customer-data without opt-in, or inadvertent disclosure to a third party that consumes the API on the same key.
- **Blast radius.** Single worker per affected document if isolated; potentially every uploaded document on the project's API key if a configuration error is systemic. Privacy Act APP 8 (cross-border disclosure) + APP 6 (use only as disclosed).
- **Current mitigation.** Anthropic API terms (as of 2026-04-29): no training on customer data without opt-in; data retention bounded by API session. PayChecker uses the API only for classification + extraction (per `docs/architecture/extraction-service-v01.md`); never analytics, never model training. Logging discipline enforces no document content in PayChecker's own logs (R-006 extension). Privacy policy v1 (Phase 0 finish-line) must list Anthropic as a data processor with a plain-language disclosure of what content travels and why.
- **Residual risk.** **MED at Phase 0; HIGH if scale grows without re-audit.** A privacy-policy v1 that describes the API call shape, retention bounds, and worker right to refuse upload + use the manual fallback path is a load-bearing mitigation. Without it, APP 1 + APP 5 are not satisfied for the upload-first surface.
- **Review trigger.** (a) Privacy policy v1 ratification (Phase 0 finish-line); (b) any change to Anthropic API terms or models; (c) first time a worker requests an upload-without-API-call alternative ("only manual entry, please") — Phase 1+ may need an explicit opt-out per worker.

## R-011 — Voyage AI as data processor (embedding generation boundary)

- **Description.** ADR-013 + `extraction-service-v01.md` add a separate Voyage AI API call (`voyage-3-large`, 1024-dim) to generate embeddings for Layer 4 cross-document reconciliation. Each successfully-classified document is embedded once. Document content travels to Voyage in addition to Anthropic. Risk: Voyage's API terms may differ from Anthropic's; a vendor-side change (acquisition, ToS update, deprecation) could shift the data boundary without notice.
- **Blast radius.** Single worker per document if isolated; every embedded document if Voyage's terms change retroactively. APP 6 + APP 8.
- **Current mitigation.** Voyage AI is a NEW data processor introduced by ADR-013 (not present pre-Sprint A3). Privacy policy v1 must list both Anthropic AND Voyage as data processors. Layer 4 has an explicit kill-switch (per `docs/architecture/layered-memory-v01.md`): set all `documents.embedding` to NULL, short-circuit the similarity query, and the pipeline degrades to no-reconciliation but continues working. Voyage → Cohere (or other 1024-dim provider) swap path is preserved by leaving `documents.embedding` nullable + the `extractor_version` filter on Layer 4 queries.
- **Residual risk.** **MED at Phase 0.** Sprint B2 may benchmark Voyage vs Cohere `embed-english-v3` (also 1024 dim) before launch and adjust; the architectural boundary documented here remains either way.
- **Review trigger.** (a) Privacy policy v1 ratification (same trigger as R-010); (b) Voyage acquisition / ToS change / deprecation; (c) any change to embedding model dimensionality (forces vector column re-create per migration 0011 ROLLBACK pattern).
