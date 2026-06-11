// CATEGORY: Forms & Input
// TagInput — type-and-enter to add tags, click × to remove.
// <TagInput value={tags} onChange={setTags} placeholder="Add tag…" max={10} />
import { useState, useRef, KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TagInputProps {
  value:        string[]
  onChange:     (tags: string[]) => void
  placeholder?: string
  max?:         number
  disabled?:    boolean
  error?:       string
  label?:       string
  className?:   string
}

export function TagInput({ value, onChange, placeholder = 'Add tag…', max, disabled, error, label, className }: TagInputProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function add(raw: string) {
    const tag = raw.trim().toLowerCase()
    if (!tag || value.includes(tag)) return
    if (max && value.length >= max) return
    onChange([...value, tag])
    setInput('')
  }

  function remove(tag: string) {
    onChange(value.filter(t => t !== tag))
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input) }
    if (e.key === 'Backspace' && !input && value.length > 0) remove(value[value.length - 1])
  }

  const atMax = max !== undefined && value.length >= max

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          'flex min-h-10 flex-wrap items-center gap-1.5 rounded border px-2.5 py-1.5 cursor-text transition-colors',
          error ? 'border-error' : 'border-border focus-within:border-accent',
          disabled && 'opacity-50 cursor-not-allowed',
          'bg-surface-2',
        )}
      >
        {value.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-accent/15 border border-accent/30 pl-2.5 pr-1 py-0.5 text-xs text-accent">
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(tag) }}
              disabled={disabled}
              className="rounded-full hover:bg-accent/20 p-0.5 transition-colors"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        {!atMax && (
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            onBlur={() => add(input)}
            placeholder={value.length === 0 ? placeholder : ''}
            disabled={disabled}
            className="flex-1 min-w-24 bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
          />
        )}
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
      {max && <p className="text-[11px] text-muted">{value.length}/{max} tags</p>}
    </div>
  )
}
