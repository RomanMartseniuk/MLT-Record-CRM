/**
 * "Integration status" card: when RO App was last read successfully, how much
 * data we hold, and the last error if there was one.
 */

import { AlertCircle } from 'lucide-react'
import type { IntegrationStatus } from '@/api'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'

export function IntegrationStatusCard({ status }: { status: IntegrationStatus }) {
  // The log is newest first, so the first match is the latest one.
  const lastOk = status.log.find((entry) => entry.ok)
  const lastFailed = status.log.find((entry) => !entry.ok)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Стан інтеграції</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted-foreground">Остання успішна синхронізація</span>
          <span>{lastOk ? formatDateTime(lastOk.at) : '—'}</span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted-foreground">Заявок завантажено</span>
          <span className="tabular-nums">{status.ordersCount}</span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted-foreground">Клієнтів</span>
          <span className="tabular-nums">{status.clientsCount}</span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted-foreground">Одиниць техніки</span>
          <span className="tabular-nums">{status.assetsCount}</span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted-foreground">Авторизація</span>
          <Badge variant="outline">Bearer-токен на сервері</Badge>
        </div>
        {lastFailed ? (
          <p className="mt-2 flex items-start gap-1 rounded-md border border-warning bg-warning/10 p-2 text-xs">
            <AlertCircle className="mt-0.5 size-3 shrink-0" />
            Остання помилка {formatDateTime(lastFailed.at)}: {lastFailed.message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
