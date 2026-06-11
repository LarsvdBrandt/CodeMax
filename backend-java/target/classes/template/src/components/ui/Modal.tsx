// ─────────────────────────────────────────────────────────────────────────────
// Modal — accessible dialog rendered via React Portal.
//
// Props:
//   isOpen    boolean              controls visibility
//   onClose   () => void           called on backdrop click or Escape key
//   title?    string               optional header text
//   size?     sm | md | lg | full  defaults to md
//   children  ReactNode
//
// Compose with sub-components:
//   <Modal.Header>, <Modal.Body>, <Modal.Footer>
//
// Usage:
//   <Modal isOpen={open} onClose={() => setOpen(false)} title="Confirm">
//     <Modal.Body>Are you sure?</Modal.Body>
//     <Modal.Footer><Button onClick={() => setOpen(false)}>Cancel</Button></Modal.Footer>
//   </Modal>
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'
import { createPortal }      from 'react-dom'
import { X }                 from 'lucide-react'
import { cn }                from '@/lib/utils'

interface ModalProps {
  isOpen:    boolean
  onClose:   () => void
  title?:    string
  size?:     'sm' | 'md' | 'lg' | 'full'
  children:  React.ReactNode
  className?: string
}

const sizes = {
  sm:   'max-w-sm',
  md:   'max-w-lg',
  lg:   'max-w-3xl',
  full: 'max-w-full mx-4',
}

export function Modal({ isOpen, onClose, title, size = 'md', children, className }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'relative z-10 w-full rounded-lg border border-border bg-surface shadow-float',
          'animate-fade-up',
          sizes[size],
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="rounded p-1 text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}

Modal.Header = function ModalHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('border-b border-border px-6 py-4', className)}>{children}</div>
}

Modal.Body = function ModalBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-6 py-5', className)}>{children}</div>
}

Modal.Footer = function ModalFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex items-center justify-end gap-3 border-t border-border px-6 py-4', className)}>{children}</div>
}
