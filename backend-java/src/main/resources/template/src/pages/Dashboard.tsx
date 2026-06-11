// ─────────────────────────────────────────────────────────────────────────────
// Dashboard — protected page, only accessible when logged in.
//
// WHAT THIS IS
// ────────────
// This is the EXAMPLE authenticated feature that ships with the template.
// It demonstrates the full pattern:
//   auth guard → protected route → API call → CRUD UI
//
// It contains a personal Todo app scoped to the logged-in user.
//
// REPLACE / EXTEND THIS
// ─────────────────────
// This page is meant to be your starting point, not your final product.
// Options:
//   A) Replace the Todo section entirely with your own feature
//   B) Keep the layout and add more sections / tabs for other resources
//   C) Split into sub-pages (e.g. /dashboard/projects, /dashboard/settings)
//
// The Todo CRUD pattern (list → create → edit → toggle → delete) is the
// reference implementation. Copy it for any new resource.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Check, Trash2, Pencil, Tag, Flag,
  LogOut, X, Clock,
} from 'lucide-react'
import { useAuth }       from '@/hooks/useAuth'
import { todoService }   from '@/services/todos'
import { Button }        from '@/components/ui/Button'
import { Input }         from '@/components/ui/Input'
import { Select }        from '@/components/ui/Select'
import { Badge }         from '@/components/ui/Badge'
import { Modal }         from '@/components/ui/Modal'
import { Alert }         from '@/components/ui/Alert'
import { Skeleton }      from '@/components/ui/Skeleton'
import { EmptyState }    from '@/components/ui/EmptyState'
import { Switch }        from '@/components/ui/Switch'
import { useToast }      from '@/components/ui/Toast'
import type { Todo, CreateTodoPayload, TodoPriority } from '@/types'

// ── Priority config ───────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<TodoPriority, { label: string; variant: 'default' | 'info' | 'warning' | 'error' }> = {
  low:    { label: 'Low',    variant: 'default' },
  medium: { label: 'Medium', variant: 'info'    },
  high:   { label: 'High',   variant: 'error'   },
}

// ── TodoForm — create / edit modal ───────────────────────────────────────────

interface TodoFormProps {
  initial?: Todo
  onSave:   (payload: CreateTodoPayload) => Promise<void>
  onClose:  () => void
  isOpen:   boolean
}

