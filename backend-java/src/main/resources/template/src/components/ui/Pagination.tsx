// Pagination — page navigator with prev/next and numbered pages.
// Truncates with … when totalPages > 7.
// Usage: <Pagination currentPage={page} totalPages={20} onPageChange={setPage} />

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  currentPage:  number
  totalPages:   number
  onPageChange: (page: number) => void
  className?:   string
}

function getPages(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  const pages = getPages(currentPage, totalPages)

  const btnBase = 'inline-flex h-8 w-8 items-center justify-center rounded text-sm font-medium transition-colors'
  const activeClass = 'bg-accent text-white'
  const inactiveClass = 'text-muted hover:bg-surface-2 hover:text-foreground'
  const disabledClass = 'opacity-30 cursor-not-allowed'

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Prev */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(btnBase, currentPage === 1 ? disabledClass : inactiveClass)}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Pages */}
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className={cn(btnBase, 'text-muted cursor-default')}>…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={cn(btnBase, p === currentPage ? activeClass : inactiveClass)}
            aria-current={p === currentPage ? 'page' : undefined}
          >
            {p}
          </button>
        ),
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(btnBase, currentPage === totalPages ? disabledClass : inactiveClass)}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
