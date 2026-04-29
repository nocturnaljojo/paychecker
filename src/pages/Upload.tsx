import ConsentRequired from '@/components/layout/ConsentRequired'
import { UploadZone } from '@/features/upload/UploadZone'

export default function Upload() {
  return (
    <ConsentRequired>
      <UploadZone />
    </ConsentRequired>
  )
}
