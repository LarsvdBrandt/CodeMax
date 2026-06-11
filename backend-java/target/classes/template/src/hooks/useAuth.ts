// ─────────────────────────────────────────────────────────────────────────────
// useAuth — lightweight auth state hook
//
// Wraps the authService and exposes user, loading, error, login, register,
// logout. In a larger app replace this with a Context + Provider so the state
// is shared across the whole tree without prop-drilling.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { authService, tokenStorage } from '@/services/api'
import type { LoginPayload, RegisterPayload, User } from '@/types'

interface AuthState {
  user:     User | null
  loading:  boolean
  error:    string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user:    null,
    loading: !!tokenStorage.get(), // start loading only if a token exists
    error:   null,
  })

  // Re-fetch the current user on mount if a token is present
  useEffect(() => {
    if (!tokenStorage.get()) return
    authService.me()
      .then(user  => setState({ user, loading: false, error: null }))
      .catch(()   => {
        tokenStorage.remove()
        setState({ user: null, loading: false, error: null })
      })
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const { user } = await authService.login(payload)
      setState({ user, loading: false, error: null })
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? 'Login failed'
      setState(s => ({ ...s, loading: false, error: msg }))
      throw err
    }
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const { user } = await authService.register(payload)
      setState({ user, loading: false, error: null })
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? 'Registration failed'
      setState(s => ({ ...s, loading: false, error: msg }))
      throw err
    }
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setState({ user: null, loading: false, error: null })
  }, [])

  // Called by OAuthCallback page after the backend redirects with ?token=
  const loginWithOAuth = useCallback(async (token: string) => {
    tokenStorage.set(token)
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const user = await authService.me()
      setState({ user, loading: false, error: null })
    } catch {
      tokenStorage.remove()
      setState({ user: null, loading: false, error: null })
    }
  }, [])

  return {
    user:          state.user,
    loading:       state.loading,
    error:         state.error,
    isLoggedIn:    !!state.user,
    login,
    register,
    logout,
    loginWithOAuth,
  }
}