function TodoForm({ initial, onSave, onClose, isOpen }: TodoFormProps) {
  const [title,       setTitle]       = useState(initial?.title       ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [priority,    setPriority]    = useState<TodoPriority>(initial?.priority ?? 'medium')
  const [dueDate,     setDueDate]     = useState(
    initial?.dueDate ? initial.dueDate.slice(0, 16) : '',   // datetime-local format
  )
  const [tagInput,    setTagInput]    = useState('')
  const [tags,        setTags]        = useState<string[]>(initial?.tags ?? [])
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags(ts => [...ts, t])
      setTagInput('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError('')
    try {
      await onSave({
        title:       title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate:     dueDate ? new Date(dueDate).toISOString() : undefined,
        tags,
      })
      onClose()
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Edit todo' : 'New todo'} size="md">
      <form onSubmit={handleSubmit}>
        <Modal.Body className="space-y-4">
          <Input
            label="Title"
            value={title}
            onChange={e => { setTitle(e.target.value); setError('') }}
            placeholder="What needs to be done?"
            error={error && !title.trim() ? error : undefined}
            autoFocus
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional notes…"
              rows={3}
              className="w-full rounded border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted resize-none focus:border-accent focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              value={priority}
              onChange={e => setPriority(e.target.value as TodoPriority)}
              options={[
                { value: 'low',    label: 'Low'    },
                { value: 'medium', label: 'Medium' },
                { value: 'high',   label: 'High'   },
              ]}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Due date</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full rounded border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Tags</label>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Add tag…"
                className="flex-1 rounded border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none transition-colors"
              />
              <Button type="button" variant="secondary" size="sm" onClick={addTag}>Add</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full bg-accent/10 border border-accent/30 px-2.5 py-0.5 text-xs text-accent">
                    {t}
                    <button type="button" onClick={() => setTags(ts => ts.filter(x => x !== t))} className="hover:text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && <Alert variant="error" title={error} />}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={saving}>{initial ? 'Save changes' : 'Create todo'}</Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}

// ── TodoItem — single row ─────────────────────────────────────────────────────

interface TodoItemProps {
  todo:     Todo
  onToggle: (id: string) => void
  onEdit:   (todo: Todo) => void
  onDelete: (id: string) => void
}

function TodoItem({ todo, onToggle, onEdit, onDelete }: TodoItemProps) {
  const isOverdue = todo.dueDate && !todo.completed && new Date(todo.dueDate) < new Date()

  function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{    opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className={`group flex items-start gap-3 rounded-lg border p-4 transition-colors ${
        todo.completed ? 'border-border/50 bg-surface/50 opacity-60' : 'border-border bg-surface hover:border-accent/30'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(todo._id)}
        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          todo.completed ? 'border-success bg-success' : 'border-border hover:border-accent'
        }`}
        aria-label={todo.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {todo.completed && <Check className="h-3 w-3 text-white" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${todo.completed ? 'line-through text-muted' : 'text-foreground'}`}>
          {todo.title}
        </p>
        {todo.description && (
          <p className="mt-0.5 text-xs text-muted line-clamp-2">{todo.description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant={PRIORITY_CONFIG[todo.priority].variant} size="sm">
            <Flag className="h-2.5 w-2.5" />
            {PRIORITY_CONFIG[todo.priority].label}
          </Badge>
          {todo.dueDate && (
            <span className={`inline-flex items-center gap-1 text-xs ${isOverdue ? 'text-error' : 'text-muted'}`}>
              <Clock className="h-3 w-3" />
              {isOverdue ? 'Overdue · ' : ''}{formatDate(todo.dueDate)}
            </span>
          )}
          {todo.tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 text-xs text-muted">
              <Tag className="h-2.5 w-2.5" />{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => onEdit(todo)}
          className="p-1.5 rounded text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
          aria-label="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(todo._id)}
          className="p-1.5 rounded text-muted hover:text-error hover:bg-error/10 transition-colors"
          aria-label="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

// ── Dashboard page ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, logout }    = useAuth()
  const { toast }           = useToast()

  const [todos,       setTodos]       = useState<Todo[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [editing,     setEditing]     = useState<Todo | null>(null)
  const [showDone,    setShowDone]    = useState(true)
  const [filterPrio,  setFilterPrio]  = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await todoService.list()
      setTodos(data)
    } catch {
      toast.error('Failed to load todos')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  async function handleCreate(payload: CreateTodoPayload) {
    const todo = await todoService.create(payload)
    setTodos(ts => [todo, ...ts])
    toast.success('Todo created')
  }

  async function handleUpdate(payload: CreateTodoPayload) {
    if (!editing) return
    const updated = await todoService.update(editing._id, payload)
    setTodos(ts => ts.map(t => t._id === updated._id ? updated : t))
    toast.success('Todo updated')
    setEditing(null)
  }

  async function handleToggle(id: string) {
    try {
      const updated = await todoService.toggle(id)
      setTodos(ts => ts.map(t => t._id === updated._id ? updated : t))
    } catch {
      toast.error('Failed to update todo')
    }
  }

  async function handleDelete(id: string) {
    try {
      await todoService.delete(id)
      setTodos(ts => ts.filter(t => t._id !== id))
      toast.success('Todo deleted')
    } catch {
      toast.error('Failed to delete todo')
    }
  }

  // Derived counts
  const total    = todos.length
  const done     = todos.filter(t => t.completed).length
  const overdue  = todos.filter(t => t.dueDate && !t.completed && new Date(t.dueDate) < new Date()).length

  // Filtered view
  const visible = todos.filter(t => {
    if (!showDone && t.completed) return false
    if (filterPrio && t.priority !== filterPrio) return false
    return true
  })

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-surface sticky top-16 z-40">
        <div className="mx-auto max-w-3xl px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">My todos</span>
            <span className="text-xs text-muted">{done}/{total} done</span>
            {overdue > 0 && (
              <Badge variant="error" dot size="sm">{overdue} overdue</Badge>
            )}
          </div>
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowForm(true)}>
            New todo
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8">

        {/* ── User greeting ──────────────────────────────────────────────── */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Hello, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-sm text-muted mt-0.5">
              {total === 0 ? 'No todos yet — create your first one.' :
               done === total ? '🎉 All done! Great work.' :
               `${total - done} remaining`}
            </p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-xs text-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>

        {/* ── Filters ────────────────────────────────────────────────────── */}
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <Switch checked={showDone} onChange={setShowDone} label="Show completed" />
          <select
            value={filterPrio}
            onChange={e => setFilterPrio(e.target.value)}
            className="rounded border border-border bg-surface-2 px-2 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
          >
            <option value="">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* ── Todo list ───────────────────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} variant="rect" className="h-20 w-full rounded-lg" />)}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Check className="h-6 w-6" />}
            title={todos.length === 0 ? 'No todos yet' : 'Nothing to show'}
            description={todos.length === 0 ? 'Hit "New todo" to get started.' : 'Try changing your filters.'}
            action={todos.length === 0 ? { label: 'Create first todo', onClick: () => setShowForm(true) } : undefined}
          />
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {visible.map(todo => (
                <TodoItem
                  key={todo._id}
                  todo={todo}
                  onToggle={handleToggle}
                  onEdit={t => { setEditing(t); setShowForm(true) }}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* ── Create / Edit modal ─────────────────────────────────────────────── */}
      <TodoForm
        isOpen={showForm}
        initial={editing ?? undefined}
        onSave={editing ? handleUpdate : handleCreate}
        onClose={() => { setShowForm(false); setEditing(null) }}
      />
    </div>
  )
}
