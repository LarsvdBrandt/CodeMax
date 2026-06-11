// ─────────────────────────────────────────────────────────────────────────────
// App — root component.
// Sets up React Router with a shared layout (Navbar + Footer) and defines
// all application routes.
//
// To add a route:
//   1. Create the page component in src/pages/
//   2. Import it here
//   3. Add a <Route> inside the layout route below
//
// To protect a route (require login):
//   Wrap it with the <ProtectedRoute> component defined below.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Navbar }        from '@/components/layout/Navbar'
import { Footer }        from '@/components/layout/Footer'
import { ToastProvider } from '@/components/ui/Toast'
import { useAuth }       from '@/hooks/useAuth'

// Lazy-load pages so each route is a separate JS chunk (better initial load)
const Home          = lazy(() => import('@/pages/Home'))
const Login         = lazy(() => import('@/pages/Login'))
const Register      = lazy(() => import('@/pages/Register'))
const OAuthCallback = lazy(() => import('@/pages/OAuthCallback'))
const Dashboard          = lazy(() => import('@/pages/Dashboard'))
const ComponentShowcase  = lazy(() => import('@/pages/ComponentShowcase'))
// Add more pages here: const MyPage = lazy(() => import('@/pages/MyPage'))

// ── Loading fallback ──────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  )
}

// ── Shared layout (Navbar + Footer wrapping all routes) ───────────────────────
function Layout() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

// ── Protected route — redirects unauthenticated users to /login ───────────────
function ProtectedRoute() {
  const { isLoggedIn, loading } = useAuth()
  if (loading) return <PageLoader />
  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

// ── Auth route — redirects logged-in users away from /login and /register ────
function AuthRoute() {
  const { isLoggedIn, loading } = useAuth()
  if (loading) return <PageLoader />
  return isLoggedIn ? <Navigate to="/" replace /> : <Outlet />
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Shared layout wrapper */}
            <Route element={<Layout />}>

              {/* Public routes */}
              <Route path="/" element={<Home />} />

              {/* Component showcase — developer/AI reference page */}
              <Route path="/codemax/components" element={<ComponentShowcase />} />

              {/* OAuth callback — no layout needed but lives inside Layout so Navbar shows */}
              <Route path="/oauth-callback" element={<OAuthCallback />} />

              {/* Auth routes — redirect to / if already logged in */}
              <Route element={<AuthRoute />}>
                <Route path="/login"    element={<Login />}    />
                <Route path="/register" element={<Register />} />
              </Route>

              {/* Protected routes — require authentication */}
              <Route element={<ProtectedRoute />}>
                {/* Dashboard is the example post-login feature (Todo app).
                    Replace or extend this with your own authenticated pages. */}
                <Route path="/dashboard" element={<Dashboard />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  )
}
