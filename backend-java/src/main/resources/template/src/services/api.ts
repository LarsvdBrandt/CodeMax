// ─────────────────────────────────────────────────────────────────────────────
// API SERVICE — fetch wrapper + typed endpoint helpers
//
// Why a wrapper instead of raw fetch?
//   • Attaches auth token automatically from localStorage
//   • Normalises error shape to ApiError
//   • Applies request timeout
//   • Single place to add retry logic, logging, or interceptors later
//
// Usage:
//   import { authService, contactService } from '@/services/api'
//   const user = await authService.login({ email, password })
// ─────────────────────────────────────────────────────────────────────────────

import { api as cfg } from '@/config/api'
import type {
  ApiError,
  ApiResponse,
  AuthTokens,
  ContactPayload,
  LoginPayload,
  RegisterPayload,
  User,
} from '@/types'

// ── Token storage helpers ─────────────────────────────────────────────────────
// Swap these for a cookie-based approach or a state manager if preferred.

const TOKEN_KEY = 'auth_access_token'

export const tokenStorage = {
  get:    ()              => localStorage.getItem(TOKEN_KEY),
  set:    (t: string)     => localStorage.setItem(TOKEN_KEY, t),
  remove: ()              => localStorage.removeItem(TOKEN_KEY),
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

interface RequestOptions extends RequestInit {
  // Pass false to skip attaching the Authorization header
  auth?: boolean
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, headers: extraHeaders, ...rest } = options

  const headers: Record<string, string> = {
    ...cfg.defaultHeaders,
    ...(extraHeaders as Record<string, string>),
  }

  // Attach bearer token when available and auth is not explicitly disabled
  const token = tokenStorage.get()
  if (auth && token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Abort after configured timeout
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), cfg.timeout)

  let response: Response
  try {
    response = await fetch(`${cfg.baseUrl}${path}`, {
      ...rest,
      headers,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }

  // Parse body — API may return empty body on 204
  const text = await response.text()
  const json = text ? (JSON.parse(text) as ApiResponse<T>) : null

  if (!response.ok) {
    const err: ApiError = {
      message: json?.message ?? response.statusText,
      status:  response.status,
    }
    throw err
  }

  // Unwrap the data envelope if present, otherwise return raw json
  return (json?.data ?? json) as T
}

// Convenience methods
const http = {
  get:    <T>(path: string, opts?: RequestOptions)               => request<T>(path, { method: 'GET', ...opts }),
  post:   <T>(path: string, body: unknown, opts?: RequestOptions)=> request<T>(path, { method: 'POST',  body: JSON.stringify(body), ...opts }),
  put:    <T>(path: string, body: unknown, opts?: RequestOptions)=> request<T>(path, { method: 'PUT',   body: JSON.stringify(body), ...opts }),
  patch:  <T>(path: string, body: unknown, opts?: RequestOptions)=> request<T>(path, { method: 'PATCH', body: JSON.stringify(body), ...opts }),
  delete: <T>(path: string, opts?: RequestOptions)               => request<T>(path, { method: 'DELETE', ...opts }),
}

// ── Auth service ──────────────────────────────────────────────────────────────

export const authService = {
  async login(payload: LoginPayload): Promise<{ user: User; tokens: AuthTokens }> {
    const result = await http.post<{ user: User; tokens: AuthTokens }>(
      cfg.endpoints.login,
      payload,
      { auth: false }, // no token needed for login
    )
    tokenStorage.set(result.tokens.accessToken)
    return result
  },

  async register(payload: RegisterPayload): Promise<{ user: User; tokens: AuthTokens }> {
    const result = await http.post<{ user: User; tokens: AuthTokens }>(
      cfg.endpoints.register,
      payload,
      { auth: false },
    )
    tokenStorage.set(result.tokens.accessToken)
    return result
  },

  async logout(): Promise<void> {
    try {
      await http.post(cfg.endpoints.logout, {})
    } finally {
      // Always clear the local token even if the server call fails
      tokenStorage.remove()
    }
  },

  me(): Promise<User> {
    return http.get<User>(cfg.endpoints.me)
  },
}

// ── Contact service ───────────────────────────────────────────────────────────

export const contactService = {
  send(payload: ContactPayload): Promise<void> {
    return http.post(cfg.endpoints.contact, payload, { auth: false })
  },
}

// ── Generic resource factory ──────────────────────────────────────────────────
// Use this to quickly scaffold CRUD for a new resource type:
//   const postService = createResourceService<Post>('/posts')
//   const posts = await postService.list()

export function createResourceService<T>(basePath: string) {
  return {
    list:   ()                 => http.get<T[]>(basePath),
    get:    (id: string)       => http.get<T>(`${basePath}/${id}`),
    create: (body: Partial<T>) => http.post<T>(basePath, body),
    update: (id: string, body: Partial<T>) => http.patch<T>(`${basePath}/${id}`, body),
    remove: (id: string)       => http.delete<void>(`${basePath}/${id}`),
  }
}
