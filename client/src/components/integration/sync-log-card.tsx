/** "Synchronisation log" card: the latest runs with their source and result. */

import { AlertCircle, Check } from 'lucide-react'
import type { SyncLogEntry } from '@/api'
import { Badge } from '@/components/ui/badge'
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
import { formatDateTime } from '@/lib/format'
import { SYNC_SOURCE_LABELS } from '@/lib/labels'

/** How many log rows are shown. */
const VISIBLE_ENTRIES = 20

export function SyncLogCard({ log }: { log: SyncLogEntry[] }) {
  return (
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
              {log.length === 0 ? (
                <TableEmpty colSpan={6}>Записів ще немає</TableEmpty>
              ) : (
                log.slice(0, VISIBLE_ENTRIES).map((entry) => (
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
  )
}
