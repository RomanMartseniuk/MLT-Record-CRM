/**
 * Period picker: a preset (today, week…) or a custom date range.
 */

import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { DateRange } from '@/api'
import { PERIOD_LABELS } from '@/lib/period'
import type { PeriodKey } from '@/lib/period'

const PERIOD_ORDER: PeriodKey[] = ['today', 'week', 'month', 'year', 'all', 'custom']

function toInputDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

export function PeriodFilter({
  period,
  onPeriodChange,
  custom,
  onCustomChange,
}: {
  period: PeriodKey
  onPeriodChange: (period: PeriodKey) => void
  custom: DateRange
  onCustomChange: (range: DateRange) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        className="w-40"
        aria-label="Період"
        value={period}
        onValueChange={(value) => onPeriodChange(value as PeriodKey)}
        options={PERIOD_ORDER.map((key) => ({ value: key, label: PERIOD_LABELS[key] }))}
      />
      {period === 'custom' ? (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="w-36"
            value={toInputDate(custom.from)}
            onChange={(event) =>
              onCustomChange({ from: new Date(event.target.value).toISOString(), to: custom.to })
            }
          />
          <span className="text-xs text-muted-foreground">—</span>
          <Input
            type="date"
            className="w-36"
            value={toInputDate(custom.to)}
            onChange={(event) =>
              onCustomChange({ from: custom.from, to: new Date(event.target.value).toISOString() })
            }
          />
        </div>
      ) : null}
    </div>
  )
}
