// CATEGORY: Feedback & Overlays
// ConfirmDialog — destructive action confirmation modal.
// <ConfirmDialog isOpen={open} onConfirm={doDelete} onCancel={() => setOpen(false)}
//   title="Delete item?" description="This cannot be undone." variant="danger" />
import { AlertTriangle, Info, HelpCircle } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'

export type ConfirmVariant = 'danger' | 'warning' | 'info'

export interface ConfirmDialogProps {
  isOpen:       boolean
  onConfirm:    () => void | Promise<void>
  onCancel:     () => void
  title:        string
  description?: string
  confirmLabel?: string
  cancelLabel?:  string
  variant?:     ConfirmVariant
  loading?:     boolean
}

const ICONS: Record<ConfirmVariant, React.ReactNode> = {
  danger:  <AlertTriangle className="h-6 w-6 text-error" />,
  warning: <AlertTriangle className="h-6 w-6 text-warning" />,
  info:    <Info className="h-6 w-6 text-info" />,
}

const ICON_BG: Record<ConfirmVariant, string> = {
  danger:  'bg-error/10',
  warning: 'bg-warning/10',
  info:    'bg-info/10',
}

export function ConfirmDialog({ isOpen, onConfirm, onCancel, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger', loading }: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="sm">
      <Modal.Body>
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${ICON_BG[variant]}`}>
            {ICONS[variant] ?? <HelpCircle className="h-6 w-6 text-muted" />}
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
          isLoading={loading}
        >
          {confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
