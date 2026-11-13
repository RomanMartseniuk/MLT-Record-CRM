import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/toggle'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { InfoNote, PageBody, PageHeader } from '@/components/common/page'
import { useDb } from '@/store/db-store'
import { useUi } from '@/store/ui-store'

export function SettingsPage() {
  const { db, mutate, reset } = useDb()
  const { theme, toggleTheme, toast } = useUi()
  const [resetOpen, setResetOpen] = useState(false)

  const update = (patch: Partial<typeof db.settings>) => {
    mutate((draft) => {
      draft.settings = { ...draft.settings, ...patch }
    })
  }

  return (
    <PageBody>
      <PageHeader title="Налаштування" description="Загальні параметри системи" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Організація</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="Назва організації">
              <Input
                value={db.settings.orgName}
                onChange={(event) => update({ orgName: event.target.value })}
              />
            </Field>
            <Field label="Валюта" hint="У першій версії лише гривня">
              <Select
                value={db.settings.currency}
                onValueChange={(value) => update({ currency: value })}
                options={[{ value: 'UAH', label: 'UAH — гривня (₴)' }]}
              />
            </Field>
            <Field label="Часовий пояс">
              <Select
                value={db.settings.timeZone}
                onValueChange={(value) => update({ timeZone: value })}
                options={[
                  { value: 'Europe/Kyiv', label: 'Europe/Kyiv' },
                  { value: 'Europe/Warsaw', label: 'Europe/Warsaw' },
                  { value: 'UTC', label: 'UTC' },
                ]}
              />
            </Field>
            <Field label="Формат дати">
              <Select
                value={db.settings.dateFormat}
                onValueChange={(value) => update({ dateFormat: value })}
                options={[
                  { value: 'ДД.ММ.РРРР', label: 'ДД.ММ.РРРР' },
                  { value: 'РРРР-ММ-ДД', label: 'РРРР-ММ-ДД' },
                ]}
              />
            </Field>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Інтерфейс</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
                label="Темна тема"
              />
              <InfoNote>
                Мобільний режим майстра перемикається кнопкою в шапці — зручно показувати клієнту з ноутбука.
              </InfoNote>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Інтеграція</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field label="Час нічного оновлення">
                <Input
                  type="time"
                  value={db.settings.nightlySyncTime}
                  onChange={(event) => update({ nightlySyncTime: event.target.value })}
                />
              </Field>
              <Switch
                checked={db.settings.webhookEnabled}
                onCheckedChange={(value) => update({ webhookEnabled: value })}
                label="Приймати вебхуки RO App"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Демо-дані</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                Прототип зберігає стан у браузері. Скидання повертає початковий набір заявок, закупівель і
                вкладень.
              </p>
              <Button variant="outline" onClick={() => setResetOpen(true)}>
                <RotateCcw />
                Скинути демо-дані
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        title="Скинути демо-дані?"
        warning="Усі зміни, зроблені в прототипі, будуть втрачені й заміняться початковим набором."
        confirmLabel="Скинути"
        tone="destructive"
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          reset()
          toast('Демо-дані скинуто', { tone: 'success' })
          return { ok: true }
        }}
      />
    </PageBody>
  )
}
