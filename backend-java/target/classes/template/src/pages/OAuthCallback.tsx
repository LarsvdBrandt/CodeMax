// OAuthCallback — landing page after a Google/GitHub OAuth redirect.
//
// Flow:
//   1. Backend signs JWT and redirects to: /oauth-callback?token=<jwt>
//   2. This page reads the token from the URL, strips it from history (security),
//      stores it, fetches the user, then navigates home.
//   3. If no token param is present, redirects to /login.

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth }  from '@/hooks/useAuth'

export default function OAuthCallback() {
  const { loginWithOAuth } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token  = params.get('token')

    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    // Remove token from browser history immediately
    window.history.replaceState({}, '', '/')

    loginWithOAuth(token).then(() => navigate('/', { replace: true }))
  // loginWithOAuth is stable (useCallback), safe to include
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
}
