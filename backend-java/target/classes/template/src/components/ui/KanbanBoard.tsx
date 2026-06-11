// ─────────────────────────────────────────────────────────────────────────────
// KanbanBoard — Jira-style pipeline board with drag-and-drop columns.
//
// CATEGORY: Productivity / Data Management
//
// USAGE EXAMPLE:
//   const [columns, setColumns] = useState<KanbanColumn[]>([
//     { id: 'todo',       label: 'To Do',       color: 'var(--color-muted)', cards: [] },
//     { id: 'inprogress', label: 'In Progress',  color: 'var(--color-accent)', cards: [] },
//     { id: 'done',       label: 'Done',         color: 'var(--color-success)', cards: [] },
//   ])
//   <KanbanBoard columns={columns} onChange={setColumns} onCardClick={card => console.log(card)} />
//
// CUSTOMIZATION:
//   - Add/remove columns by editing the columns array
//   - Each KanbanCard has: id, title, description?, priority?, assignee?, tags?, dueDate?
//   - Provide onCreateCard to render a create-card button per column
//   - Provide renderCard for a fully custom card renderer
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, MoreHorizontal, GripVertical, Calendar, Flag, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from './Badge'

// ── Types ─────────────────────────────────────────────────────────────────────

export type KanbanPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface KanbanCard {
  id:           string
  title:        string
  description?: string
  priority?:    KanbanPriority
  assignee?:    { name: string; avatarUrl?: string }
  tags?:        string[]
  dueDate?:     string  // ISO string
  columnId:     string
}

export interface KanbanColumn {
  id:      string
  label:   string
  color?:  string   // CSS colour for the column accent strip
  limit?:  number   // WIP limit — shown as badge, no hard enforcement
  cards:   KanbanCard[]
}

export interface KanbanBoardProps {
  columns:       KanbanColumn[]
  onChange:      (columns: KanbanColumn[]) => void
  onCardClick?:  (card: KanbanCard) => void
  onCreateCard?: (columnId: string) => void
  renderCard?:   (card: KanbanCard) => React.ReactNode
  className?:    string
}

// ── Priority config ───────────────────────────────────────────────────────────

const PRIORITY: Record<KanbanPriority, { label: string; variant: 'default' | 'info' | 'warning' | 'error' }> = {
  low:    { label: 'Low',    variant: 'default'  },
  medium: { label: 'Med',    variant: 'info'     },
  high:   { label: 'High',   variant: 'warning'  },
  urgent: { label: 'Urgent', variant: 'error'    },
}

// ── Default card renderer ─────────────────────────────────────────────────────

