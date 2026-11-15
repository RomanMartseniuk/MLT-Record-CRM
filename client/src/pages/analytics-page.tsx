/**
 * Cost analytics: average / minimum / maximum cost of a repair, breakdowns
 * by equipment type, category, supplier and employee, and the trend.
 *
 * Only cost is shown (no margin, no profit). The filters are sent to the
 * server, which returns every number and chart already computed, including
 * the comparison with the preceding period.
 */

import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { EMPTY_FILTER, useAnalytics, useReference, useSession } from '@/api'
import type { DateRange, OrderStatusCode } from '@/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { CardsSkeleton, Skeleton } from '@/components/ui/skeleton'
import { HorizontalBars, TrendLineChart } from '@/components/common/charts'
import { InfoNote, PageBody, PageHeader } from '@/components/common/page'
import { PeriodFilter } from '@/components/common/period-filter'
import { Stat } from '@/components/common/stat'
import { formatMoney } from '@/lib/format'
import { ORDER_STATUS_LABELS } from '@/lib/labels'
import { rangeFor } from '@/lib/period'
import type { PeriodKey } from '@/lib/period'
import { useUi } from '@/store/ui-context'

const STATUS_ORDER: OrderStatusCode[] = ['inQueue', 'inWork', 'done', 'closed']

export function AnalyticsPage() {
  const { can } = useSession()
  const { data: reference } = useReference()
  const { toast } = useUi()

  const [period, setPeriod] = useState<PeriodKey>('month')
  const [custom, setCustom] = useState<DateRange>(() => rangeFor('month'))
  const [userId, setUserId] = useState(EMPTY_FILTER)
  const [categoryId, setCategoryId] = useState(EMPTY_FILTER)
  const [supplierId, setSupplierId] = useState(EMPTY_FILTER)
  const [assetType, setAssetType] = useState(EMPTY_FILTER)
  const [status, setStatus] = useState(EMPTY_FILTER)

  const range = useMemo(() => rangeFor(period, custom), [period, custom])
  const filters = useMemo(
    () => ({ range, userId, categoryId, supplierId, assetType, status }),
    [range, userId, categoryId, supplierId, assetType, status],
  )
  const { data, isLoading } = useAnalytics(filters)

  /** The export is simulated in the prototype; the real one will honour the same filters. */
  const exportNote = (format: string) => {
    toast(`Експорт у ${format}`, {
      description: 'У прототипі експорт імітується. Фільтри враховуються при формуванні звіту.',
    })
  }

  const stats = data?.stats
  let deltaLabel = ''
  if (data) {
    const delta = data.stats.totalKop - data.previousStats.totalKop
    deltaLabel =
      data.previousStats.totalKop === 0
        ? 'Попередній період без вкладень'
        : `${delta >= 0 ? '+' : '−'}${formatMoney(Math.abs(delta))} до попереднього періоду`
  }

  return (
    <PageBody>
      <PageHeader
        title="Аналітика собівартості"
        description="Тільки витрати на ремонти. Маржа та прибуток у першій версії не рахуються."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodFilter period={period} onPeriodChange={setPeriod} custom={custom} onCustomChange={setCustom} />
            {can('reports.export') ? (
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => exportNote('XLSX')}>
                  <Download />
                  XLSX
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportNote('CSV')}>
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportNote('PDF')}>
                  PDF
                </Button>
              </div>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Select
          aria-label="Співробітник"
          value={userId}
          onValueChange={setUserId}
          options={[
            { value: EMPTY_FILTER, label: 'Усі співробітники' },
            ...(reference?.employees ?? []).map((user) => ({ value: user.id, label: user.name })),
          ]}
        />
        <Select
          aria-label="Категорія"
          value={categoryId}
          onValueChange={setCategoryId}
          options={[
            { value: EMPTY_FILTER, label: 'Усі категорії' },
            ...(reference?.categories ?? []).map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <Select
          aria-label="Постачальник"
          value={supplierId}
          onValueChange={setSupplierId}
          options={[
            { value: EMPTY_FILTER, label: 'Усі постачальники' },
            ...(reference?.suppliers ?? []).map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <Select
          aria-label="Тип техніки"
          value={assetType}
          onValueChange={setAssetType}
          options={[
            { value: EMPTY_FILTER, label: 'Уся техніка' },
            ...(reference?.assetTypes ?? []).map((type) => ({ value: type, label: type })),
          ]}
        />
        <Select
          aria-label="Статус заявки"
          value={status}
          onValueChange={setStatus}
          options={[
            { value: EMPTY_FILTER, label: 'Усі статуси' },
            ...STATUS_ORDER.map((code) => ({ value: code, label: ORDER_STATUS_LABELS[code] })),
          ]}
        />
      </div>

      {isLoading || !data || !stats ? (
        <>
          <CardsSkeleton count={5} />
          <Skeleton className="h-72 w-full" />
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Ремонтів з вкладеннями" value={stats.count} hint="За фільтрами" />
            <Stat label="Середня собівартість" value={formatMoney(stats.avgKop)} hint="На один ремонт" />
            <Stat label="Мінімальна" value={formatMoney(stats.minKop)} hint="Найдешевший ремонт" />
            <Stat label="Максимальна" value={formatMoney(stats.maxKop)} hint="Найдорожчий ремонт" />
            <Stat label="Разом вкладено" value={formatMoney(stats.totalKop)} hint={deltaLabel} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Динаміка вкладень</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendLineChart data={data.series} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Собівартість за типами техніки</CardTitle>
              </CardHeader>
              <CardContent>
                <HorizontalBars data={data.byAssetType} emptyText="За фільтрами даних немає." />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Витрати за категоріями</CardTitle>
              </CardHeader>
              <CardContent>
                <HorizontalBars data={data.byCategory} emptyText="За цей період вкладень не було." />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Закупівлі за постачальниками</CardTitle>
              </CardHeader>
              <CardContent>
                <HorizontalBars data={data.bySupplier} emptyText="За цей період закупівель не було." />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Вкладення за співробітниками</CardTitle>
              </CardHeader>
              <CardContent>
                <HorizontalBars data={data.byEmployee} emptyText="За цей період вкладень не було." />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <InfoNote>
        Усі суми ведуть до вихідних операцій: відкрийте заявку або закупівлю, щоб побачити кожне списання з ціною
        партії.
      </InfoNote>
    </PageBody>
  )
}
