// ─────────────────────────────────────────────────────────────────────────────
// Toast — notification system via React Context.
//
// Setup:  wrap your app with <ToastProvider> in App.tsx
// Usage:
//   const { toast } = useToast()
//   toast.success('Saved!')
//   toast.error('Something went wrong', { duration: 6000 })
//   toast.warning('Low disk space')
//   toast.info('New version available')
//
// Each toast auto-dismisses after `duration` ms (default 4000).
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id:       string
  type:     ToastType
  title:    string
  message?: string
  duration: number
}

interface ToastOptions {
  message?:  string
  duration?: number
}

interface ToastContextValue {
  toast: {
    success: (title: string, opts?: ToastOptions) => void
    error:   (title: string, opts?: ToastOptions) => void
    warning: (title: string, opts?: ToastOptions) => void
    info:    (title: string, opts?: ToastOptions) => void
  }
}

const ToastContext = createContext<ToastContextValue | null>(null)

// ── Icons & styles per type ───────────────────────────────────────────────────

const config: Record<ToastType, { icon: React.ElementType; bar: string; iconClass: string }> = {
  success: { icon: CheckCircle,    bar: 'bg-success',  iconClass: 'text-success'  },
  error:   { icon: XCircle,        bar: 'bg-error',    iconClass: 'text-error'    },
  warning: { icon: AlertTriangle,  bar: 'bg-yellow-500', iconClass: 'text-yellow-500' },
  info:    { icon: Info,           bar: 'bg-accent',   iconClass: 'text-accent'   },
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const remove = useCallback((id: string) => {
    setToasts(ts => ts.filter(t => t.id !== id))
  }, [])

  const add = useCallback((type: ToastType, title: string, opts: ToastOptions = {}) => {
    const id       = String(++counter.current)
    const duration = opts.duration ?? 4000
    setToasts(ts => [...ts, { id, type, title, message: opts.message, duration }])
    setTimeout(() => remove(id), duration)
  }, [remove])

  const toast = {
    success: (t: string, o?: ToastOptions) => add('success', t, o),
    error:   (t: string, o?: ToastOptions) => add('error',   t, o),
    warning: (t: string, o?: ToastOptions) => add('warning', t, o),
    info:    (t: string, o?: ToastOptions) => add('info',    t, o),
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 pointer-events-none">
          {toasts.map(t => {
            const { icon: Icon, bar, iconClass } = config[t.type]
            return (
              <div
                key={t.id}
                className={cn(
                  'pointer-events-auto flex gap-3 rounded-lg border border-border bg-surface p-4 shadow-float',
                  'animate-fade-up',
                )}
              >
                {/* Coloured left bar */}
                <div className={cn('w-1 rounded-full flex-shrink-0', bar)} />
                <Icon className={cn('h-4 w-4 flex-shrink-0 mt-0.5', iconClass)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{t.title}</p>
                  {t.message && <p className="text-xs text-muted mt-0.5">{t.message}</p>}
                </div>
                <button
                  onClick={() => remove(t.id)}
                  className="text-muted hover:text-foreground transition-colors flex-shrink-0"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
