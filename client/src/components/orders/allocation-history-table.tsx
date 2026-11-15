/**
 * Full history of the allocations of an order, including returned and
 * cancelled ones, with who did it and why.
 */

import type { AllocationRow } from '@/api'
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
import { AllocationStatusBadge } from '@/components/common/status'
import { formatDateTime, formatMoney, formatQty } from '@/lib/format'

export function AllocationHistoryTable({ rows }: { rows: AllocationRow[] }) {
  return (
    <TableWrap>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Дата</TableHead>
            <TableHead>Товар</TableHead>
            <TableHead className="text-right">К-сть</TableHead>
            <TableHead className="text-right">Сума</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Хто</TableHead>
            <TableHead>Причина</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableEmpty colSpan={7}>Операцій по заявці ще не було</TableEmpty>
          ) : (
            rows.map((row) => (
              <TableRow key={row.allocation.id}>
                <TableCell className="text-muted-foreground">{formatDateTime(row.allocation.createdAt)}</TableCell>
                <TableCell>{row.productName}</TableCell>
                <TableCell className="text-right tabular-nums">{formatQty(row.allocation.qty, row.unit)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(row.allocation.totalKop)}</TableCell>
                <TableCell>
                  <AllocationStatusBadge status={row.allocation.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">{row.createdByName}</TableCell>
                <TableCell className="max-w-56 truncate text-xs text-muted-foreground">
                  {row.allocation.reason ?? '—'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableWrap>
  )
}
