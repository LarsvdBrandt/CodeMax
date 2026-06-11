// CATEGORY: Navigation
// SideNav — collapsible sidebar navigation for dashboards / app shells.
// <SideNav items={navItems} collapsed={collapsed} onCollapse={setCollapsed} />
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SideNavItem {
  id:        string
  label:     string
  href?:     string
  icon?:     React.ReactNode
  badge?:    string | number
  children?: SideNavItem[]
  onClick?:  () => void
}

export interface SideNavProps {
  items:       SideNavItem[]
  collapsed?:  boolean
  onCollapse?: (v: boolean) => void
  header?:     React.ReactNode
  footer?:     React.ReactNode
  className?:  string
}

function NavItem({ item, collapsed, depth = 0 }: { item: SideNavItem; collapsed: boolean; depth?: number }) {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const isActive = item.href ? location.pathname === item.href : false
  const hasChildren = !!item.children?.length

  const content = (
    <span className={cn(
      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors w-full',
      isActive  ? 'bg-accent text-white font-medium' : 'text-muted hover:text-foreground hover:bg-surface-2',
      depth > 0 && 'pl-9',
    )}>
      {item.icon && (
        <span className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-white' : 'text-muted')}>
          {item.icon}
        </span>
      )}
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', isActive ? 'bg-white/20 text-white' : 'bg-accent/15 text-accent')}>
              {item.badge}
            </span>
          )}
          {hasChildren && (
            <ChevronDown className={cn('h-3.5 w-3.5 flex-shrink-0 transition-transform', open && 'rotate-180')} />
          )}
        </>
      )}
    </span>
  )

  return (
    <li>
      {item.href && !hasChildren
        ? <Link to={item.href} className="block">{content}</Link>
        : (
          <button
            type="button"
            onClick={() => { item.onClick?.(); if (hasChildren) setOpen(o => !o) }}
            className="w-full text-left"
          >
            {content}
          </button>
        )
      }
      {hasChildren && open && !collapsed && (
        <ul className="mt-1 flex flex-col gap-0.5">
          {item.children!.map(child => <NavItem key={child.id} item={child} collapsed={collapsed} depth={depth + 1} />)}
        </ul>
      )}
    </li>
  )
}

export function SideNav({ items, collapsed = false, onCollapse, header, footer, className }: SideNavProps) {
  return (
    <aside className={cn(
      'flex flex-col border-r border-border bg-surface transition-all duration-200',
      collapsed ? 'w-16' : 'w-56',
      className,
    )}>
      {/* Header slot */}
      {header && <div className="p-3 border-b border-border">{header}</div>}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-0.5">
          {items.map(item => <NavItem key={item.id} item={item} collapsed={collapsed} />)}
        </ul>
      </nav>

      {/* Footer slot */}
      {footer && <div className="p-3 border-t border-border">{footer}</div>}

      {/* Collapse toggle */}
      {onCollapse && (
        <button
          onClick={() => onCollapse(!collapsed)}
          className="flex items-center justify-center border-t border-border p-3 text-muted hover:text-foreground transition-colors"
        >
          {collapsed
            ? <ChevronRight className="h-4 w-4" />
            : <><ChevronLeft className="h-4 w-4" />{!collapsed && <span className="ml-2 text-xs">Collapse</span>}</>
          }
        </button>
      )}
    </aside>
  )
}
