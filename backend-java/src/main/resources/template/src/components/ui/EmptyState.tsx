// EmptyState — centred placeholder for empty lists or zero-data views.
// Usage:
//   <EmptyState icon={<FileX />} title="No results"
//     description="Try adjusting your filters."
//     action={{ label: 'Clear filters', onClick: clearFilters }} />

import { Button } from './Button'
import { cn }     from '@/lib/utils'

interface EmptyStateProps {
  icon:         React.ReactNode
  title:        string
  description?: string
  action?:      { label: string; onClick: () => void }
  className?:   string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      <div className="h-12 w-12 rounded-full bg-surface-2 flex items-center justify-center text-muted mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-2 text-sm text-muted max-w-xs">{description}</p>}
      {action && (
        <Button variant="secondary" size="sm" className="mt-6" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
