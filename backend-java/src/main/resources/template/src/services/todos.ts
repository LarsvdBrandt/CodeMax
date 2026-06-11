// ─────────────────────────────────────────────────────────────────────────────
// Todo service — frontend API calls for the example CRUD resource.
//
// TEMPLATE NOTE
// ─────────────────────────────────────────────────────────────────────────────
// This is the reference pattern for a frontend resource service.
// To add a new resource (e.g. "projects"):
//   1. Copy this file → src/services/projects.ts
//   2. Replace all `todo` / `Todo` references with `project` / `Project`
//   3. Update the import of api.endpoints.todo* to your new endpoint keys
//   4. Use in your page/component via: import { todoService } from '@/services/todos'
//
// All calls use the shared http wrapper from src/services/api.ts which:
//   - Attaches Authorization: Bearer <token> automatically
//   - Throws ApiError with { message, status } on non-2xx responses
//   - Applies a configurable timeout (src/config/api.ts → timeout)
// ─────────────────────────────────────────────────────────────────────────────

import { api as cfg }    from '@/config/api'
import { tokenStorage }  from '@/services/api'
import type { Todo, CreateTodoPayload, UpdateTodoPayload } from '@/types'

// ── Shared fetch helper (mirrors the one in services/api.ts) ──────────────────
// We re-use the token storage from the main api service.

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStorage.get()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  }

  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), cfg.timeout)

  let res: Response
  try {
    res = await fetch(`${cfg.baseUrl}${path}`, { ...options, headers, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }

  const text = await res.text()
  const json = text ? JSON.parse(text) : null

  if (!res.ok) throw { message: json?.message ?? res.statusText, status: res.status }
  return (json?.data ?? json) as T
}

// ── Todo CRUD service ─────────────────────────────────────────────────────────

export interface TodoFilters {
  completed?: boolean
  priority?:  'low' | 'medium' | 'high'
  tag?:       string
  sort?:      'createdAt' | 'dueDate' | 'priority'
}

export const todoService = {
  // List all todos for the logged-in user, with optional filters
  list(filters: TodoFilters = {}): Promise<Todo[]> {
    const params = new URLSearchParams()
    if (filters.completed !== undefined) params.set('completed', String(filters.completed))
    if (filters.priority)                params.set('priority',  filters.priority)
    if (filters.tag)                     params.set('tag',       filters.tag)
    if (filters.sort)                    params.set('sort',      filters.sort)
    const qs = params.toString()
    return req<Todo[]>(`${cfg.endpoints.todos}${qs ? `?${qs}` : ''}`)
  },

  // Get a single todo by id
  get(id: string): Promise<Todo> {
    return req<Todo>(cfg.endpoints.todo(id))
  },

  // Create a new todo
  create(payload: CreateTodoPayload): Promise<Todo> {
    return req<Todo>(cfg.endpoints.todos, {
      method: 'POST',
      body:   JSON.stringify(payload),
    })
  },

  // Update todo fields (title, description, priority, dueDate, tags, completed)
  update(id: string, payload: UpdateTodoPayload): Promise<Todo> {
    return req<Todo>(cfg.endpoints.todo(id), {
      method: 'PUT',
      body:   JSON.stringify(payload),
    })
  },

  // Toggle completed ↔ incomplete (convenience endpoint — no body needed)
  toggle(id: string): Promise<Todo> {
    return req<Todo>(cfg.endpoints.todoToggle(id), { method: 'PATCH' })
  },

  // Delete a todo
  delete(id: string): Promise<void> {
    return req<void>(cfg.endpoints.todo(id), { method: 'DELETE' })
  },
}
