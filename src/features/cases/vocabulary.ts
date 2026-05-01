/**
 * Worker-facing vocabulary for document_cases.
 *
 * Sprint M0.5-BUILD-03. Single source of truth for:
 *  - completion_status enum  → worker-facing status label
 *  - detected_type token     → worker-facing type label
 *
 * Rules (per docs/document-case-paradigm-v01.md vocabulary lock +
 * ChatGPT critique 2026-05-01 Round 2 finding 4):
 *  - NEVER show raw enum values to workers.
 *  - NEVER show "Failed", "Validation", "Confidence", "Classification".
 *  - 'confirmed' renders as **"Saved"** — NOT "Ready".
 *    M0.5 doesn't determine completeness; "Saved" honestly says
 *    "we have it stored, we haven't checked you have everything".
 *    'complete' renders as "Ready" but is a placeholder for M1
 *    (we don't compute completeness in M0.5).
 */

import type { CaseCompletionStatus } from '@/features/upload/useCaseFeedback'

export function completionStatusLabel(status: CaseCompletionStatus): string {
  switch (status) {
    case 'draft':
    case 'suggested':
      return 'Not sure yet'
    case 'confirmed':
      return 'Saved'
    case 'partial':
      return 'Needs more pages'
    case 'complete':
      return 'Ready'
  }
}

export function docTypeLabel(docType: string | null | undefined): string {
  switch ((docType ?? '').toLowerCase()) {
    case 'contract':
      return 'Contract'
    case 'payslip':
      return 'Payslip'
    case 'super_statement':
      return 'Super'
    case 'bank_export':
      return 'Bank'
    case 'shift':
      return 'Shift'
    case 'other':
      return 'Other'
    default:
      return 'Other'
  }
}

/**
 * Worker-facing slug used in subject phrases ("Adding to your contract").
 * Lowercase form of docTypeLabel; preserves case in display where needed.
 */
export function docTypeSubject(docType: string | null | undefined): string {
  return docTypeLabel(docType).toLowerCase()
}
