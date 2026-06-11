// Checkbox — custom-styled checkbox with label and indeterminate support.
// Usage: <Checkbox label="Accept terms" checked={val} onChange={setVal} />
//        <Checkbox indeterminate />   — for "select all" patterns

import { forwardRef, useEffect, useRef } from 'react'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?:         string
  indeterminate?: boolean
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, indeterminate, className, id, ...props }, forwardedRef) => {
    const innerRef = useRef<HTMLInputElement>(null)
    const ref = (forwardedRef as React.RefObject<HTMLInputElement>) ?? innerRef
    const checkboxId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    useEffect(() => {
      if (ref.current) ref.current.indeterminate = !!indeterminate
    }, [indeterminate, ref])

    return (
      <label
        htmlFor={checkboxId}
        className="inline-flex items-center gap-2.5 cursor-pointer select-none group"
      >
        <div className="relative">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              'h-4 w-4 rounded border border-border bg-surface-2 flex items-center justify-center transition-colors',
              'peer-checked:bg-accent peer-checked:border-accent',
              'peer-indeterminate:bg-accent peer-indeterminate:border-accent',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
              className,
            )}
          >
            {indeterminate
              ? <Minus  className="h-2.5 w-2.5 text-white" />
              : <Check  className="h-2.5 w-2.5 text-white opacity-0 peer-checked:opacity-100" />
            }
          </div>
        </div>
        {label && <span className="text-sm text-foreground">{label}</span>}
      </label>
    )
  },
)

Checkbox.displayName = 'Checkbox'
