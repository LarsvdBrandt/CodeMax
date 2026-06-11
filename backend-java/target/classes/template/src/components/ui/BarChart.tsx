// CATEGORY: Data Visualization
// BarChart — pure CSS horizontal or vertical bar chart. No external charting library needed.
// <BarChart data={[{label:'Mon', value:42},{label:'Tue', value:67}]} orientation="vertical" />
import { cn } from '@/lib/utils'

export interface BarChartDatum {
  label:   string
  value:   number
  color?:  string   // CSS color override
}

export interface BarChartProps {
  data:          BarChartDatum[]
  orientation?:  'horizontal' | 'vertical'
  showValues?:   boolean
  formatValue?:  (v: number) => string
  label?:        string
  height?:       number     // px — only for vertical
  className?:    string
}

export function BarChart({ data, orientation = 'vertical', showValues = true, formatValue, label, height = 200, className }: BarChartProps) {
  const max = Math.max(...data.map(d => d.value), 1)
  const fmt = formatValue ?? ((v: number) => String(v))

  if (orientation === 'horizontal') {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {label && <p className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</p>}
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-16 flex-shrink-0 text-right text-xs text-muted truncate">{d.label}</span>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 rounded-full bg-surface-2 overflow-hidden h-2.5">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${(d.value / max) * 100}%`,
                    background: d.color ?? 'rgb(var(--color-accent))',
                  }}
                />
              </div>
              {showValues && <span className="w-12 text-right text-xs font-mono text-foreground">{fmt(d.value)}</span>}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && <p className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</p>}
      <div className="flex items-end gap-2 overflow-x-auto pb-1" style={{ height }}>
        {data.map((d, i) => {
          const pct = (d.value / max) * 100
          return (
            <div key={i} className="flex flex-1 min-w-0 flex-col items-center gap-1 h-full justify-end">
              {showValues && <span className="text-[10px] font-mono text-muted">{fmt(d.value)}</span>}
              <div
                className="w-full min-w-[16px] rounded-t transition-all duration-700"
                style={{
                  height: `${pct}%`,
                  background: d.color ?? 'rgb(var(--color-accent))',
                  opacity: 0.85,
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-2">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[10px] text-muted truncate">{d.label}</span>
        ))}
      </div>
    </div>
  )
}
