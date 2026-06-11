// CATEGORY: Forms & Input
// Slider — styled range input with optional value label.
// <Slider value={volume} onChange={setVolume} min={0} max={100} step={1} label="Volume" showValue />
import { cn } from '@/lib/utils'

export interface SliderProps {
  value:       number
  onChange:    (value: number) => void
  min?:        number
  max?:        number
  step?:       number
  label?:      string
  showValue?:  boolean
  disabled?:   boolean
  formatValue?: (v: number) => string
  className?:  string
}

export function Slider({ value, onChange, min = 0, max = 100, step = 1, label, showValue, disabled, formatValue, className }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && <label className="text-sm font-medium text-foreground">{label}</label>}
          {showValue && <span className="text-sm font-mono text-accent">{formatValue ? formatValue(value) : value}</span>}
        </div>
      )}
      <div className="relative flex items-center h-5">
        {/* Track */}
        <div className="absolute inset-y-0 left-0 right-0 flex items-center">
          <div className="relative w-full h-1.5 rounded-full bg-surface-2">
            {/* Fill */}
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-accent transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {/* Native input (transparent, on top) */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={e => onChange(Number(e.target.value))}
          className={cn(
            'relative w-full appearance-none bg-transparent cursor-pointer',
            '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
            '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background',
            '[&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform',
            '[&::-webkit-slider-thumb]:hover:scale-110',
            '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4',
            '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent',
            '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted">
        <span>{formatValue ? formatValue(min) : min}</span>
        <span>{formatValue ? formatValue(max) : max}</span>
      </div>
    </div>
  )
}
