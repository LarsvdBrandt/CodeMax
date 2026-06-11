// CATEGORY: Forms & Input
// MultiSelect — dropdown with checkboxes, selected items shown as chips.
// <MultiSelect options={opts} value={selected} onChange={setSelected} label="Assign to" />
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MultiSelectOption {
  value: string
  label: string
  icon?: React.ReactNode
}

export interface MultiSelectProps {
  options:      MultiSelectOption[]
  value:        string[]
  onChange:     (values: string[]) => void
  label?:       string
  placeholder?: string
  max?:         number
  disabled?:    boolean
  error?:       string
  className?:   string
}

export function MultiSelect({ options, value, onChange, label, placeholder = 'Select…', max, disabled, error, className }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function toggle(val: string) {
    if (value.includes(val)) {
      onChange(value.filter(v => v !== val))
    } else {
      if (max && value.length >= max) return
      onChange([...value, val])
    }
  }

  const selected = options.filter(o => value.includes(o.value))

  return (
    <div ref={ref} className={cn('relative flex flex-col gap-1.5', className)}>
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded border px-2.5 py-1.5 text-left transition-colors',
          error ? 'border-error' : open ? 'border-accent' : 'border-border hover:border-accent/60',
          'bg-surface-2',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {selected.length === 0
          ? <span className="flex-1 text-sm text-muted">{placeholder}</span>
          : (
            <>
              {selected.map(opt => (
                <span key={opt.value} className="inline-flex items-center gap-1 rounded-full bg-accent/15 border border-accent/30 pl-2.5 pr-1 py-0.5 text-xs text-accent">
                  {opt.icon}{opt.label}
                  <span
                    role="button"
                    onClick={e => { e.stopPropagation(); toggle(opt.value) }}
                    className="rounded-full hover:bg-accent/20 p-0.5"
                  >
                    <X className="h-2.5 w-2.5" />
                  </span>
                </span>
              ))}
              <span className="flex-1" />
            </>
          )
        }
        <ChevronDown className={cn('h-4 w-4 text-muted flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 z-50 w-full rounded-lg border border-border bg-surface shadow-float overflow-hidden">
          <div className="max-h-52 overflow-y-auto py-1">
            {options.map(opt => {
              const checked = value.includes(opt.value)
              const disabled = !checked && max !== undefined && value.length >= max
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(opt.value)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
                    checked ? 'text-accent bg-accent/8' : 'text-foreground hover:bg-surface-2',
                    disabled && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  <span className={cn('flex h-4 w-4 items-center justify-center rounded border transition-colors flex-shrink-0', checked ? 'bg-accent border-accent' : 'border-border')}>
                    {checked && <Check className="h-3 w-3 text-white" />}
                  </span>
                  {opt.icon && <span className="text-muted">{opt.icon}</span>}
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  )
}
