import { SignIn as ClerkSignIn } from '@clerk/clerk-react'

function SignIn() {
  return (
    <main className="min-h-screen bg-pc-bg text-pc-text font-sans p-6 grid place-items-center">
      <ClerkSignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        forceRedirectUrl="/dashboard"
      />
    </main>
  )
}

export default SignIn
