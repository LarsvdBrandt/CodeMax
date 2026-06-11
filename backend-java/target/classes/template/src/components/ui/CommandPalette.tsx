// CATEGORY: Navigation
// CommandPalette — ⌘K spotlight-style command search overlay.
// Open with Cmd+K / Ctrl+K or programmatically. Groups commands into sections.
//
// USAGE:
//   const [open, setOpen] = useCommandPalette()
//   <CommandPalette commands={cmds} isOpen={open} onClose={() => setOpen(false)} />
//
// useCommandPalette() also registers the keyboard shortcut automatically.
import { useState, useEffect, useRef } from 'react'
import { Search, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Command {
  id:       string
  label:    string
  group?:   string
  icon?:    React.ReactNode
  shortcut?: string
  onSelect: () => void
}

export interface CommandPaletteProps {
  commands:   Command[]
  isOpen:     boolean
  onClose:    () => void
  placeholder?: string
}

export function useCommandPalette(): [boolean, React.Dispatch<React.SetStateAction<boolean>>] {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o) }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  return [open, setOpen]
}

export function CommandPalette({ commands, isOpen, onClose, placeholder = 'Type a command or search…' }: CommandPaletteProps) {
  const [query,   setQuery]   = useState('')
  const [active,  setActive]  = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter
  const filtered = commands.filter(c =>
    !query || c.label.toLowerCase().includes(query.toLowerCase()),
  )

  // Group
  const groups = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    const g = cmd.group ?? 'General'
    ;(acc[g] ??= []).push(cmd)
    return acc
  }, {})

  useEffect(() => { if (isOpen) { setQuery(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 50) } }, [isOpen])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown')  { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    if (e.key === 'Enter')      { e.preventDefault(); filtered[active]?.onSelect(); onClose() }
    if (e.key === 'Escape')     { onClose() }
  }

  if (!isOpen) return null

  let globalIdx = 0

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl border border-border bg-surface shadow-float overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search bar */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 flex-shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActive(0) }}
            onKeyDown={handleKey}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
          />
          <kbd className="hidden sm:block rounded border border-border px-1.5 py-0.5 text-[10px] text-muted font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {Object.keys(groups).length === 0
            ? <p className="py-8 text-center text-sm text-muted">No results for "{query}"</p>
            : Object.entries(groups).map(([group, cmds]) => (
              <div key={group}>
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">{group}</p>
                {cmds.map(cmd => {
                  const idx = globalIdx++
                  const isActive = idx === active
                  return (
                    <button
                      key={cmd.id}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => { cmd.onSelect(); onClose() }}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                        isActive ? 'bg-accent/10 text-accent' : 'text-foreground hover:bg-surface-2',
                      )}
                    >
                      {cmd.icon && <span className="text-muted">{cmd.icon}</span>}
                      <span className="flex-1 text-left">{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted">{cmd.shortcut}</kbd>
                      )}
                      {isActive && <ArrowRight className="h-3.5 w-3.5 text-accent" />}
                    </button>
                  )
                })}
              </div>
            ))
          }
        </div>

        <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[10px] text-muted">
          <span><kbd className="font-mono">↑↓</kbd> Navigate</span>
          <span><kbd className="font-mono">↵</kbd> Select</span>
          <span><kbd className="font-mono">ESC</kbd> Close</span>
        </div>
      </div>
    </div>
  )
}
