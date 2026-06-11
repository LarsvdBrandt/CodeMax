// CATEGORY: Navigation
// Breadcrumb — show the current location in a hierarchy.
// <Breadcrumb items={[{label:'Home',href:'/'},{label:'Dashboard',href:'/dashboard'},{label:'Settings'}]} />
import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label:   string
  href?:   string
  icon?:   React.ReactNode
}

export interface BreadcrumbProps {
  items:      BreadcrumbItem[]
  showHome?:  boolean
  className?: string
}

export function Breadcrumb({ items, showHome = true, className }: BreadcrumbProps) {
  const all = showHome ? [{ label: 'Home', href: '/', icon: <Home className="h-3.5 w-3.5" /> }, ...items] : items

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1', className)}>
      {all.map((item, i) => {
        const isLast = i === all.length - 1
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted flex-shrink-0" />}
            {isLast ? (
              <span className="text-sm font-medium text-foreground flex items-center gap-1">
                {item.icon}{item.label}
              </span>
            ) : (
              item.href ? (
                <Link to={item.href} className="text-sm text-muted hover:text-foreground transition-colors flex items-center gap-1">
                  {item.icon}{item.label}
                </Link>
              ) : (
                <span className="text-sm text-muted flex items-center gap-1">{item.icon}{item.label}</span>
              )
            )}
          </span>
        )
      })}
    </nav>
  )
}
