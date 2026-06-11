// ─────────────────────────────────────────────────────────────────────────────
// UI Component barrel export
// Import any component from '@/components/ui' without specifying the file:
//   import { Button, Modal, useToast, KanbanBoard } from '@/components/ui'
// ─────────────────────────────────────────────────────────────────────────────

// ── Forms & Input ─────────────────────────────────────────────────────────────
export { Button }                                          from './Button'
export { Input }                                           from './Input'
export { Select }                                          from './Select'
export { Checkbox }                                        from './Checkbox'
export { Switch }                                          from './Switch'
export { TagInput }                                        from './TagInput'
export { MultiSelect }                                     from './MultiSelect'
export { Slider }                                          from './Slider'
export { FileUpload }                                      from './FileUpload'
export { SearchInput }                                     from './SearchInput'
export { DatePicker }                                      from './DatePicker'
export { CopyButton }                                      from './CopyButton'

// ── Layout & Structure ────────────────────────────────────────────────────────
export { Card }                                            from './Card'
export { Modal }                                           from './Modal'
export { Divider }                                         from './Divider'
export { Tabs, TabsList, TabsTrigger, TabsContent }        from './Tabs'
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './Accordion'

// ── Data Display ──────────────────────────────────────────────────────────────
export { Badge }                                           from './Badge'
export { Avatar, AvatarGroup }                             from './Avatar'
export { Skeleton }                                        from './Skeleton'
export { Table }                                           from './Table'
export type { Column }                                     from './Table'
export { ImageCard }                                       from './ImageCard'
export { StatCard }                                        from './StatCard'
export { PricingCard }                                     from './PricingCard'
export { Timeline }                                        from './Timeline'
export { ActivityFeed }                                    from './ActivityFeed'
export { UserCard }                                        from './UserCard'
export { CodeBlock }                                       from './CodeBlock'

// ── Feedback & Overlays ───────────────────────────────────────────────────────
export { ToastProvider, useToast }                         from './Toast'
export { Alert }                                           from './Alert'
export { Tooltip }                                         from './Tooltip'
export { Spinner }                                         from './Spinner'
export { EmptyState }                                      from './EmptyState'
export { ProgressBar }                                     from './ProgressBar'
export { ConfirmDialog }                                   from './ConfirmDialog'

// ── Navigation ────────────────────────────────────────────────────────────────
export { Pagination }                                      from './Pagination'
export { Breadcrumb }                                      from './Breadcrumb'
export { Stepper }                                         from './Stepper'
export { SideNav }                                         from './SideNav'
export { CommandPalette, useCommandPalette }               from './CommandPalette'
export { NotificationBell }                                from './NotificationBell'

// ── Productivity ──────────────────────────────────────────────────────────────
export { KanbanBoard }                                     from './KanbanBoard'
export type { KanbanColumn, KanbanCard, KanbanPriority }   from './KanbanBoard'

// ── Data Visualization ────────────────────────────────────────────────────────
export { BarChart }                                        from './BarChart'
export { DonutChart }                                      from './DonutChart'
