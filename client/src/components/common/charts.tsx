import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatMoneyCompact } from '@/lib/format'
import type { NamedValue, SeriesPoint } from '@/domain/calc'

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

const axisStyle = { fontSize: 11, fill: 'var(--muted-foreground)' }

interface TooltipPayloadItem {
  name?: string
  value?: number
  color?: string
}

function MoneyTooltip(props: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (!props.active || !props.payload || props.payload.length === 0) return null
  return (
    <div className="rounded-md border border-border bg-popover p-2 text-xs shadow-lg">
      {props.label ? <p className="mb-1 font-medium">{props.label}</p> : null}
      {props.payload.map((item, index) => (
        <p key={index} className="flex items-center gap-2">
          <span className="size-2 rounded-sm" style={{ backgroundColor: item.color }} />
          <span className="text-muted-foreground">{item.name}</span>
          <span className="font-medium tabular-nums">{formatMoneyCompact((item.value ?? 0) * 100)}</span>
        </p>
      ))}
    </div>
  )
}

/** Закупівлі та вкладення по періодах. Дві серії поруч, бо це різні події. */
export function MoneyBarChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} stroke="var(--chart-grid)" interval="preserveStartEnd" />
        <YAxis tick={axisStyle} stroke="var(--chart-grid)" width={56} tickFormatter={(value: number) => String(value)} />
        <Tooltip content={<MoneyTooltip />} cursor={{ fill: 'var(--muted)' }} />
        <Bar dataKey="purchases" name="Закупівлі" fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
        <Bar dataKey="allocations" name="Вкладення" fill="var(--chart-3)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function TrendLineChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} stroke="var(--chart-grid)" interval="preserveStartEnd" />
        <YAxis tick={axisStyle} stroke="var(--chart-grid)" width={56} />
        <Tooltip content={<MoneyTooltip />} />
        <Line
          type="monotone"
          dataKey="allocations"
          name="Вкладення"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function HorizontalBars({ data, emptyText }: { data: NamedValue[]; emptyText: string }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-muted-foreground">{emptyText}</p>
  }
  const max = Math.max(...data.map((item) => item.value), 1)
  return (
    <div className="flex flex-col gap-2">
      {data.map((item, index) => (
        <div key={item.name} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="truncate">{item.name}</span>
            <span className="shrink-0 font-medium tabular-nums">{formatMoneyCompact(item.value * 100)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-sm bg-muted">
            <div
              className="h-full rounded-sm"
              style={{
                width: `${Math.max(2, (item.value / max) * 100)}%`,
                backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DonutChart({ data, emptyText }: { data: NamedValue[]; emptyText: string }) {
  const total = data.reduce((acc, item) => acc + item.value, 0)
  if (total === 0) {
    return <p className="py-8 text-center text-xs text-muted-foreground">{emptyText}</p>
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={44} outerRadius={70} strokeWidth={1}>
              {data.map((item, index) => (
                <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="var(--background)" />
              ))}
            </Pie>
            <Tooltip content={<MoneyTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex w-full flex-col gap-2">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-sm"
                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
              />
              {item.name}
            </span>
            <span className="font-medium tabular-nums">{formatMoneyCompact(item.value * 100)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
