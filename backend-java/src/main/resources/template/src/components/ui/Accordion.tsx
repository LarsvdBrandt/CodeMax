// Accordion — expandable disclosure panels.
// type="single" (only one open at a time) | type="multiple" (many can be open)
//
// Usage:
//   <Accordion type="single" defaultValue="item-1">
//     <AccordionItem value="item-1">
//       <AccordionTrigger>What is this?</AccordionTrigger>
//       <AccordionContent>This is the answer.</AccordionContent>
//     </AccordionItem>
//   </Accordion>

import { createContext, useContext, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn }          from '@/lib/utils'

interface AccordionContextValue {
  type:   'single' | 'multiple'
  open:   Set<string>
  toggle: (v: string) => void
}

const AccordionContext = createContext<AccordionContextValue | null>(null)

const ItemContext = createContext<{ value: string } | null>(null)

function useAccordion() {
  const ctx = useContext(AccordionContext)
  if (!ctx) throw new Error('Accordion sub-component used outside <Accordion>')
  return ctx
}

interface AccordionProps {
  type?:         'single' | 'multiple'
  defaultValue?: string | string[]
  children:      React.ReactNode
  className?:    string
}

export function Accordion({ type = 'single', defaultValue, children, className }: AccordionProps) {
  const initial = defaultValue
    ? new Set(Array.isArray(defaultValue) ? defaultValue : [defaultValue])
    : new Set<string>()

  const [open, setOpen] = useState<Set<string>>(initial)

  function toggle(value: string) {
    setOpen(prev => {
      const next = new Set(prev)
      if (next.has(value)) {
        next.delete(value)
      } else {
        if (type === 'single') next.clear()
        next.add(value)
      }
      return next
    })
  }

  return (
    <AccordionContext.Provider value={{ type, open, toggle }}>
      <div className={cn('divide-y divide-border border border-border rounded-lg', className)}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

export function AccordionItem({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <ItemContext.Provider value={{ value }}>
      <div>{children}</div>
    </ItemContext.Provider>
  )
}

export function AccordionTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
  const { open, toggle } = useAccordion()
  const { value }        = useContext(ItemContext)!
  const isOpen           = open.has(value)

  return (
    <button
      onClick={() => toggle(value)}
      className={cn(
        'flex w-full items-center justify-between px-5 py-4 text-sm font-medium text-foreground',
        'hover:bg-surface-2 transition-colors text-left',
        className,
      )}
      aria-expanded={isOpen}
    >
      {children}
      <ChevronDown
        className={cn('h-4 w-4 text-muted flex-shrink-0 transition-transform duration-200', isOpen && 'rotate-180')}
      />
    </button>
  )
}

export function AccordionContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const { open } = useAccordion()
  const { value } = useContext(ItemContext)!

  if (!open.has(value)) return null

  return (
    <div className={cn('px-5 pb-5 text-sm text-muted leading-relaxed', className)}>
      {children}
    </div>
  )
}
