import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRightLeft,
  Boxes,
  ShoppingCart,
  Undo2,
  Wrench,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DonutChart, HorizontalBars, MoneyBarChart } from '@/components/common/charts'
import { EmptyState, InfoNote, PageBody, PageHeader } from '@/components/common/page'
import { PeriodFilter } from '@/components/common/period-filter'
import { Stat } from '@/components/common/stat'
import {
  allocatedVsStock,
  categoryBreakdown,
  dashboardMetrics,
  moneySeries,
  rangeFor,
} from '@/domain/calc'
import type { DateRange, PeriodKey } from '@/domain/calc'
import { AUDIT_ACTION_LABELS } from '@/domain/labels'
import { formatDateTime, formatMoney } from '@/lib/format'
import { useDb } from '@/store/db-store'
import { useUi } from '@/store/ui-store'

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
  const { db } = useDb()
  const { isMobile } = useUi()
  const [period, setPeriod] = useState<PeriodKey>('month')
  const [custom, setCustom] = useState<DateRange>(() => rangeFor('month'))

  const range = useMemo(() => rangeFor(period, custom), [period, custom])
  const metrics = useMemo(() => dashboardMetrics(db, range), [db, range])
  const series = useMemo(() => moneySeries(db, range), [db, range])
  const byCategory = useMemo(() => categoryBreakdown(db, range), [db, range])
  const split = useMemo(() => allocatedVsStock(db, range), [db, range])

  const recent = useMemo(
    () => db.audit.filter((entry) => entry.at <= range.to).slice(0, isMobile ? 6 : 10),
    [db.audit, range.to, isMobile],
  )

  return (
    <PageBody>
      <PageHeader
        title="Головна"
        description="Загальна картина фінансів і матеріалів сервісу"
        actions={
          <PeriodFilter period={period} onPeriodChange={setPeriod} custom={custom} onCustomChange={setCustom} />
        }
      />

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
        Закупівля і вкладення — різні події. Ці суми не додаються між собою: гроші, що вже витрачені на закупівлю,
        частково лежать на складі, а частково вже розподілені по ремонтах.
      </InfoNote>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Закупівлі та вкладення за період</CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyBarChart data={series} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Закупівлі: у заявках і на складі</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={split} emptyText="За цей період закупівель не було." />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Витрати за категоріями</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBars data={byCategory} emptyText="За цей період вкладень не було." />
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
                {recent.map((entry) => {
                  const Icon = ACTION_ICONS[entry.action] ?? ShoppingCart
                  const user = db.users.find((item) => item.id === entry.userId)
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
                          {AUDIT_ACTION_LABELS[entry.action]} · <span className="font-medium">{entry.objectLabel}</span>
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatDateTime(entry.at)} · {user ? user.fullName : 'Система'}
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

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">Прототип</Badge>
        Дані мокові. Кожне число клікабельне й веде до своїх операцій.
      </div>
    </PageBody>
  )
}
