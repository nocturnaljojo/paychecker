import { useUser } from '@clerk/clerk-react'
import { cn } from '@/lib/utils'

/**
 * Sprint M0.5-BUILD-05 — Identity indicator.
 *
 * Renders "Your account: jo…@gmail.com" subtly so the worker always
 * knows which Clerk account they're signed into. Doubles as the
 * diagnostic for mobile vs web data mismatches: when the indicator
 * shows a different email on each device, the cause is account
 * mismatch — no SQL inspection needed.
 *
 * Vocabulary per ChatGPT round 4 critique: "Your account:" (shorter,
 * ESL-friendlier than "Signed in as:") and ellipsis "…" (cleaner than
 * "***" obscuring).
 *
 * Loading state: "Your account: …" — never break layout while Clerk
 * loads.
 */
export function IdentityIndicator({ className }: { className?: string }) {
  const { isLoaded, user } = useUser()

  const email = user?.primaryEmailAddress?.emailAddress
  const display = !isLoaded || !email ? '…' : obscureEmail(email)

  return (
    <div
      className={cn(
        'truncate text-[12px] leading-snug text-pc-text-muted',
        className,
      )}
    >
      Your account: <span className="font-mono">{display}</span>
    </div>
  )
}

function obscureEmail(email: string): string {
  if (!email.includes('@')) return email
  const atIndex = email.indexOf('@')
  const local = email.slice(0, atIndex)
  const domain = email.slice(atIndex + 1)
  if (local.length === 0) return email
  if (local.length <= 2) return `${local}…@${domain}`
  return `${local.slice(0, 2)}…@${domain}`
}
