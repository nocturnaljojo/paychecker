import { SignUp as ClerkSignUp } from '@clerk/clerk-react'

function SignUp() {
  return (
    <main className="min-h-screen bg-pc-bg text-pc-text font-sans p-6 grid place-items-center">
      <ClerkSignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        forceRedirectUrl="/onboarding"
      />
    </main>
  )
}

export default SignUp
