/**
 * Dashboard: key numbers, charts and the latest operations for a period.
 *
 * Everything shown comes from the server in one response (`useDashboard`).
 * The main rule it illustrates: a purchase and an allocation are different
 * events and their sums are never added together.
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightLeft, Boxes, ShoppingCart, Undo2, Wrench } from 'lucide-react'
import { useDashboard } from '@/api'
import type { DateRange } from '@/api'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CardsSkeleton, Skeleton } from '@/components/ui/skeleton'
import { DonutChart, HorizontalBars, MoneyBarChart } from '@/components/common/charts'
import { EmptyState, InfoNote, PageBody, PageHeader } from '@/components/common/page'
import { PeriodFilter } from '@/components/common/period-filter'
import { Stat } from '@/components/common/stat'
import { formatDateTime, formatMoney } from '@/lib/format'
import { AUDIT_ACTION_LABELS } from '@/lib/labels'
import { rangeFor } from '@/lib/period'
import type { PeriodKey } from '@/lib/period'
import { useUi } from '@/store/ui-context'

const ACTION_ICONS: Record<string, typeof ShoppingCart> = {
  'purchase.create': ShoppingCart,
  'purchase.cancel': ShoppingCart,
  'allocation.create': Wrench,
  'allocation.return': Undo2,
  'allocation.cancel': Undo2,
  'allocation.transfer': ArrowRightLeft,
  'inventory.adjust': Boxes,
}

export function DashboardPage() {
  const { isMobile } = useUi()
  const [period, setPeriod] = useState<PeriodKey>('month')
  const [custom, setCustom] = useState<DateRange>(() => rangeFor('month'))

  // Recomputed only when the choice changes, so the query key stays stable.
  const range = useMemo(() => rangeFor(period, custom), [period, custom])
  const { data, isLoading } = useDashboard(range)

  const metrics = data?.metrics
  const recent = (data?.recentOperations ?? []).slice(0, isMobile ? 6 : 10)

  return (
    <PageBody>
      <PageHeader
        title="Головна"
        description="Загальна картина фінансів і матеріалів сервісу"
        actions={
          <PeriodFilter period={period} onPeriodChange={setPeriod} custom={custom} onCustomChange={setCustom} />
        }
      />

      {isLoading || !metrics || !data ? (
        <>
          <CardsSkeleton count={4} />
          <Skeleton className="h-72 w-full" />
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Загальна сума закупівель"
              value={formatMoney(metrics.purchasesKop)}
              hint="За вибраний період"
              to="/purchases"
              icon={<ShoppingCart />}
            />
            <Stat
              label="Вкладення в ремонти"
              value={formatMoney(metrics.allocatedKop)}
              hint="Розподілено по заявках"
              to="/orders"
              icon={<Wrench />}
            />
            <Stat
              label="Вартість залишків на складі"
              value={formatMoney(metrics.stockValueKop)}
              hint="Усе, що зараз лежить на складі"
              to="/inventory"
              icon={<Boxes />}
            />
            <Stat
              label="Активні заявки з вкладеннями"
              value={metrics.activeOrdersWithAllocations}
              hint={`${metrics.operationsCount} операцій за період`}
              to="/orders"
              icon={<Wrench />}
            />
          </div>

          <InfoNote>
            Закупівля і вкладення — різні події. Ці суми не додаються між собою: гроші, що вже витрачені на
            закупівлю, частково лежать на складі, а частково вже розподілені по ремонтах.
          </InfoNote>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Закупівлі та вкладення за період</CardTitle>
              </CardHeader>
              <CardContent>
                <MoneyBarChart data={data.series} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Закупівлі: у заявках і на складі</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart data={data.allocatedVsStock} emptyText="За цей період закупівель не було." />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Витрати за категоріями</CardTitle>
              </CardHeader>
              <CardContent>
                <HorizontalBars data={data.categories} emptyText="За цей період вкладень не було." />
              </CardContent>
            </Card>

            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Останні операції</CardTitle>
              </CardHeader>
              <CardContent>
                {recent.length === 0 ? (
                  <EmptyState title="Операцій ще не було" />
                ) : (
                  <div className="flex flex-col">
                    {recent.map(({ entry, userName }) => {
                      const Icon = ACTION_ICONS[entry.action] ?? ShoppingCart
                      return (
                        <div
                          key={entry.id}
                          className="flex items-start gap-3 border-b border-border py-2 last:border-0"
                        >
                          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                            <Icon className="size-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm">
                              {AUDIT_ACTION_LABELS[entry.action]} ·{' '}
                              <span className="font-medium">{entry.objectLabel}</span>
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {formatDateTime(entry.at)} · {userName}
                              {entry.after ? ` · ${entry.after}` : ''}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                    <Link to="/audit" className="pt-3 text-xs text-muted-foreground hover:text-foreground">
                      Повний журнал операцій →
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">Прототип</Badge>
        Дані мокові. Кожне число клікабельне й веде до своїх операцій.
      </div>
    </PageBody>
  )
}
