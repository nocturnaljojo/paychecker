import type { ReactNode } from 'react'
import { SignedIn, SignedOut, useAuth } from '@clerk/clerk-react'
import { Navigate, useLocation } from 'react-router-dom'

/**
 * Wraps a route so that signed-out users are redirected to /sign-in.
 *
 * Renders nothing during Clerk's initial auth-state load (isLoaded=false)
 * to avoid a flash of the protected content before the redirect fires.
 */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoaded } = useAuth()
  const location = useLocation()

  if (!isLoaded) return null

  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <Navigate to="/sign-in" replace state={{ from: location }} />
      </SignedOut>
    </>
  )
}

export default ProtectedRoute
