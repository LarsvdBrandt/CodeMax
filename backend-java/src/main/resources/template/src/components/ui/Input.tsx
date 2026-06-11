// ─────────────────────────────────────────────────────────────────────────────
// Input — labelled text input with optional leading icon and error state.
//
// Usage:
//   <Input label="Email" type="email" error={errors.email} {...register('email')} />
//   <Input label="Search" icon={<Search />} placeholder="Search…" />
// ─────────────────────────────────────────────────────────────────────────────

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:   string
  error?:   string
  hint?:    string
  icon?:    React.ReactNode // leading icon inside the input
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}

        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded border bg-surface-2 px-3 py-2 text-sm text-foreground',
              'placeholder:text-muted',
              'transition-colors duration-150',
              'border-border focus:border-accent focus:outline-none',
              !!icon && 'pl-10',
              error && 'border-error focus:border-error',
              className,
            )}
            {...props}
          />
        </div>

        {error  && <p className="text-xs text-error">{error}</p>}
        {!error && hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'
