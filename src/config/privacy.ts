/**
 * Privacy policy version pin.
 *
 * Bumped (with a new entry) every time the privacy policy text changes
 * meaningfully. consent_records.privacy_policy_version stores whichever
 * version the worker affirmatively consented to — re-prompting on a new
 * version is how we record renewed consent.
 *
 * v1 (2026-04-26) — placeholder body only; real text is a research-heavy
 * follow-up task that blocks ship-to-real-worker. Until v2 ships, every
 * `consent_records` row is pinned to v1 so we know which workers consented
 * before the real text existed.
 */
export const PRIVACY_POLICY_VERSION = 'v1'
