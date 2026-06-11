// Tabs — accessible tab panel.
// Controlled: pass `value` + `onValueChange`.
// Uncontrolled: pass `defaultValue` only.
//
// Usage:
//   <Tabs defaultValue="account">
//     <TabsList>
//       <TabsTrigger value="account">Account</TabsTrigger>
//       <TabsTrigger value="security">Security</TabsTrigger>
//     </TabsList>
//     <TabsContent value="account">Account settings…</TabsContent>
//     <TabsContent value="security">Security settings…</TabsContent>
//   </Tabs>

import { createContext, useContext, useState } from 'react'
import { cn } from '@/lib/utils'

interface TabsContextValue {
  active:    string
  setActive: (v: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabs() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tabs sub-component used outside <Tabs>')
  return ctx
}

interface TabsProps {
  defaultValue?: string
  value?:        string
  onValueChange?: (v: string) => void
  children:      React.ReactNode
  className?:    string
}

export function Tabs({ defaultValue = '', value, onValueChange, children, className }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue)
  const active    = value ?? internal
  const setActive = onValueChange ?? setInternal

  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      className={cn('flex gap-1 rounded-lg border border-border bg-surface p-1', className)}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const { active, setActive } = useTabs()
  const isActive = active === value

  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => setActive(value)}
      className={cn(
        'flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-surface-2 text-foreground shadow-card'
          : 'text-muted hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const { active } = useTabs()
  if (active !== value) return null
  return <div role="tabpanel" className={cn('mt-4', className)}>{children}</div>
}
