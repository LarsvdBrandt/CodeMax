// Footer — three-column layout with links, social icons, and legal line.
// To add a column: push to FOOTER_LINKS below.

import { Link } from 'react-router-dom'
import { Github, Twitter, Linkedin, Zap } from 'lucide-react'
import { useScrollTo } from '@/hooks/useScrollTo'

// ── Footer links configuration ────────────────────────────────────────────────
const FOOTER_LINKS = [
  {
    heading: 'Product',
    items: [
      { label: 'Features', section: 'features' },
      { label: 'About',    section: 'about'    },
      { label: 'Contact',  section: 'contact'  },
    ],
  },
  {
    heading: 'Company',
    items: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
  },
  {
    heading: 'Auth',
    items: [
      { label: 'Sign in',    href: '/login'    },
      { label: 'Register',   href: '/register' },
    ],
  },
]

const SOCIAL = [
  { icon: Github,   href: 'https://github.com',   label: 'GitHub'   },
  { icon: Twitter,  href: 'https://twitter.com',  label: 'Twitter'  },
  { icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
]

export function Footer() {
  const scrollTo = useScrollTo()

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-16">

        {/* ── Top: brand + columns ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 font-bold text-lg">
              <Zap className="h-5 w-5 text-accent" />
              <span className="gradient-text">AppTemplate</span>
            </Link>
            <p className="mt-3 text-sm text-muted leading-relaxed max-w-xs">
              A production-ready starter kit. Replace this copy with your tagline.
            </p>
            {/* Social icons */}
            <div className="mt-5 flex gap-3">
              {SOCIAL.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="p-2 rounded text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_LINKS.map(col => (
            <div key={col.heading}>
              <h3 className="text-sm font-semibold text-foreground mb-4">{col.heading}</h3>
              <ul className="space-y-2.5">
                {col.items.map(item => (
                  <li key={item.label}>
                    {'section' in item ? (
                      <button
                        onClick={() => scrollTo(item.section)}
                        className="text-sm text-muted hover:text-foreground transition-colors"
                      >
                        {item.label}
                      </button>
                    ) : (
                      <Link
                        to={item.href}
                        className="text-sm text-muted hover:text-foreground transition-colors"
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom: copyright ─────────────────────────────────────────── */}
        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
          <p>© {new Date().getFullYear()} AppTemplate. All rights reserved.</p>
          <p>Built with React + Tailwind CSS</p>
        </div>
      </div>
    </footer>
  )
}
