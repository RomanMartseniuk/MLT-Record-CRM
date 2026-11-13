import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Check, Clock, Loader2, Moon, RefreshCw, Webhook } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  TableWrap,
} from '@/components/ui/table'
import { InfoNote, PageBody, PageHeader } from '@/components/common/page'
import { ORDER_STATUS_LABELS, SYNC_SOURCE_LABELS } from '@/domain/labels'
import { syncRoApp } from '@/domain/ops'
import { formatDateTime } from '@/lib/format'
import { useDb } from '@/store/db-store'
import { useUi } from '@/store/ui-store'
import type { SyncSource } from '@/domain/types'

function nextNightlyRun(time: string): string {
  const [hours, minutes] = time.split(':').map((part) => Number(part))
  const next = new Date()
  next.setHours(hours, minutes, 0, 0)
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1)
  return next.toISOString()
}

export function IntegrationPage() {
  const { db, apply, currentUser } = useDb()
  const { toast } = useUi()
  const [progress, setProgress] = useState(0)
  const [running, setRunning] = useState<SyncSource | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
    },
    [],
  )

  const run = (source: SyncSource) => {
    if (!currentUser || running) return
    setRunning(source)
    setProgress(0)

    let value = 0
    timerRef.current = window.setInterval(() => {
      value += 12
      setProgress(Math.min(100, value))
      if (value >= 100) {
        if (timerRef.current !== null) window.clearInterval(timerRef.current)
        timerRef.current = null
        const result = apply((draft) => syncRoApp(draft, source, currentUser.id))
        setRunning(null)
        setProgress(0)
        if (result.ok) {
          toast(`${SYNC_SOURCE_LABELS[source]}: оновлення виконано`, {
            description: `Додано ${result.value.added}, оновлено ${result.value.updated}. Повторна синхронізація не створює дублікатів.`,
            tone: 'success',
          })
        }
      }
    }, 120)
  }

  const lastOk = db.syncLog.find((entry) => entry.ok)
  const lastFailed = db.syncLog.find((entry) => !entry.ok)

  return (
    <PageBody>
      <PageHeader
        title="Інтеграція RO App"
        description="RO App — джерело заявок, клієнтів і техніки. MLT Облік лише читає дані."
      />

      <InfoNote>
        Назад у RO App нічого не записується. Якщо RO App недоступний, система продовжує працювати на вже
        завантажених даних, а фінансові операції не втрачаються.
      </InfoNote>

      <div className="grid gap-4 lg:grid-cols-3">
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
              <span className="tabular-nums">{db.orders.length}</span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-muted-foreground">Клієнтів</span>
              <span className="tabular-nums">{db.clients.length}</span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-muted-foreground">Одиниць техніки</span>
              <span className="tabular-nums">{db.assets.length}</span>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="size-4" />
              Вебхуки
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              {db.settings.webhookEnabled ? (
                <Badge variant="success">
                  <Check />
                  Увімкнено
                </Badge>
              ) : (
                <Badge variant="warning">Вимкнено</Badge>
              )}
            </div>
            <p className="break-all rounded-md bg-muted p-2 text-xs text-muted-foreground">
              {db.settings.webhookUrl}
            </p>
            <p className="text-xs text-muted-foreground">
              Зміни приходять у реальному часі. Ендпоінт перевіряє підпис або секрет запиту.
            </p>
            <Button
              variant="outline"
              onClick={() => run('webhook')}
              disabled={running !== null}
            >
              {running === 'webhook' ? <Loader2 className="animate-spin" /> : <Webhook />}
              Симулювати вхідний вебхук
            </Button>
          </CardContent>
        </Card>

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
              <div className="h-2 w-full overflow-hidden rounded-sm bg-muted">
                <div
                  className="h-full rounded-sm bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            ) : null}
            <Button onClick={() => run('manual')} disabled={running !== null}>
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
                Щодня о {db.settings.nightlySyncTime} · наступний запуск{' '}
                {formatDateTime(nextNightlyRun(db.settings.nightlySyncTime))}
              </p>
              <p className="text-xs text-muted-foreground">
                Страховка на випадок пропущених вебхуків.
              </p>
              <Button variant="outline" size="sm" onClick={() => run('nightly')} disabled={running !== null}>
                {running === 'nightly' ? <Loader2 className="animate-spin" /> : <Moon />}
                Запустити як нічний
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Журнал синхронізації</CardTitle>
        </CardHeader>
        <CardContent>
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Час</TableHead>
                  <TableHead>Джерело</TableHead>
                  <TableHead>Результат</TableHead>
                  <TableHead className="text-right">Додано</TableHead>
                  <TableHead className="text-right">Оновлено</TableHead>
                  <TableHead>Деталі</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {db.syncLog.length === 0 ? (
                  <TableEmpty colSpan={6}>Записів ще немає</TableEmpty>
                ) : (
                  db.syncLog.slice(0, 20).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(entry.at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{SYNC_SOURCE_LABELS[entry.source]}</Badge>
                      </TableCell>
                      <TableCell>
                        {entry.ok ? (
                          <Badge variant="success">
                            <Check />
                            Успішно
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertCircle />
                            Помилка
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{entry.added}</TableCell>
                      <TableCell className="text-right tabular-nums">{entry.updated}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{entry.message ?? '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableWrap>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Довідник статусів RO App</CardTitle>
          </CardHeader>
          <CardContent>
            <TableWrap>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Значення в RO App</TableHead>
                    <TableHead>Локальний enum</TableHead>
                    <TableHead>Підпис</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {db.statusMappings.map((mapping) => (
                    <TableRow key={mapping.raw}>
                      <TableCell>
                        <code className="rounded-sm bg-muted px-1 py-0.5 text-xs">{mapping.raw}</code>
                      </TableCell>
                      <TableCell>
                        <code className="rounded-sm bg-muted px-1 py-0.5 text-xs">{mapping.local ?? '—'}</code>
                      </TableCell>
                      <TableCell>{mapping.local ? ORDER_STATUS_LABELS[mapping.local] : mapping.label}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableWrap>
            <InfoNote className="mt-3">
              Статуси не зашиті в код: вони читаються з довідника RO App. Незмаплене значення показується як є й
              нічого не ламає — приклад є у заявці зі статусом «on-hold».
            </InfoNote>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Довідник типів заявок</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {db.orderTypes.map((type) => (
                <Badge key={type.id} variant="outline">
                  {type.name}
                </Badge>
              ))}
            </div>
            <InfoNote className="mt-3">
              Типи заявок також беруться зі словника RO App, а не задаються вручну.
            </InfoNote>
          </CardContent>
        </Card>
      </div>
    </PageBody>
  )
}
