// CATEGORY: Forms & Input
// FileUpload — drag-and-drop or click-to-browse file zone.
// <FileUpload onFiles={files => console.log(files)} accept=".pdf,.png" multiple label="Upload files" />
import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { Upload, X, File, Image, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FileUploadProps {
  onFiles:     (files: File[]) => void
  accept?:     string           // e.g. "image/*,.pdf"
  multiple?:   boolean
  maxSize?:    number           // bytes
  maxFiles?:   number
  disabled?:   boolean
  label?:      string
  hint?:       string
  error?:      string
  className?:  string
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <Image className="h-4 w-4 text-info" />
  if (type.includes('pdf') || type.includes('text')) return <FileText className="h-4 w-4 text-warning" />
  return <File className="h-4 w-4 text-muted" />
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUpload({ onFiles, accept, multiple, maxSize, maxFiles, disabled, label, hint, error: propError, className }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false)
  const [files,    setFiles]    = useState<File[]>([])
  const [error,    setError]    = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function validate(incoming: File[]): { ok: File[]; err: string } {
    let ok = incoming
    if (maxSize)  ok = ok.filter(f => f.size <= maxSize)
    if (maxFiles) ok = ok.slice(0, maxFiles)
    const dropped = incoming.length - ok.length
    const err = dropped > 0 ? `${dropped} file(s) exceeded limits and were removed.` : ''
    return { ok, err }
  }

  function handle(incoming: FileList | null) {
    if (!incoming) return
    const { ok, err } = validate(Array.from(incoming))
    setError(err)
    const next = multiple ? [...files, ...ok] : ok.slice(0, 1)
    setFiles(next)
    onFiles(next)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (!disabled) handle(e.dataTransfer.files)
  }

  function onDragOver(e: DragEvent) { e.preventDefault(); if (!disabled) setDragOver(true) }

  function removeFile(i: number) {
    const next = files.filter((_, idx) => idx !== i)
    setFiles(next)
    onFiles(next)
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}

      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setDragOver(false)}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors',
          dragOver ? 'border-accent bg-accent/5 scale-[1.01]' : 'border-border hover:border-accent/50 hover:bg-surface-2/50',
          (propError || error) && 'border-error',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <Upload className={cn('h-8 w-8 transition-colors', dragOver ? 'text-accent' : 'text-muted')} />
        <p className="text-sm font-medium text-foreground">
          {dragOver ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="text-xs text-muted">or <span className="text-accent underline">browse</span></p>
        {hint && <p className="text-[11px] text-muted">{hint}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={(e: ChangeEvent<HTMLInputElement>) => handle(e.target.files)}
        />
      </div>

      {(propError || error) && <p className="text-xs text-error">{propError ?? error}</p>}

      {files.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
              <FileIcon type={f.type} />
              <span className="flex-1 text-xs text-foreground truncate">{f.name}</span>
              <span className="text-[10px] text-muted">{formatSize(f.size)}</span>
              <button type="button" onClick={() => removeFile(i)} className="text-muted hover:text-error transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
