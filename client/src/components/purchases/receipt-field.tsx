/**
 * The "receipt photo" field of the purchase form.
 *
 * In the prototype the photo is only previewed in the browser and the
 * purchase just remembers that a receipt exists (`hasReceipt`). Uploading
 * the file to the server is a later stage.
 */

import { Camera, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/input'

export interface ReceiptValue {
  name: string
  previewUrl: string
}

export function ReceiptField({
  value,
  onChange,
}: {
  value: ReceiptValue | null
  onChange: (value: ReceiptValue | null) => void
}) {
  return (
    <Field label="Фото чека">
      {value ? (
        <div className="flex items-center gap-2 rounded-md border border-border p-2">
          <img src={value.previewUrl} alt="Чек" className="size-12 rounded-sm object-cover" />
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{value.name}</span>
          <Button variant="ghost" size="icon-sm" aria-label="Прибрати фото" onClick={() => onChange(null)}>
            <X />
          </Button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground hover:bg-muted">
          <Camera className="size-4" />
          Додати фото чека
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files && event.target.files[0]
              if (!file) return
              onChange({ name: file.name, previewUrl: URL.createObjectURL(file) })
            }}
          />
        </label>
      )}
    </Field>
  )
}
