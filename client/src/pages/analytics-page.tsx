import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { HorizontalBars, TrendLineChart } from '@/components/common/charts'
import { InfoNote, PageBody, PageHeader } from '@/components/common/page'
import { PeriodFilter } from '@/components/common/period-filter'
import { Stat } from '@/components/common/stat'
import {
  EMPTY_FILTER,
  categoryBreakdown,
  costByAssetType,
  costByEmployee,
  costBySupplier,
  costStats,
  filteredOrderIds,
  moneySeries,
  rangeFor,
} from '@/domain/calc'
import type { DateRange, PeriodKey } from '@/domain/calc'
import { ORDER_STATUS_LABELS } from '@/domain/labels'
import { formatMoney } from '@/lib/format'
import { unique } from '@/lib/utils'
import { useDb } from '@/store/db-store'
import { useUi } from '@/store/ui-store'
import type { OrderStatusCode } from '@/domain/types'

const STATUS_ORDER: OrderStatusCode[] = ['inQueue', 'inWork', 'done', 'closed']

function previousRange(range: DateRange): DateRange {
  const from = new Date(range.from).getTime()
  const to = new Date(range.to).getTime()
  const length = to - from
  return {
    from: new Date(from - length).toISOString(),
    to: new Date(from - 1).toISOString(),
  }
}

export function AnalyticsPage() {
  const { db, has } = useDb()
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

  const orderIds = useMemo(() => filteredOrderIds(db, filters), [db, filters])
  const stats = useMemo(() => costStats(db, orderIds), [db, orderIds])

  const prevRange = useMemo(() => previousRange(range), [range])
  const prevOrderIds = useMemo(
    () => filteredOrderIds(db, { ...filters, range: prevRange }),
    [db, filters, prevRange],
  )
  const prevStats = useMemo(() => costStats(db, prevOrderIds), [db, prevOrderIds])

  const byAssetType = useMemo(() => costByAssetType(db, orderIds), [db, orderIds])
  const byCategory = useMemo(() => categoryBreakdown(db, range), [db, range])
  const bySupplier = useMemo(() => costBySupplier(db, range), [db, range])
  const byEmployee = useMemo(() => costByEmployee(db, range), [db, range])
  const series = useMemo(() => moneySeries(db, range), [db, range])

  const assetTypes = useMemo(() => unique(db.assets.map((asset) => asset.type)).sort(), [db.assets])

  const delta = stats.totalKop - prevStats.totalKop
  const deltaLabel =
    prevStats.totalKop === 0
      ? 'Попередній період без вкладень'
      : `${delta >= 0 ? '+' : '−'}${formatMoney(Math.abs(delta))} до попереднього періоду`

  const exportNote = (format: string) => {
    toast(`Експорт у ${format}`, {
      description: 'У прототипі експорт імітується. Фільтри враховуються при формуванні звіту.',
    })
  }

  return (
    <PageBody>
      <PageHeader
        title="Аналітика собівартості"
        description="Тільки витрати на ремонти. Маржа та прибуток у першій версії не рахуються."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodFilter period={period} onPeriodChange={setPeriod} custom={custom} onCustomChange={setCustom} />
            {has('reports.export') ? (
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
            ...db.users.map((user) => ({ value: user.id, label: user.fullName })),
          ]}
        />
        <Select
          aria-label="Категорія"
          value={categoryId}
          onValueChange={setCategoryId}
          options={[
            { value: EMPTY_FILTER, label: 'Усі категорії' },
            ...db.categories
              .filter((item) => item.kind === 'product')
              .map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <Select
          aria-label="Постачальник"
          value={supplierId}
          onValueChange={setSupplierId}
          options={[
            { value: EMPTY_FILTER, label: 'Усі постачальники' },
            ...db.suppliers.map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <Select
          aria-label="Тип техніки"
          value={assetType}
          onValueChange={setAssetType}
          options={[
            { value: EMPTY_FILTER, label: 'Уся техніка' },
            ...assetTypes.map((type) => ({ value: type, label: type })),
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
            <TrendLineChart data={series} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Собівартість за типами техніки</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBars data={byAssetType} emptyText="За фільтрами даних немає." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Витрати за категоріями</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBars data={byCategory} emptyText="За цей період вкладень не було." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Закупівлі за постачальниками</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBars data={bySupplier} emptyText="За цей період закупівель не було." />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Вкладення за співробітниками</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBars data={byEmployee} emptyText="За цей період вкладень не було." />
          </CardContent>
        </Card>
      </div>

      <InfoNote>
        Усі суми ведуть до вихідних операцій: відкрийте заявку або закупівлю, щоб побачити кожне списання з ціною
        партії.
      </InfoNote>
    </PageBody>
  )
}
