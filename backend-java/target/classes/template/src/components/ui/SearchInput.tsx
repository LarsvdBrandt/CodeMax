// CATEGORY: Forms & Input
// SearchInput — search field with debounce and clear button.
// <SearchInput onSearch={q => fetchResults(q)} placeholder="Search…" debounce={300} />
import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SearchInputProps {
  onSearch:     (query: string) => void
  placeholder?: string
  debounce?:    number   // ms
  loading?:     boolean
  defaultValue?: string
  disabled?:    boolean
  className?:   string
}

export function SearchInput({ onSearch, placeholder = 'Search…', debounce = 300, loading, defaultValue = '', disabled, className }: SearchInputProps) {
  const [value, setValue] = useState(defaultValue)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onSearch(value), debounce)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [value, debounce]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn('relative flex items-center', className)}>
      <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted" />
      <input
        type="search"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full rounded-lg border border-border bg-surface-2 py-2 pl-9 pr-9 text-sm text-foreground',
          'placeholder:text-muted focus:border-accent focus:outline-none transition-colors',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      />
      <div className="absolute right-3 flex items-center">
        {loading
          ? <Loader2 className="h-4 w-4 text-muted animate-spin" />
          : value && (
            <button onClick={() => { setValue(''); onSearch('') }} className="text-muted hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          )
        }
      </div>
    </div>
  )
}
