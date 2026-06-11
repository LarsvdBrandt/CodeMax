// PricingCard — pricing tier display with feature list and CTA.
// Set highlighted=true on the recommended plan for an accent border.
// Usage:
//   <PricingCard name="Pro" price="$19" period="/month"
//     features={['Unlimited projects', 'API access']}
//     cta={{ label: 'Start free trial', onClick: () => navigate('/register') }}
//     highlighted />

import { Check } from 'lucide-react'
import { Button } from './Button'
import { cn }     from '@/lib/utils'

interface PricingCardProps {
  name:        string
  price:       string
  period?:     string
  description?: string
  features:    string[]
  cta:         { label: string; onClick: () => void }
  highlighted?: boolean
  className?:  string
}

export function PricingCard({
  name, price, period, description, features, cta, highlighted, className,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border p-8',
        highlighted
          ? 'border-accent bg-accent/5 shadow-float'
          : 'border-border bg-surface',
        className,
      )}
    >
      {highlighted && (
        <span className="mb-4 self-start rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-white">
          Recommended
        </span>
      )}

      <h3 className="text-lg font-bold text-foreground">{name}</h3>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}

      <div className="mt-6 flex items-end gap-1">
        <span className="text-4xl font-extrabold text-foreground">{price}</span>
        {period && <span className="mb-1 text-sm text-muted">{period}</span>}
      </div>

      <ul className="mt-8 flex-1 space-y-3">
        {features.map(f => (
          <li key={f} className="flex items-start gap-3 text-sm text-muted">
            <Check className="h-4 w-4 flex-shrink-0 text-success mt-0.5" />
            {f}
          </li>
        ))}
      </ul>

      <Button
        variant={highlighted ? 'primary' : 'secondary'}
        className="mt-8 w-full"
        onClick={cta.onClick}
      >
        {cta.label}
      </Button>
    </div>
  )
}
