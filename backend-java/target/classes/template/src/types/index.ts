// ─────────────────────────────────────────────────────────────────────────────
// SHARED TYPES
// Add any interfaces / types used across multiple files here.
// Feature-specific types can live next to the feature file instead.
// ─────────────────────────────────────────────────────────────────────────────

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id:             string
  email:          string
  name:           string
  avatarUrl?:     string
  role:           'user' | 'admin'
  provider?:      'local' | 'google' | 'github'
  emailVerified?: boolean
  createdAt:      string
}

export interface AuthTokens {
  accessToken:  string
  refreshToken?: string
}

export interface LoginPayload {
  email:    string
  password: string
}

export interface RegisterPayload {
  name:     string
  email:    string
  password: string
}

// ── API responses ─────────────────────────────────────────────────────────────

// Generic wrapper — most REST APIs return { data, message, success }
export interface ApiResponse<T> {
  data:     T
  message?: string
  success:  boolean
}

export interface ApiError {
  message: string
  code?:   string
  status:  number
}

// ── Todo (example authenticated resource) ────────────────────────────────────
// This is the template's example CRUD resource.
// Replace with your own domain model (Project, Post, Order, etc.)

export type TodoPriority = 'low' | 'medium' | 'high'

export interface Todo {
  _id:          string
  userId:       string
  title:        string
  description?: string
  completed:    boolean
  priority:     TodoPriority
  dueDate?:     string     // ISO 8601 date string
  tags:         string[]
  completedAt?: string
  createdAt:    string
  updatedAt:    string
}

export interface CreateTodoPayload {
  title:        string
  description?: string
  priority?:    TodoPriority
  dueDate?:     string
  tags?:        string[]
}

export interface UpdateTodoPayload extends Partial<CreateTodoPayload> {
  completed?: boolean
}

// ── Contact form ──────────────────────────────────────────────────────────────

export interface ContactPayload {
  name:    string
  email:   string
  subject: string
  message: string
}

// ── Navigation ────────────────────────────────────────────────────────────────

export interface NavItem {
  label:   string
  // Either a hash-scroll target (home page sections) or a route path
  href:    string
  section?: string  // id of the section to scroll to
}
