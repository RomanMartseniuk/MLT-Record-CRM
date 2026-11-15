/**
 * The two ways to trigger a synchronisation by hand, besides the real ones:
 * a simulated incoming webhook, and the global refresh button (with the
 * nightly run). All of them go through one API call; `source` only labels
 * the log entry.
 */

import { Check, Clock, Loader2, Moon, RefreshCw, Webhook } from 'lucide-react'
import type { IntegrationStatus, SyncSource } from '@/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'

/** What the cards need to start a run and show which one is running. */
export interface SyncControls {
  /** The source that is running now, or null. */
  running: SyncSource | null
  onRun: (source: SyncSource) => void
}

/** The next time the nightly run will fire, from the configured "HH:MM". */
function nextNightlyRun(time: string): string {
  const [hours, minutes] = time.split(':').map((part) => Number(part))
  const next = new Date()
  next.setHours(hours, minutes, 0, 0)
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1)
  return next.toISOString()
}

export function WebhookCard({ settings, running, onRun }: SyncControls & { settings: IntegrationStatus['settings'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="size-4" />
          Вебхуки
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {settings.webhookEnabled ? (
            <Badge variant="success">
              <Check />
              Увімкнено
            </Badge>
          ) : (
            <Badge variant="warning">Вимкнено</Badge>
          )}
        </div>
        <p className="break-all rounded-md bg-muted p-2 text-xs text-muted-foreground">{settings.webhookUrl}</p>
        <p className="text-xs text-muted-foreground">
          Зміни приходять у реальному часі. Ендпоінт перевіряє підпис або секрет запиту.
        </p>
        <Button variant="outline" onClick={() => onRun('webhook')} disabled={running !== null}>
          {running === 'webhook' ? <Loader2 className="animate-spin" /> : <Webhook />}
          Симулювати вхідний вебхук
        </Button>
      </CardContent>
    </Card>
  )
}

export function RefreshCard({ settings, running, onRun }: SyncControls & { settings: IntegrationStatus['settings'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="size-4" />
          Глобальне оновлення
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          Ручний запуск повної синхронізації заявок, клієнтів, техніки та довідників.
        </p>
        {running === 'manual' ? (
          <div className="h-2 w-full overflow-hidden rounded-sm bg-muted" role="progressbar" aria-label="Оновлення">
            <div className="h-full w-full animate-pulse rounded-sm bg-primary" />
          </div>
        ) : null}
        <Button onClick={() => onRun('manual')} disabled={running !== null}>
          {running === 'manual' ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          Оновити зараз
        </Button>

        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Moon className="size-4" />
            Нічне автооновлення
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            Щодня о {settings.nightlySyncTime} · наступний запуск{' '}
            {formatDateTime(nextNightlyRun(settings.nightlySyncTime))}
          </p>
          <p className="text-xs text-muted-foreground">Страховка на випадок пропущених вебхуків.</p>
          <Button variant="outline" size="sm" onClick={() => onRun('nightly')} disabled={running !== null}>
            {running === 'nightly' ? <Loader2 className="animate-spin" /> : <Moon />}
            Запустити як нічний
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
