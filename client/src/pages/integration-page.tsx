/**
 * RO App integration page: status, the three ways to refresh data (webhook,
 * button, nightly run), the sync log and the reference lists.
 *
 * RO App is the source of orders, clients and equipment; this system only
 * reads. All three ways share one server operation (`useSync`); the source
 * is just a label in the log. Nothing is ever written back to RO App.
 */

import { useState } from 'react'
import { useIntegrationStatus, useReference, useSync } from '@/api'
import type { SyncSource } from '@/api'
import { Skeleton } from '@/components/ui/skeleton'
import { InfoNote, PageBody, PageHeader } from '@/components/common/page'
import { OrderTypesCard, StatusMappingCard } from '@/components/integration/reference-cards'
import { IntegrationStatusCard } from '@/components/integration/status-card'
import { SyncLogCard } from '@/components/integration/sync-log-card'
import { RefreshCard, WebhookCard } from '@/components/integration/sync-cards'
import { SYNC_SOURCE_LABELS } from '@/lib/labels'
import { useSingleFlight } from '@/lib/use-single-flight'
import { useUi } from '@/store/ui-context'

export function IntegrationPage() {
  const { data: status, isLoading } = useIntegrationStatus()
  const { data: reference } = useReference()
  const sync = useSync()
  const { toast } = useUi()
  const { run: guard } = useSingleFlight()
  const [running, setRunning] = useState<SyncSource | null>(null)

  /** Starts a synchronisation; a second click while one is running is ignored. */
  const runSync = (source: SyncSource) =>
    guard(async () => {
      setRunning(source)
      try {
        const result = await sync.mutateAsync(source)
        if (!result.ok) {
          toast(result.error, { tone: 'error' })
          return
        }
        toast(`${SYNC_SOURCE_LABELS[source]}: оновлення виконано`, {
          description: `Додано ${result.value.added}, оновлено ${result.value.updated}. Повторна синхронізація не створює дублікатів.`,
          tone: 'success',
        })
      } finally {
        setRunning(null)
      }
    })

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

      {isLoading || !status ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <IntegrationStatusCard status={status} />
            <WebhookCard settings={status.settings} running={running} onRun={(source) => void runSync(source)} />
            <RefreshCard settings={status.settings} running={running} onRun={(source) => void runSync(source)} />
          </div>

          <SyncLogCard log={status.log} />
        </>
      )}

      {reference ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <StatusMappingCard mappings={reference.statusMappings} />
          <OrderTypesCard types={reference.orderTypes} />
        </div>
      ) : null}
    </PageBody>
  )
}
