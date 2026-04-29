import ConsentRequired from '@/components/layout/ConsentRequired'
import { EmploymentContractScreen } from '@/features/buckets/employment-contract/EmploymentContractScreen'

export default function EmploymentContract() {
  return (
    <ConsentRequired>
      <EmploymentContractScreen />
    </ConsentRequired>
  )
}
