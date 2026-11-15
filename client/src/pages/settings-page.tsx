/**
 * Settings page: organisation and integration parameters, theme and demo data reset.
 * Text fields are saved when they lose focus; selects and switches save at once.
 */

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useResetDemoData, useSettings, useUpdateSettings } from '@/api'
import type { Settings } from '@/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/toggle'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { InfoNote, PageBody, PageHeader } from '@/components/common/page'
import { useUi } from '@/store/ui-context'

export function SettingsPage() {
  const { data: settings } = useSettings()
  const updateSettings = useUpdateSettings()
  const resetDemo = useResetDemoData()
  const { theme, toggleTheme, toast } = useUi()
  const [resetOpen, setResetOpen] = useState(false)

  /**
   * Values the user changed but the server has not confirmed yet.
   * Typing goes here first, so an input never jumps back to the old server
   * value while a request is in flight; the field is saved when it loses focus.
   */
  const [draft, setDraft] = useState<Partial<Settings>>({})

  if (!settings) {
    return (
      <PageBody>
        <PageHeader title="Налаштування" description="Загальні параметри системи" />
        <Skeleton className="h-64 w-full" />
      </PageBody>
    )
  }

  /** The value to show: the unsaved draft if there is one, otherwise the server's. */
  const field = <K extends keyof Settings>(key: K): Settings[K] =>
    (key in draft ? draft[key] : settings[key]) as Settings[K]

  const clearDraft = (keys: Array<keyof Settings>) =>
    setDraft((current) => {
      const next = { ...current }
      for (const key of keys) delete next[key]
      return next
    })

  /** Remembers a change locally and sends it to the server right away. */
  const saveNow = (patch: Partial<Settings>) => {
    setDraft((current) => ({ ...current, ...patch }))
    updateSettings.mutate(patch, { onSettled: () => clearDraft(Object.keys(patch) as Array<keyof Settings>) })
  }

  /** Saves a text field that was edited, once the user leaves it. */
  const saveField = (key: keyof Settings) => {
    if (!(key in draft)) return
    if (draft[key] === settings[key]) {
      clearDraft([key])
      return
    }
    saveNow({ [key]: draft[key] } as Partial<Settings>)
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
                value={field('orgName')}
                onChange={(event) => setDraft((current) => ({ ...current, orgName: event.target.value }))}
                onBlur={() => saveField('orgName')}
              />
            </Field>
            <Field label="Валюта" hint="У першій версії лише гривня">
              <Select
                value={field('currency')}
                onValueChange={(value) => saveNow({ currency: value })}
                options={[{ value: 'UAH', label: 'UAH — гривня (₴)' }]}
              />
            </Field>
            <Field label="Часовий пояс">
              <Select
                value={field('timeZone')}
                onValueChange={(value) => saveNow({ timeZone: value })}
                options={[
                  { value: 'Europe/Kyiv', label: 'Europe/Kyiv' },
                  { value: 'Europe/Warsaw', label: 'Europe/Warsaw' },
                  { value: 'UTC', label: 'UTC' },
                ]}
              />
            </Field>
            <Field label="Формат дати">
              <Select
                value={field('dateFormat')}
                onValueChange={(value) => saveNow({ dateFormat: value })}
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
              <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} label="Темна тема" />
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
                  value={field('nightlySyncTime')}
                  onChange={(event) => setDraft((current) => ({ ...current, nightlySyncTime: event.target.value }))}
                  onBlur={() => saveField('nightlySyncTime')}
                />
              </Field>
              <Switch
                checked={field('webhookEnabled')}
                onCheckedChange={(value) => saveNow({ webhookEnabled: value })}
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
        onConfirm={async () => {
          await resetDemo.mutateAsync()
          toast('Демо-дані скинуто', { tone: 'success' })
          return { ok: true }
        }}
      />
    </PageBody>
  )
}
