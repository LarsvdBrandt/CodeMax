// Tooltip — hover/focus label for any element.
// Props: content (string), position (top|bottom|left|right), children
// Usage: <Tooltip content="Copy to clipboard"><Button>Copy</Button></Tooltip>

import { useState } from 'react'
import { cn }       from '@/lib/utils'

interface TooltipProps {
  content:    string
  position?:  'top' | 'bottom' | 'left' | 'right'
  children:   React.ReactNode
  className?: string
}

const positions = {
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full  left-1/2 -translate-x-1/2 mt-2',
  left:   'right-full top-1/2 -translate-y-1/2 mr-2',
  right:  'left-full  top-1/2 -translate-y-1/2 ml-2',
}

export function Tooltip({ content, position = 'top', children, className }: TooltipProps) {
  const [visible, setVisible] = useState(false)

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={()     => setVisible(true)}
      onBlur={()      => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-50 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background shadow-float',
            positions[position],
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}