function DefaultCard({ card, onClick }: { card: KanbanCard; onClick?: () => void }) {
  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date()

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border border-border bg-background p-3 cursor-pointer',
        'hover:border-accent/40 hover:shadow-sm transition-all group/card',
      )}
    >
      {/* Tags */}
      {card.tags && card.tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {card.tags.map(t => (
            <span key={t} className="inline-flex items-center gap-0.5 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
              <Tag className="h-2.5 w-2.5" />{t}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium text-foreground leading-snug">{card.title}</p>

      {/* Description */}
      {card.description && (
        <p className="mt-1 text-xs text-muted line-clamp-2">{card.description}</p>
      )}

      {/* Footer meta */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {card.priority && (
            <Badge variant={PRIORITY[card.priority].variant} size="sm">
              <Flag className="h-2.5 w-2.5" />
              {PRIORITY[card.priority].label}
            </Badge>
          )}
          {card.dueDate && (
            <span className={cn('inline-flex items-center gap-1 text-[10px]', isOverdue ? 'text-error' : 'text-muted')}>
              <Calendar className="h-2.5 w-2.5" />
              {new Date(card.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
        {card.assignee && (
          <div className="flex items-center gap-1">
            {card.assignee.avatarUrl ? (
              <img src={card.assignee.avatarUrl} alt={card.assignee.name} className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-[9px] font-bold text-accent">
                {card.assignee.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── KanbanColumn component ────────────────────────────────────────────────────

interface ColumnProps {
  column:        KanbanColumn
  onCardClick?:  (card: KanbanCard) => void
  onCreateCard?: (colId: string) => void
  renderCard?:   (card: KanbanCard) => React.ReactNode
  onDragStart:   (card: KanbanCard) => void
  onDrop:        (colId: string, afterCardId?: string) => void
  dragging:      KanbanCard | null
}

function Column({ column, onCardClick, onCreateCard, renderCard, onDragStart, onDrop, dragging }: ColumnProps) {
  const [isOver, setIsOver] = useState(false)
  const overCardRef = useRef<string | null>(null)

  const atLimit = column.limit !== undefined && column.cards.length >= column.limit

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsOver(true)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsOver(false)
    onDrop(column.id, overCardRef.current ?? undefined)
    overCardRef.current = null
  }

  return (
    <div
      className={cn(
        'flex w-72 flex-shrink-0 flex-col rounded-xl border border-border bg-surface transition-colors',
        isOver && 'border-accent/60 bg-accent/5',
      )}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          {/* Colour dot */}
          <span
            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
            style={{ background: column.color ?? 'rgb(var(--color-accent))' }}
          />
          <span className="text-sm font-semibold text-foreground">{column.label}</span>
          <span className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
            atLimit ? 'bg-error/20 text-error' : 'bg-surface-2 text-muted',
          )}>
            {column.cards.length}{column.limit ? `/${column.limit}` : ''}
          </span>
        </div>
        <button className="p-1 rounded text-muted hover:text-foreground transition-colors">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 flex-1 min-h-[120px]">
        <AnimatePresence>
          {column.cards.map(card => (
            <motion.div
              key={card.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: dragging?.id === card.id ? 0.4 : 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              draggable
              onDragStart={() => onDragStart(card)}
              onDragEnter={() => { overCardRef.current = card.id }}
              className="cursor-grab active:cursor-grabbing"
            >
              <div className="flex items-start gap-1">
                <span className="mt-2.5 flex-shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-3 w-3" />
                </span>
                <div className="flex-1 min-w-0">
                  {renderCard
                    ? renderCard(card)
                    : <DefaultCard card={card} onClick={() => onCardClick?.(card)} />
                  }
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Drop placeholder */}
        {isOver && dragging && dragging.columnId !== column.id && (
          <div className="h-16 rounded-lg border-2 border-dashed border-accent/50 bg-accent/5" />
        )}
      </div>

      {/* Add card button */}
      {onCreateCard && (
        <button
          onClick={() => onCreateCard(column.id)}
          className="m-2 mt-0 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add card
        </button>
      )}
    </div>
  )
}

// ── KanbanBoard ───────────────────────────────────────────────────────────────

export function KanbanBoard({ columns, onChange, onCardClick, onCreateCard, renderCard, className }: KanbanBoardProps) {
  const [dragging, setDragging] = useState<KanbanCard | null>(null)

  function handleDragStart(card: KanbanCard) {
    setDragging(card)
  }

  function handleDrop(targetColId: string, afterCardId?: string) {
    if (!dragging) return

    const next = columns.map(col => {
      // Remove card from its current column
      if (col.id === dragging.columnId) {
        return { ...col, cards: col.cards.filter(c => c.id !== dragging.id) }
      }
      // Insert into target column
      if (col.id === targetColId) {
        const updated = { ...dragging, columnId: targetColId }
        if (!afterCardId) return { ...col, cards: [...col.cards, updated] }
        const idx = col.cards.findIndex(c => c.id === afterCardId)
        const cards = [...col.cards]
        cards.splice(idx + 1, 0, updated)
        return { ...col, cards }
      }
      return col
    })

    onChange(next)
    setDragging(null)
  }

  return (
    <div
      className={cn('flex gap-4 overflow-x-auto pb-4', className)}
      onDragEnd={() => setDragging(null)}
    >
      {columns.map(col => (
        <Column
          key={col.id}
          column={col}
          onCardClick={onCardClick}
          onCreateCard={onCreateCard}
          renderCard={renderCard}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          dragging={dragging}
        />
      ))}
    </div>
  )
}
