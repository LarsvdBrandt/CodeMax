// CATEGORY: Navigation / Forms
// Stepper — multi-step wizard progress indicator.
// <Stepper steps={steps} current={step} onChange={setStep} />
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Step {
  label:       string
  description?: string
  icon?:        React.ReactNode
}

export interface StepperProps {
  steps:       Step[]
  current:     number     // 0-based index
  onChange?:   (index: number) => void
  orientation?: 'horizontal' | 'vertical'
  className?:  string
}

export function Stepper({ steps, current, onChange, orientation = 'horizontal', className }: StepperProps) {
  const isH = orientation === 'horizontal'

  return (
    <div className={cn(isH ? 'flex items-start' : 'flex flex-col gap-0', className)}>
      {steps.map((step, i) => {
        const done    = i < current
        const active  = i === current
        const pending = i > current

        return (
          <div key={i} className={cn('flex', isH ? 'flex-col items-center flex-1' : 'items-start gap-4')}>
            {/* Step indicator + connector */}
            <div className={cn('flex', isH ? 'w-full items-center' : 'flex-col items-center')}>
              {/* Connector before (except first) */}
              {i > 0 && (
                <div className={cn(
                  'flex-1 transition-colors',
                  isH ? 'h-0.5' : 'w-0.5 min-h-[2rem]',
                  done ? 'bg-accent' : 'bg-border',
                )} />
              )}

              {/* Circle */}
              <button
                onClick={() => onChange?.(i)}
                disabled={!onChange}
                className={cn(
                  'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all text-sm font-semibold',
                  done   && 'border-accent bg-accent text-white',
                  active && 'border-accent bg-background text-accent scale-110 shadow-glow',
                  pending && 'border-border bg-surface-2 text-muted',
                  onChange && 'cursor-pointer hover:border-accent/60',
                )}
              >
                {done ? <Check className="h-4 w-4" /> : step.icon ?? (i + 1)}
              </button>

              {/* Connector after (except last) */}
              {i < steps.length - 1 && (
                <div className={cn(
                  'flex-1 transition-colors',
                  isH ? 'h-0.5' : 'w-0.5 min-h-[2rem]',
                  done ? 'bg-accent' : 'bg-border',
                )} />
              )}
            </div>

            {/* Labels */}
            <div className={cn('mt-2 text-center', isH ? 'px-1' : 'pb-6')}>
              <p className={cn('text-xs font-semibold', active ? 'text-foreground' : 'text-muted')}>{step.label}</p>
              {step.description && (
                <p className="text-[10px] text-muted mt-0.5 hidden sm:block">{step.description}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
