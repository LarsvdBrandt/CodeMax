// Table — typed data table with optional sorting and striped rows.
//
// Usage:
//   const cols: Column<User>[] = [
//     { key: 'name',  header: 'Name',  sortable: true },
//     { key: 'email', header: 'Email' },
//     { key: 'role',  header: 'Role',  render: (v) => <Badge>{String(v)}</Badge> },
//   ]
//   <Table columns={cols} data={users} striped />

import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key:       keyof T
  header:    string
  sortable?: boolean
  render?:   (value: T[keyof T], row: T) => React.ReactNode
  className?: string
}

interface TableProps<T> {
  columns:    Column<T>[]
  data:       T[]
  striped?:   boolean
  onSort?:    (key: keyof T, direction: 'asc' | 'desc') => void
  className?: string
  emptyText?: string
}

export function Table<T extends object>({
  columns, data, striped, onSort, className, emptyText = 'No data',
}: TableProps<T>) {
  const [sortKey, setSortKey]   = useState<keyof T | null>(null)
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('asc')

  function handleSort(key: keyof T) {
    const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc'
    setSortKey(key)
    setSortDir(newDir)
    if (onSort) {
      onSort(key, newDir)
    }
  }

  // Local sort when no external handler provided
  const rows = onSort
    ? data
    : [...data].sort((a, b) => {
        if (!sortKey) return 0
        const av = a[sortKey], bv = b[sortKey]
        const cmp = String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })

  return (
    <div className={cn('w-full overflow-x-auto rounded-lg border border-border', className)}>
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-surface">
          <tr>
            {columns.map(col => (
              <th
                key={String(col.key)}
                className={cn('px-4 py-3 text-left font-medium text-muted', col.sortable && 'cursor-pointer select-none hover:text-foreground', col.className)}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    sortKey === col.key
                      ? sortDir === 'asc'
                        ? <ChevronUp className="h-3 w-3" />
                        : <ChevronDown className="h-3 w-3" />
                      : <ChevronsUpDown className="h-3 w-3 opacity-40" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-muted">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  'border-b border-border last:border-0 transition-colors',
                  striped && i % 2 === 1 ? 'bg-surface/50' : 'bg-transparent',
                  'hover:bg-surface-2/50',
                )}
              >
                {columns.map(col => (
                  <td key={String(col.key)} className={cn('px-4 py-3 text-foreground', col.className)}>
                    {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
