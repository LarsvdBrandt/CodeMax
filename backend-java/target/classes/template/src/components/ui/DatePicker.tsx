// CATEGORY: Forms & Input
// DatePicker — calendar popup for picking a single date. No external dependency.
// <DatePicker value={date} onChange={setDate} label="Due date" />
import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DatePickerProps {
  value?:      Date | null
  onChange:    (date: Date | null) => void
  label?:      string
  placeholder?: string
  disabled?:   boolean
  minDate?:    Date
  maxDate?:    Date
  error?:      string
  className?:  string
}

const DAYS   = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function startDay(y: number, m: number)   { return new Date(y, m, 1).getDay() }

export function DatePicker({ value, onChange, label, placeholder = 'Pick a date', disabled, minDate, maxDate, error, className }: DatePickerProps) {
  const today  = new Date()
  const [open, setOpen]   = useState(false)
  const [view, setView]   = useState({ y: (value ?? today).getFullYear(), m: (value ?? today).getMonth() })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function prevMonth() { setView(v => v.m === 0 ? { y: v.y - 1, m: 11 } : { ...v, m: v.m - 1 }) }
  function nextMonth() { setView(v => v.m === 11 ? { y: v.y + 1, m: 0  } : { ...v, m: v.m + 1 }) }

  function isDisabled(d: number) {
    const dt = new Date(view.y, view.m, d)
    if (minDate && dt < minDate) return true
    if (maxDate && dt > maxDate) return true
    return false
  }

  function select(d: number) {
    onChange(new Date(view.y, view.m, d))
    setOpen(false)
  }

  const days   = daysInMonth(view.y, view.m)
  const blanks = startDay(view.y, view.m)

  const formatted = value
    ? value.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''

  return (
    <div ref={ref} className={cn('relative flex flex-col gap-1.5', className)}>
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-2 rounded border px-3 py-2 text-sm text-left transition-colors',
          open ? 'border-accent' : error ? 'border-error' : 'border-border hover:border-accent/60',
          'bg-surface-2',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <Calendar className="h-4 w-4 text-muted flex-shrink-0" />
        <span className={cn('flex-1', value ? 'text-foreground' : 'text-muted')}>{formatted || placeholder}</span>
        {value && (
          <span onClick={e => { e.stopPropagation(); onChange(null) }} className="text-muted hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-1 z-50 rounded-xl border border-border bg-surface p-3 shadow-float w-64">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-1 rounded hover:bg-surface-2 text-muted hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-foreground">{MONTHS[view.m]} {view.y}</span>
            <button onClick={nextMonth} className="p-1 rounded hover:bg-surface-2 text-muted hover:text-foreground transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => <span key={d} className="text-center text-[10px] font-medium text-muted py-0.5">{d}</span>)}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array(blanks).fill(null).map((_, i) => <span key={`b${i}`} />)}
            {Array(days).fill(null).map((_, i) => {
              const d  = i + 1
              const sel = value && value.getFullYear() === view.y && value.getMonth() === view.m && value.getDate() === d
              const tod = today.getFullYear() === view.y && today.getMonth() === view.m && today.getDate() === d
              const dis = isDisabled(d)
              return (
                <button
                  key={d}
                  type="button"
                  disabled={dis}
                  onClick={() => select(d)}
                  className={cn(
                    'flex h-7 w-full items-center justify-center rounded text-xs transition-colors',
                    sel && 'bg-accent text-white font-semibold',
                    !sel && tod && 'border border-accent text-accent font-semibold',
                    !sel && !tod && !dis && 'text-foreground hover:bg-surface-2',
                    dis && 'text-muted/40 cursor-not-allowed',
                  )}
                >
                  {d}
                </button>
              )
            })}
          </div>

          {/* Today shortcut */}
          <button
            onClick={() => { onChange(today); setOpen(false) }}
            className="mt-2 w-full rounded border border-border py-1 text-xs text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            Today
          </button>
        </div>
      )}

      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  )
}
