import { InfoNote } from '@/components/common/page'

/** Shown at the top of the allocation dialogs when the order is issued ("Видано"). */
export function ClosedOrderNote({ locked }: { locked: boolean }) {
  if (!locked) return null
  return (
    <InfoNote className="mb-4">
      Заявка закрита. Зміна вкладень можлива лише з правом «Зміна вкладень у закритій заявці» і обовʼязковою
      причиною — вона збережеться в журналі.
    </InfoNote>
  )
}
