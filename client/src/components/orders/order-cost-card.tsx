/**
 * "Repair cost" card: the cost of the order and its split by category.
 * The numbers come from the server (sum of active allocations at the prices
 * of the moment of each operation).
 */

import type { OrderDetail } from '@/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HorizontalBars } from '@/components/common/charts'
import { InfoNote } from '@/components/common/page'
import { formatMoney } from '@/lib/format'

export function OrderCostCard({ detail }: { detail: OrderDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Собівартість ремонту</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="text-3xl font-semibold leading-9 tabular-nums">{formatMoney(detail.costKop)}</p>
          <p className="text-xs text-muted-foreground">
            {detail.allocations.length} активних вкладень · {detail.history.length} операцій усього
          </p>
        </div>
        <HorizontalBars
          data={detail.costByCategory.map((slice) => ({ name: slice.name, value: Math.round(slice.kop / 100) }))}
          emptyText="Вкладень ще немає."
        />
        <InfoNote>Сума рахується за цінами на момент операцій. Нові партії за іншою ціною її не змінюють.</InfoNote>
      </CardContent>
    </Card>
  )
}
