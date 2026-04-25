# SKILL-DOC-extraction

## Purpose
OCR + Claude extraction pipeline for payslips, contracts, super statements, bank deposits. Suggestions only — worker confirms.

## Trigger phrases
- "extract from payslip"
- "OCR this"
- "scan contract"
- Any flow that takes a document and proposes structured fields

## Hard rule
**Claude is never authoritative.** The extraction outputs *suggestions*. Until a worker confirms each suggestion (per `SKILL-FACT-confirmation.md`), the values are NOT calc-eligible.

## Pipeline shape

1. **Upload.** Worker uploads photo / PDF. File goes to Supabase Storage (encrypted, AU region) with strict RLS — only the owning worker + audit role can read.
2. **OCR.** Run text extraction (Tesseract or cloud OCR — TBD). Output: raw text + bounding boxes.
3. **Classify.** Lightweight pass: is this a payslip, a super statement, a bank export, a contract? Reject anything else with a clear message.
4. **Claude extract.** Send the text + a structured prompt asking for the field set we expect for that document type. Get JSON back.
5. **Validate.** Schema-check the JSON. If it doesn't match, do not surface — log and ask worker to re-upload or enter manually.
6. **Suggest.** Show the worker a confirmation form pre-filled with the extracted values. Each field shows "we read: $1,247.60 — confirm or edit".
7. **Confirm.** Worker confirms each field individually OR taps "all values look right" to confirm in bulk. `provenance = ocr_suggested_confirmed`.
8. **Persist.** Confirmed values write to the relevant fact table with provenance + the source-doc reference.

## Field sets by doc type

- **Payslip:** pay-period start/end, gross pay, net pay, hours worked, hourly rate, OT hours/rate, allowances, deductions, tax, super amount, super destination.
- **Super statement:** period, employer, contributions list (date, amount, source).
- **Bank deposit (CSV/PDF):** date, amount, narration, balance.
- **Contract:** classification, employer name + ABN, start date, employment type (casual/PT/FT), nominal hours, base rate (if stated), award reference.

## Privacy gates
- Storage encrypted at rest. Per-user RLS — no cross-user reads, ever.
- Document deleted on user request within 30 days; deletion cascades to fact references (which become orphaned, marked `source_doc_deleted`).
- LLM call sends ONLY the document text, NEVER the worker's identity or other facts.
- LLM provider configured for no-training-on-data.

## Common pitfalls
- Letting extracted values flow into calc tables without explicit confirm. Cardinal sin.
- Showing the worker a "review" screen but auto-confirming on next-tap. The tap must say "Confirm".
- Using Claude in a calculation path because "it's smart enough". It isn't and won't be.
- Logging the document content in plain text. Logs are sensitive too.
- Skipping the doc-type classification step — leads to garbage extraction on garbage input.

## Why this exists
OCR is helpful; LLMs are helpful; neither is correct enough to be authoritative. The worker stays in the driver's seat. This is also how we keep our regulatory category clean.
