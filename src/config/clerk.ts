/**
 * Clerk runtime config.
 *
 * Reads VITE_CLERK_PUBLISHABLE_KEY at module-load time. If missing,
 * throws immediately — so the failure mode is "app fails to start
 * with a clear message", never "app boots and silently has no auth".
 *
 * The publishable key (pk_test_* / pk_live_*) is safe to ship in
 * client JS — that's what it's designed for. Secret keys (sk_*) MUST
 * NOT live in any VITE_* var; they would be bundled into the build.
 */

const KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined

if (!KEY) {
  throw new Error(
    'Missing VITE_CLERK_PUBLISHABLE_KEY. Copy .env.local.example to ' +
      '.env.local and set the publishable key from clerk.com.',
  )
}

if (!KEY.startsWith('pk_test_') && !KEY.startsWith('pk_live_')) {
  throw new Error(
    'VITE_CLERK_PUBLISHABLE_KEY must start with pk_test_ or pk_live_. ' +
      'If you pasted a key starting with sk_, it is a SECRET key and must ' +
      'never live in a VITE_* var — Vite bundles it into client JS.',
  )
}

export const clerkPublishableKey: string = KEY
