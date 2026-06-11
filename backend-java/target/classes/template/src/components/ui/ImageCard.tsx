// ImageCard — image with caption, aspect-ratio control, and hover overlay.
// Props: src, alt, caption?, aspectRatio (square|video|portrait), onClick?
// Usage: <ImageCard src="/photo.jpg" alt="Team" caption="Our office" aspectRatio="video" />

import { cn } from '@/lib/utils'

interface ImageCardProps {
  src:          string
  alt:          string
  caption?:     string
  aspectRatio?: 'square' | 'video' | 'portrait'
  onClick?:     () => void
  className?:   string
}

const ratios = {
  square:   'aspect-square',
  video:    'aspect-video',
  portrait: 'aspect-[3/4]',
}

export function ImageCard({ src, alt, caption, aspectRatio = 'video', onClick, className }: ImageCardProps) {
  return (
    <div
      className={cn('overflow-hidden rounded-lg border border-border group', onClick && 'cursor-pointer', className)}
      onClick={onClick}
    >
      <div className={cn('relative overflow-hidden bg-surface-2', ratios[aspectRatio])}>
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Hover overlay */}
        {onClick && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <span className="text-white text-sm font-medium">View</span>
          </div>
        )}
      </div>
      {caption && (
        <div className="px-3 py-2 bg-surface border-t border-border">
          <p className="text-xs text-muted">{caption}</p>
        </div>
      )}
    </div>
  )
}
