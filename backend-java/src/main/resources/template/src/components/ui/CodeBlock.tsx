// CATEGORY: Data Display
// CodeBlock — syntax-highlighted code block with copy button and optional filename.
// <CodeBlock code={snippet} language="typescript" filename="utils.ts" />
import { useState } from 'react'
import { Copy, Check, Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CodeBlockProps {
  code:       string
  language?:  string
  filename?:  string
  showLines?: boolean
  maxHeight?: number   // px
  className?: string
}

export function CodeBlock({ code, language, filename, showLines, maxHeight, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const lines = code.split('\n')

  return (
    <div className={cn('rounded-xl border border-border bg-surface overflow-hidden font-mono text-sm', className)}>
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-muted" />
          {filename
            ? <span className="text-xs text-muted">{filename}</span>
            : language && <span className="text-xs text-muted uppercase">{language}</span>
          }
        </div>
        <button
          onClick={copy}
          className={cn(
            'flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors',
            copied ? 'text-success' : 'text-muted hover:text-foreground hover:bg-surface',
          )}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Code area */}
      <div className="overflow-auto" style={maxHeight ? { maxHeight } : undefined}>
        <pre className="p-4 text-xs leading-relaxed text-foreground whitespace-pre">
          {showLines
            ? lines.map((line, i) => (
              <div key={i} className="flex gap-4">
                <span className="select-none w-8 text-right text-muted flex-shrink-0">{i + 1}</span>
                <span>{line}</span>
              </div>
            ))
            : code
          }
        </pre>
      </div>
    </div>
  )
}
