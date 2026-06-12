// ─────────────────────────────────────────────────────────────────────────────
// Navbar — floating top bar with:
//   • Logo / brand name
//   • Nav links that smooth-scroll to home-page sections (or route to /login etc.)
//   • Login icon + "Get Started" CTA
//   • Collapses to a hamburger on mobile
//   • Becomes opaque with a blur backdrop after scrolling 50 px
//
// To add a nav item: append an entry to NAV_ITEMS below.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, LogIn, LogOut, User, Zap, LayoutDashboard } from 'lucide-react'
import { useScrollTo } from '@/hooks/useScrollTo'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'

// ── Nav items configuration ───────────────────────────────────────────────────
// `section` scrolls to that element id on the home page.
// `href` navigates to that route via React Router.
interface NavItem {
  label:    string
  section?: string
  href?:    string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Features', section: 'features' },
  { label: 'About',    section: 'about'    },
  { label: 'Work',     section: 'work'     },
  { label: 'Contact',  section: 'contact'  },
]

export function Navbar() {
  const [open,      setOpen]      = useState(false)   // mobile menu
  const [scrolled,  setScrolled]  = useState(false)   // scroll threshold passed

  const scrollTo  = useScrollTo()
  const { user, logout } = useAuth()
  const location  = useLocation()
  const navigate  = useNavigate()
  const isHome    = location.pathname === '/'

  // Track scroll position to toggle backdrop
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => setOpen(false), [location])

  function handleNavClick(item: NavItem) {
    if (item.href) {
      navigate(item.href)
    } else if (item.section) {
      if (!isHome) {
        navigate('/')
        setTimeout(() => scrollTo(item.section!), 100)
      } else {
        scrollTo(item.section)
      }
    }
    setOpen(false)
  }

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${scrolled ? 'bg-background/80 backdrop-blur-md border-b border-border shadow-float' : 'bg-transparent'}
      `}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

        {/* ── Brand ──────────────────────────────────────────────────────── */}
        <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <Zap className="h-5 w-5 text-accent" />
          <span className="gradient-text">{import.meta.env.VITE_APP_NAME ?? 'AppTemplate'}</span>
        </Link>

        {/* ── Desktop nav ────────────────────────────────────────────────── */}
        <ul className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(item => (
            <li key={item.label}>
              <button
                onClick={() => handleNavClick(item)}
                className="px-3 py-1.5 text-sm text-muted rounded hover:text-foreground hover:bg-surface-2 transition-colors"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        {/* ── Auth actions ────────────────────────────────────────────────── */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                to="/account"
                className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
              >
                <User className="h-4 w-4" />
                {user.name}
              </Link>
              <Button variant="ghost" size="sm" onClick={logout} leftIcon={<LogOut className="h-4 w-4" />}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
              <Button size="sm" onClick={() => navigate('/register')}>
                Get started
              </Button>
            </>
          )}
        </div>

        {/* ── Mobile hamburger ───────────────────────────────────────────── */}
        <button
          className="md:hidden p-2 text-muted hover:text-foreground transition-colors"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* ── Mobile menu ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{   opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-border bg-background/95 backdrop-blur-md"
          >
            <ul className="flex flex-col gap-1 px-6 py-4">
              {NAV_ITEMS.map(item => (
                <li key={item.label}>
                  <button
                    onClick={() => handleNavClick(item)}
                    className="w-full text-left px-3 py-2.5 text-sm text-muted rounded hover:text-foreground hover:bg-surface-2 transition-colors"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
              <li className="mt-2 pt-2 border-t border-border flex gap-3">
                {user ? (
                  <>
                    <Link to="/dashboard" className="flex-1">
                      <Button variant="secondary" size="sm" className="w-full" leftIcon={<LayoutDashboard className="h-4 w-4" />}>
                        Dashboard
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={logout} leftIcon={<LogOut className="h-4 w-4" />}>
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login"    className="flex-1"><Button variant="secondary" size="sm" className="w-full">Sign in</Button></Link>
                    <Link to="/register" className="flex-1"><Button size="sm" className="w-full">Get started</Button></Link>
                  </>
                )}
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
