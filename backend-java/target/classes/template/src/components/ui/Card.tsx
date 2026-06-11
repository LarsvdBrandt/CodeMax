// ─────────────────────────────────────────────────────────────────────────────
// Card — surface container with optional header, footer, and hover lift.
//
// Usage:
//   <Card>content</Card>
//   <Card hover><Card.Header>Title</Card.Header>content</Card>
// ─────────────────────────────────────────────────────────────────────────────

import { cn } from '@/lib/utils'

interface CardProps {
  children:  React.ReactNode
  className?: string
  hover?:     boolean // adds a subtle lift on hover
  glass?:     boolean // applies glass-morphism style
}

export function Card({ children, className, hover, glass }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface p-6 shadow-card',
        hover && 'transition-transform duration-200 hover:-translate-y-1 hover:shadow-float',
        glass && 'glass',
        className,
      )}
    >
      {children}
    </div>
  )
}

// Sub-components keep card structure semantic without extra nesting
Card.Header = function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4 border-b border-border pb-4', className)}>
      {children}
    </div>
  )
}

Card.Footer = function CardFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mt-4 border-t border-border pt-4', className)}>
      {children}
    </div>
  )
}
