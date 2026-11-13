import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
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
import { PeriodFilter } from '@/components/common/period-filter'
import { inRange, rangeFor } from '@/domain/calc'
import type { DateRange, PeriodKey } from '@/domain/calc'
import { AUDIT_ACTION_LABELS } from '@/domain/labels'
import { formatDateTime } from '@/lib/format'
import { useDb } from '@/store/db-store'
import type { AuditAction } from '@/domain/types'

const ACTIONS = Object.keys(AUDIT_ACTION_LABELS) as AuditAction[]
const PAGE_SIZE = 25

export function AuditPage() {
  const { db } = useDb()
  const [period, setPeriod] = useState<PeriodKey>('all')
  const [custom, setCustom] = useState<DateRange>(() => rangeFor('month'))
  const [action, setAction] = useState('all')
  const [userId, setUserId] = useState('all')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string>('')
  const [page, setPage] = useState(0)

  const range = useMemo(() => rangeFor(period, custom), [period, custom])

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return db.audit.filter((entry) => {
      if (!inRange(entry.at, range)) return false
      if (action !== 'all' && entry.action !== action) return false
      if (userId !== 'all' && entry.userId !== userId) return false
      if (!needle) return true
      return (
        entry.objectLabel.toLowerCase().includes(needle) ||
        entry.objectType.toLowerCase().includes(needle) ||
        (entry.reason ?? '').toLowerCase().includes(needle)
      )
    })
  }, [db.audit, range, action, userId, query])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  return (
    <PageBody>
      <PageHeader
        title="Журнал операцій"
        description="Усі значимі дії: хто, коли і що змінив"
        actions={
          <PeriodFilter period={period} onPeriodChange={setPeriod} custom={custom} onCustomChange={setCustom} />
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(0)
            }}
            placeholder="Обʼєкт або причина"
            className="pl-9"
          />
        </div>
        <Select
          className="w-full sm:w-64"
          aria-label="Тип операції"
          value={action}
          onValueChange={(value) => {
            setAction(value)
            setPage(0)
          }}
          options={[
            { value: 'all', label: 'Усі типи операцій' },
            ...ACTIONS.map((item) => ({ value: item, label: AUDIT_ACTION_LABELS[item] })),
          ]}
        />
        <Select
          className="w-full sm:w-52"
          aria-label="Користувач"
          value={userId}
          onValueChange={(value) => {
            setUserId(value)
            setPage(0)
          }}
          options={[
            { value: 'all', label: 'Усі користувачі' },
            ...db.users.map((user) => ({ value: user.id, label: user.fullName })),
          ]}
        />
      </div>

      <InfoNote>
        Фінансові записи не видаляються фізично. Виправлення — це скасування, сторно або коригування, і кожне з
        них лишає слід тут.
      </InfoNote>

      <Card>
        <TableWrap>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Час</TableHead>
                <TableHead>Користувач</TableHead>
                <TableHead>Операція</TableHead>
                <TableHead>Обʼєкт</TableHead>
                <TableHead>Було → стало</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableEmpty colSpan={6}>Записів за цими умовами немає</TableEmpty>
              ) : (
                pageRows.map((entry) => {
                  const user = db.users.find((item) => item.id === entry.userId)
                  const isOpen = expanded === entry.id
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? '' : entry.id)}
                          aria-label={isOpen ? 'Згорнути' : 'Розгорнути'}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        </button>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(entry.at)}
                      </TableCell>
                      <TableCell className="max-w-40 truncate">{user ? user.fullName : 'Система'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{AUDIT_ACTION_LABELS[entry.action]}</Badge>
                      </TableCell>
                      <TableCell className="max-w-56 truncate">
                        <span className="text-xs text-muted-foreground">{entry.objectType}: </span>
                        {entry.objectLabel}
                      </TableCell>
                      <TableCell className="max-w-80">
                        {isOpen ? (
                          <div className="flex flex-col gap-1 py-1 text-xs">
                            <span>
                              <span className="text-muted-foreground">Було: </span>
                              {entry.before ?? '—'}
                            </span>
                            <span>
                              <span className="text-muted-foreground">Стало: </span>
                              {entry.after ?? '—'}
                            </span>
                            <span>
                              <span className="text-muted-foreground">Причина: </span>
                              {entry.reason ?? '—'}
                            </span>
                          </div>
                        ) : (
                          <span className="block truncate text-xs text-muted-foreground">
                            {entry.before ? `${entry.before} → ` : ''}
                            {entry.after ?? '—'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableWrap>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Показано {pageRows.length} з {rows.length}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage === 0}
            onClick={() => setPage((value) => Math.max(0, value - 1))}
          >
            Назад
          </Button>
          <span className="text-xs text-muted-foreground">
            {safePage + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((value) => value + 1)}
          >
            Далі
          </Button>
        </div>
      </div>
    </PageBody>
  )
}
