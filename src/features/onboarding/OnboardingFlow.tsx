import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useSupabaseClient } from '@/lib/supabase'
import { Step1Welcome } from '@/features/onboarding/steps/Step1Welcome'
import { Step2What } from '@/features/onboarding/steps/Step2What'
import { Step3Share } from '@/features/onboarding/steps/Step3Share'
import { Step4Control } from '@/features/onboarding/steps/Step4Control'
import { Step5Isnt } from '@/features/onboarding/steps/Step5Isnt'
import {
  Step6Consent,
  type ConsentFormData,
} from '@/features/onboarding/steps/Step6Consent'
import { ONB_TOTAL } from '@/features/onboarding/Shell'
import { completeOnboarding } from '@/features/onboarding/complete'

const TOTAL = ONB_TOTAL

export function OnboardingFlow() {
  const { user } = useUser()
  const supabase = useSupabaseClient()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [data, setData] = useState<ConsentFormData>(() => ({
    name: user?.firstName ?? '',
    country: '',
    language: 'English',
  }))
  const [consent, setConsent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>()

  const next = () => setStep((s) => Math.min(s + 1, TOTAL))
  const back = () => setStep((s) => Math.max(s - 1, 1))
  // Skip on screens 1-5 jumps straight to screen 6 (consent still required).
  const skipToConsent = () => setStep(TOTAL)

  async function handleComplete() {
    if (!user) return
    setErrorMessage(undefined)
    setIsSubmitting(true)
    try {
      await completeOnboarding(supabase, user.id, data)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (step === 1) {
    return <Step1Welcome onNext={next} onSkip={skipToConsent} />
  }
  if (step === 2) {
    return <Step2What onBack={back} onNext={next} onSkip={skipToConsent} />
  }
  if (step === 3) {
    return <Step3Share onBack={back} onNext={next} onSkip={skipToConsent} />
  }
  if (step === 4) {
    return <Step4Control onBack={back} onNext={next} onSkip={skipToConsent} />
  }
  if (step === 5) {
    return <Step5Isnt onBack={back} onNext={next} onSkip={skipToConsent} />
  }
  return (
    <Step6Consent
      data={data}
      setData={setData}
      consent={consent}
      setConsent={setConsent}
      onBack={back}
      onSkip={skipToConsent}
      onComplete={handleComplete}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
    />
  )
}
