// Select — styled <select> dropdown.
// Props: options [{value, label}], label, error, hint, placeholder
// Usage: <Select label="Role" options={[{value:'admin',label:'Admin'}]} {...register('role')} />

import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options:      SelectOption[]
  label?:       string
  error?:       string
  hint?:        string
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, label, error, hint, placeholder, className, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full appearance-none rounded border bg-surface-2 px-3 py-2 pr-8 text-sm text-foreground',
              'border-border focus:border-accent focus:outline-none transition-colors',
              !props.value && 'text-muted',
              error && 'border-error',
              className,
            )}
            {...props}
          >
            {placeholder && <option value="" disabled>{placeholder}</option>}
            {options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        </div>
        {error  && <p className="text-xs text-error">{error}</p>}
        {!error && hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
    )
  },
)

Select.displayName = 'Select'
