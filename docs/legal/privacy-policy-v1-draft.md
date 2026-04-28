# PayChecker Privacy Policy — v1 DRAFT

**Status:** DRAFT for lawyer review. **NOT effective** until reviewed + signed off.
**Date drafted:** 2026-04-29 (Sprint POL-001).
**Effective date:** TBD (post-lawyer review).
**Version:** v1.

**Source authorities:** ADR-006 (orient don't collect), ADR-013 (upload-first fact capture), `docs/architecture/document-intelligence-plan-v01.md`, `docs/architecture/storage-architecture-v01.md`, `docs/architecture/layered-memory-v01.md`, `docs/architecture/extraction-service-v01.md`, R-004 (worker safety), R-006 (ops debug), R-010 (Anthropic API processor), R-011 (Voyage AI processor).

---

## 1. Plain-English summary

**You upload documents about your pay. We read them so you don't have to type. We never share them with your employer. You can delete everything any time.**

PayChecker helps you check whether your pay matches what your award and contract say. To do that, we need to see your payslips, contracts, and other documents. We use AI services from Anthropic and Voyage to read your documents — they're not allowed to use your information for anything else, and the documents stay yours. Your data lives in Australia. You can see, fix, or delete your information whenever you want. We don't sell your data, ever. If you have questions, we're at the contact in section 11.

---

## 2. Who we are

**PayChecker is run by Jovi Draunimasi (sole operator) in Canberra, Australia.**

PayChecker is an information tool, not legal advice. We compute what your pay *should* be, based on what you tell us, and compare it to what your payslip *says*. The decisions about what to do with that information stay with you.

For complaints or questions about your privacy, the operator is the contact (see section 11). For complaints we can't resolve, the **Office of the Australian Information Commissioner (OAIC)** is the regulator: https://www.oaic.gov.au.

---

## 3. What data we collect + why

**We collect only what we need to compute your pay comparison. We tell you why each piece is collected at the moment we ask for it.**

| What | Why we need it | When we collect it |
|---|---|---|
| Email address (via Clerk) | Sign you in; recover your account | Sign-up |
| Your name + country of origin (optional) + preferred language | Personalise the app; your country and language are optional | Onboarding |
| Employer name + ABN | Match your work to the right Modern Award | When you add an employer or upload a contract |
| Award classification (e.g. Process Employee Level 2) | Look up the right hourly rate from the Fair Work Commission's tables | When you confirm your classification |
| Shifts you worked (start, end, breaks, type) | Compute expected pay for the period | When you log a shift or upload a roster |
| Payslip details (gross, net, tax, super, hours, allowances, deductions) | Compare with what we computed should have been paid | When you upload a payslip or enter values manually |
| Bank deposits from your employer (date, amount, last 4 of account, narration) | Confirm what actually arrived in your account | When you upload a bank statement |
| Super contributions (date, amount, fund) | Confirm your superannuation guarantee is being paid | When you upload a super statement |
| Documents themselves (payslips, contracts, super statements, bank exports, rosters) | Read the values from them automatically; act as proof if you ever need it | When you upload them |
| Document embeddings (a numeric fingerprint per document) | Help us notice when you've already uploaded the same document or when two uploads are pages of one document | Automatically after we read a document |
| Patterns we learn (per employer + per you) | Read your future documents more accurately over time | Automatically as we process documents |
| Comparison results (what we computed vs what your payslip says) | Show you the difference; provide a record you can take to the FWO or an advocate | When you run a comparison |
| Consent record | Prove you agreed to this policy | When you tap "I agree" at sign-up |

We do **not** collect:
- Your full bank account number (only the last 4 digits + bank name).
- Your Medicare number, Tax File Number, visa details, or passport.
- Your physical location (we don't track your phone).
- Anything we don't need for the pay comparison.

---

## 4. How we use your data

**We use your data to compute your pay comparison and show you the result. Nothing else.**

Specifically:
- **Reading your documents.** We send your uploaded documents to AI services (Anthropic and Voyage AI — see section 5) so they can read the values for you. You confirm what they read before we trust it.
- **Comparing pay.** We compute what your award says you should have been paid, compare it to what your payslip says, and show you the difference.
- **Making it work better over time.** We remember the format of your documents (per employer) and your preferences (per you) so future uploads work more accurately. These patterns are about *how documents look*, not *what's in them*.
- **Auditing what we did.** Every comparison is saved as an immutable snapshot. If your employer or an advocate ever asks "what did the app say on April 23rd and why?" — we can answer.

We do **not** use your data for:
- **Marketing.** We never email you offers or share your data with marketers.
- **Analytics on financial screens.** No third-party trackers run on screens that show your pay or money.
- **Training AI models.** Anthropic and Voyage AI are contractually required not to train on your data without your opt-in. We never opt in.
- **Sharing with your employer.** Your employer never sees that you use PayChecker.

---

## 5. Who we share data with (third-party processors)

**We use five service providers to make PayChecker work. They process your data on our behalf, only for the purposes below.**

| Provider | What we share | Why | Where they're based | Retention on their side |
|---|---|---|---|---|
| **Clerk** | Email + password + session tokens | Sign you in + manage your session | United States | As long as your account is active; deleted when you delete your account |
| **Supabase** | All your PayChecker data (encrypted at rest + transit) | Database + file storage | **Sydney, Australia** (ap-southeast-2 region) | As long as your account is active; deleted per section 6 |
| **Anthropic** | Document content (images + PDFs) during the API call | AI services that read your documents (Claude Haiku 4.5 for classification; Claude Sonnet 4.6 for extraction) | United States | Bounded by the API session per Anthropic's [API terms](https://www.anthropic.com/legal/commercial-terms); no training on your data |
| **Voyage AI** | Document content during the embedding call | Generates the numeric fingerprint of each document so we can notice duplicates and page-joins | United States | Bounded by the API session per Voyage's terms |
| **Vercel** | HTTP requests + cached static assets | Hosts the website and app | Global edge network | CDN cache (typically 1 hour); no persistent storage of your data |

**Anthropic and Voyage AI are AI processors that see your documents while reading them.** Each processes the document, returns the structured information, and does not retain it beyond the API session. We list both because the Privacy Act requires us to (APP 8 — disclosure of cross-border transfers). If you would rather not have your documents read by AI, you can choose **manual entry** for any bucket — we'll show you a form to type the values yourself, and we will not call Anthropic or Voyage for that document.

We do **not** share your data with:
- Your employer, ever. Even if your employer asks.
- The FWO, ATO, Centrelink, Medicare, immigration, or any other government agency, unless required by an enforceable subpoena, court order, or law (in which case we will tell you within 7 days unless legally prohibited).
- Researchers, journalists, advocates, unions, or other third parties without your explicit consent.

---

## 6. How long we keep your data

**Most data lives as long as your account does. Some data has shorter retention. You can delete most of it any time.**

| Data | Retention | What deletion means |
|---|---|---|
| Account data (email, name, country, language) | Until you delete your account | Hard-deleted within 30 days of your deletion request |
| Uploaded documents (payslips, contracts, etc.) | Until you delete them, or your account | Soft-deleted immediately on your request; hard-deleted within 30 days |
| Document content sent to Anthropic / Voyage | Bounded by the API session — typically minutes | Anthropic and Voyage do not persist your document content beyond the API call (per their terms) |
| Layer 2 patterns (per-employer document layout) | Retained even after you delete your account | These patterns describe an employer's document format, not your personal data. Removing them would degrade reading accuracy for the next worker at the same employer with no privacy benefit to you. |
| Layer 3 patterns (your preferences) | Deleted with your account | Cascades automatically when you delete your account; you can also delete individual preferences any time |
| Document embeddings (numeric fingerprints) | Deleted when the document is deleted | Cascades automatically |
| Comparison results (immutable snapshots) | 7 years (Australian Privacy Act minimum retention for financial records) | Snapshots are immutable by design — they protect you if you need to prove what the app told you on a given date. After 7 years they may be archived or anonymised. |
| Consent records | Retained as a legal audit trail | Cannot be deleted without breaking our APP 1 obligation |

**30-day deletion window.** When you ask us to delete your account or a document, the soft-delete is immediate (we stop using it) and the hard-delete (permanent removal from storage) happens within 30 days. We are working toward shorter windows in future versions.

---

## 7. How we keep your data secure

**Encryption everywhere. Strict access controls. No PII in logs. AU-region storage.**

- **Encryption.** All data is encrypted at rest (Supabase + Vercel storage) and in transit (TLS 1.2+ on every connection).
- **Access controls.** Postgres Row-Level Security (RLS) enforces that you can only read your own data. Even our database queries can't bypass these rules without service-role credentials, which the operator only uses for documented support purposes.
- **No PII in logs.** Our application logs contain only your worker UUID (an opaque identifier), not your name, email, payslip values, or document content. Audited every release.
- **AU region.** Your data lives in Supabase's Sydney (ap-southeast-2) region. Anthropic and Voyage process documents in transit only, never storing them.
- **Worker-safety design.** PayChecker has no employer-facing surface. We never email anyone, send push notifications, or display employer-side dashboards. If an abusive employer gains access to your phone, the app does not make your activity visible to them beyond what they would see on the screen.

We do not pretend our security is perfect. If you suspect your data has been accessed by someone you didn't authorise, contact us immediately (section 11) and consider:
- Changing your Clerk password.
- The Office of the Australian Information Commissioner (OAIC): https://www.oaic.gov.au/privacy/notifiable-data-breaches.

---

## 8. Your rights

**You can see, correct, or delete your data any time. You can also limit how we use it.**

Under the **Australian Privacy Principles (APPs)**, you have the following rights. We honour all of these.

| Right | What it means | How to use it |
|---|---|---|
| **APP 1 — Open + transparent** | We tell you what we collect and why | This policy + the in-app collection notice when each new data category is asked for |
| **APP 3 — Collection limited to disclosed purpose** | We don't collect what we don't need | Section 3 lists everything; if we ask for something not listed, refuse |
| **APP 5 — Notification at collection** | We tell you why at the moment we ask | The "What this app isn't" onboarding screen + per-bucket explanations |
| **APP 6 — Use only as disclosed** | We don't use your data for anything beyond what you saw at collection | Section 4 lists all uses |
| **APP 11 — Security** | We protect your data | Section 7 |
| **APP 12 — Access** | You can see all the data we hold about you | Tap "Your data" in the app to see everything; we'll respond to written access requests within 30 days |
| **APP 13 — Correction** | You can fix anything wrong | Edit any fact in the app; the edit unsets the confirmation, you re-confirm. For data you can't edit yourself (account email, etc.), email us |

**Specific rights:**

- **Delete your account.** "Your data" → "Delete my account". Your data is soft-deleted immediately and hard-deleted within 30 days. Layer 2 employer patterns (which contain no personal information about you) are retained; everything else is removed.
- **Delete a single document.** Tap any document → "Remove". Soft-deleted immediately, hard-deleted within 30 days.
- **Delete an extraction preference.** Tap "Your data" → "Patterns we learned" → tap any pattern → "Forget this". Removes that specific Layer 3 preference.
- **Refuse AI processing for a document.** Use the manual-entry form for the relevant bucket. We don't call Anthropic or Voyage for that document.
- **Export your data.** "Your data" → "Export everything" gives you a JSON file with all your data (Phase 0+: planned). For programmatic data subject requests, we respond within 7 days.
- **Withdraw consent.** Stop using PayChecker and delete your account. Your consent record is retained as a legal audit trail (section 6); your active data is removed.

If we deny any of these requests, we will tell you why in writing within 30 days. You can complain to the OAIC: https://www.oaic.gov.au/privacy/your-privacy-rights.

---

## 9. International data transfers

**Your data lives in Australia. The AI services that read your documents are based in the United States.**

- **Storage:** Supabase (Sydney, AU) holds your data at rest.
- **AI processing:** Anthropic (US) and Voyage AI (US) receive document content during the API call only. They do not store your documents beyond the API session per their terms.
- **Auth:** Clerk (US) holds your email + session tokens.
- **Hosting:** Vercel (global edge network) serves the website + app.

Per APP 8, we are required to take reasonable steps to ensure overseas recipients comply with the APPs. Anthropic, Voyage, Clerk, and Vercel all publish enterprise data-processing terms that align with the APPs, and we have selected them on that basis. If their terms change in a way that conflicts with this policy, we will update this policy and notify you.

---

## 10. Changes to this policy

**We will tell you when this policy changes. You'll get a chance to read the new version before it applies to you.**

When we update this policy:
- We bump the version number (v1 → v2 etc.).
- We change the **Effective date** at the top.
- We notify you in the app the next time you sign in: a banner asks you to read and accept the new version before continuing.
- A new consent record is created when you accept (per section 3).
- You can refuse the new version and delete your account.

We never apply policy changes retroactively to data already collected — your old data is governed by the policy version that was effective when you uploaded it.

---

## 11. How to contact us

**Email is best. Reply within 7 days for privacy requests.**

- **Privacy + data requests:** privacy@paychecker.app *(TBD — placeholder until we own the domain)*
- **General questions:** hello@paychecker.app *(TBD)*
- **Operator (Australia):** Jovi Draunimasi, Canberra, ACT.

For complaints we can't resolve:
- **Office of the Australian Information Commissioner (OAIC)**: https://www.oaic.gov.au — handles privacy complaints under the Privacy Act.
- **Fair Work Ombudsman** (for pay-comparison disputes — separate from privacy): 13 13 94 or https://www.fairwork.gov.au.

---

## 12. Effective date + version

- **Version:** v1 (DRAFT)
- **Date drafted:** 2026-04-29
- **Effective date:** TBD (post-lawyer review)
- **Previous versions:** none — this is v1.

---

## Notes for the operator (not part of the policy text)

These notes accompany the draft for the legal reviewer; remove before the policy ships.

**Outstanding decisions for the lawyer:**
1. Should we register PayChecker as a "small business operator" (turnover < $3M) under the Privacy Act? Phase 0 is below the threshold; Phase 1+ may cross it. Confirm whether registration changes our obligations.
2. The 30-day hard-delete window is internally documented but not yet implemented as an automated cron job (`storage-architecture-v01.md` lists this as a Phase 1+ item). Soft-delete is immediate. Should v1 of the policy state 30 days as a *commitment* or as a *target*?
3. The 7-year retention for comparison results is based on a conservative reading of Privacy Act + ATO record-keeping obligations. Confirm this is right for our specific use case (we are not the worker's accountant; we are an information tool).
4. We name Anthropic and Voyage as data processors. Their commercial-terms URLs (linked in section 5) need verification at the date of effective publication — cited terms can change.
5. The "right to refuse AI processing" is real architecturally (the manual-entry path exists per Sprint 7's `e949ce1` commit + ADR-013). The policy commits to this. Confirm wording is enforceable.
6. Anthropic's **opt-out from training** is described in our policy as "we never opt in." Confirm this matches Anthropic's current commercial-terms language and that the API key configuration reflects opt-out (Sprint B2 confirms in code).
7. Email addresses (privacy@, hello@) are placeholders — we don't own paychecker.app yet at the time of drafting. Replace with the operator's real address (Jovi's email) until the domain ships.
8. Children's data: PayChecker is for working adults under Australian Modern Awards. We don't market to or collect data from people under 18. Should we add an explicit "not for children under 18" section?
9. Layer 2 retention: we keep employer patterns even after a worker deletes their account, on the basis that the patterns contain no personal data about the worker. Confirm this analysis is correct under APP definitions of "personal information."

**Architecture review checklist** (for the operator's reference, not the lawyer):
- [ ] All 11 data categories from `REF-DB-schema.md` reflected in section 3? ✓
- [ ] All 5 processors from `extraction-service-v01.md` + `storage-architecture-v01.md` listed in section 5? ✓
- [ ] Retention timings match `storage-architecture-v01.md` + `layered-memory-v01.md` (account-deletion cascade)? ✓
- [ ] APPs 1, 3, 5, 6, 11, 12, 13 + Layer 3 deletion right addressed? ✓
- [ ] Plain-English check (Apete reading on a phone, ESL)? ✓ — no untranslated legalese
- [ ] No promises beyond what the architecture delivers (e.g., 30-day cron is a target until Phase 1+)? ✓ — note 2 above flags this
- [ ] R-004 (worker safety vs employer) addressed in section 7? ✓
- [ ] R-006 (operator support runbook) implicit in "documented support purposes" in section 7? ✓
- [ ] R-010 (Anthropic) + R-011 (Voyage) explicit in sections 5 + 9? ✓
