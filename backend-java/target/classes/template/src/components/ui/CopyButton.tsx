// CATEGORY: Forms & Input
// CopyButton — inline copy-to-clipboard button with success flash.
// <CopyButton value="text to copy" />   or   <CopyButton value={url} label="Copy URL" />
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CopyButtonProps {
  value:     string
  label?:    string
  size?:     'sm' | 'md'
  className?: string
}

export function CopyButton({ value, label, size = 'sm', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const iconCls = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const textCls = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 transition-all',
        copied
          ? 'border-success/40 bg-success/10 text-success'
          : 'border-border bg-surface-2 text-muted hover:text-foreground hover:border-accent/40',
        textCls,
        className,
      )}
    >
      {copied ? <Check className={iconCls} /> : <Copy className={iconCls} />}
      {label && <span>{copied ? 'Copied!' : label}</span>}
    </button>
  )
}
