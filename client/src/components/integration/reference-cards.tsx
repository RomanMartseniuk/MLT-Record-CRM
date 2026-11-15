/**
 * The reference lists read from RO App: the status mapping and the order
 * types. Statuses are not hard-coded; an unmapped one is shown as is.
 */

import type { Reference } from '@/api'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableWrap } from '@/components/ui/table'
import { InfoNote } from '@/components/common/page'
import { ORDER_STATUS_LABELS } from '@/lib/labels'

export function StatusMappingCard({ mappings }: { mappings: Reference['statusMappings'] }) {
  return (
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
              {mappings.map((mapping) => (
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
          Статуси не зашиті в код: вони читаються з довідника RO App. Незмаплене значення показується як є й нічого
          не ламає — приклад є у заявці зі статусом «on-hold».
        </InfoNote>
      </CardContent>
    </Card>
  )
}

export function OrderTypesCard({ types }: { types: Reference['orderTypes'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Довідник типів заявок</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {types.map((type) => (
            <Badge key={type.id} variant="outline">
              {type.name}
            </Badge>
          ))}
        </div>
        <InfoNote className="mt-3">Типи заявок також беруться зі словника RO App, а не задаються вручну.</InfoNote>
      </CardContent>
    </Card>
  )
}
