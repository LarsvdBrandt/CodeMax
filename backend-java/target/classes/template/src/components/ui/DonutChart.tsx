// CATEGORY: Data Visualization
// DonutChart — SVG donut / pie chart with legend. No external library.
// <DonutChart data={[{label:'React', value:60, color:'#6366f1'},{label:'Vue', value:40}]} />
import { cn } from '@/lib/utils'

export interface DonutSlice {
  label:  string
  value:  number
  color?: string
}

export interface DonutChartProps {
  data:        DonutSlice[]
  size?:       number    // px
  thickness?:  number    // 0–1 (1 = full pie, 0 = thin ring)
  centerLabel?: string
  centerValue?: string
  showLegend?: boolean
  className?:  string
}

const DEFAULT_COLORS = [
  'rgb(var(--color-accent))',
  'rgb(var(--color-success))',
  'rgb(var(--color-warning))',
  'rgb(var(--color-info))',
  'rgb(var(--color-error))',
  'rgb(var(--color-muted))',
]

export function DonutChart({ data, size = 140, thickness = 0.55, centerLabel, centerValue, showLegend = true, className }: DonutChartProps) {
  const r       = (size / 2) * 0.8
  const cx      = size / 2
  const cy      = size / 2
  const circumf = 2 * Math.PI * r
  const inner   = r * (1 - thickness)

  const total = data.reduce((s, d) => s + d.value, 0) || 1

  let offset = 0
  const slices = data.map((d, i) => {
    const pct   = d.value / total
    const dash  = pct * circumf
    const gap   = circumf - dash
    const color = d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]
    const slice = { ...d, pct, dash, gap, offset, color }
    offset += pct * circumf
    return slice
  })

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90">
          {/* Background ring */}
          <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth={r - inner} stroke="rgb(var(--color-surface-2))" />
          {slices.map((s, i) => (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              strokeWidth={r - inner}
              stroke={s.color}
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={-s.offset}
              strokeLinecap="butt"
              className="transition-all duration-700"
            />
          ))}
        </svg>
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerValue && <span className="text-lg font-bold text-foreground">{centerValue}</span>}
            {centerLabel && <span className="text-[10px] text-muted">{centerLabel}</span>}
          </div>
        )}
      </div>

      {showLegend && (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
          {slices.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
              <span className="text-xs text-muted">{s.label}</span>
              <span className="text-xs font-medium text-foreground">{Math.round(s.pct * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
