// Alert — inline notification banner.
// Props: variant (success|error|warning|info), title, description, onDismiss?
// Usage: <Alert variant="error" title="Upload failed" description="File too large" onDismiss={() => setErr(null)} />

import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AlertProps {
  variant?:     'success' | 'error' | 'warning' | 'info'
  title:        string
  description?: string
  onDismiss?:   () => void
  className?:   string
}

const config = {
  success: { icon: CheckCircle,   bg: 'bg-success/10',      border: 'border-success/30',       text: 'text-success'      },
  error:   { icon: XCircle,       bg: 'bg-error/10',        border: 'border-error/30',         text: 'text-error'        },
  warning: { icon: AlertTriangle, bg: 'bg-yellow-500/10',   border: 'border-yellow-500/30',    text: 'text-yellow-400'   },
  info:    { icon: Info,          bg: 'bg-accent/10',       border: 'border-accent/30',        text: 'text-accent'       },
}

export function Alert({ variant = 'info', title, description, onDismiss, className }: AlertProps) {
  const { icon: Icon, bg, border, text } = config[variant]

  return (
    <div className={cn('flex items-start gap-3 rounded-lg border p-4', bg, border, className)}>
      <Icon className={cn('h-4 w-4 flex-shrink-0 mt-0.5', text)} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', text)}>{title}</p>
        {description && <p className="text-xs text-muted mt-1">{description}</p>}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-muted hover:text-foreground transition-colors flex-shrink-0" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
