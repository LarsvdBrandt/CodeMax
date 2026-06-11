// ─────────────────────────────────────────────────────────────────────────────
// ComponentShowcase — live component library browser.
// Route: /codemax/components
//
// Every component in the UI library is previewed here with live, interactive
// demos using the current theme. This page is for developers/AI agents to
// browse what's available and how each component looks and behaves.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import {
  Home, Settings, Users, FileText, BarChart2, Bell,
  Star, Rocket, Zap, CheckCircle, AlertCircle,
  Mail, Github, Globe, Terminal, Code2, Filter,
  GitBranch,
} from 'lucide-react'

// All UI components
import { Button }          from '@/components/ui/Button'
import { Input }           from '@/components/ui/Input'
import { Select }          from '@/components/ui/Select'
import { Checkbox }        from '@/components/ui/Checkbox'
import { Switch }          from '@/components/ui/Switch'
import { Card }            from '@/components/ui/Card'
import { Badge }           from '@/components/ui/Badge'
import { Avatar, AvatarGroup } from '@/components/ui/Avatar'
import { Alert }           from '@/components/ui/Alert'
import { Skeleton }        from '@/components/ui/Skeleton'
import { Spinner }         from '@/components/ui/Spinner'
import { Tooltip }         from '@/components/ui/Tooltip'
import { Divider }         from '@/components/ui/Divider'
import { ProgressBar }     from '@/components/ui/ProgressBar'
import { StatCard }        from '@/components/ui/StatCard'
import { PricingCard }     from '@/components/ui/PricingCard'
import { EmptyState }      from '@/components/ui/EmptyState'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/Accordion'
import { Modal }           from '@/components/ui/Modal'
import { useToast }        from '@/components/ui/Toast'
import { Pagination }      from '@/components/ui/Pagination'
import { Table }           from '@/components/ui/Table'
import { ImageCard }       from '@/components/ui/ImageCard'
import { KanbanBoard }     from '@/components/ui/KanbanBoard'
import { Breadcrumb }      from '@/components/ui/Breadcrumb'
import { Stepper }         from '@/components/ui/Stepper'
import { Timeline }        from '@/components/ui/Timeline'
import { ActivityFeed }    from '@/components/ui/ActivityFeed'
import { UserCard }        from '@/components/ui/UserCard'
import { TagInput }        from '@/components/ui/TagInput'
import { MultiSelect }     from '@/components/ui/MultiSelect'
import { Slider }          from '@/components/ui/Slider'
import { FileUpload }      from '@/components/ui/FileUpload'
import { SearchInput }     from '@/components/ui/SearchInput'
import { ConfirmDialog }   from '@/components/ui/ConfirmDialog'
import { CommandPalette, useCommandPalette } from '@/components/ui/CommandPalette'
import { SideNav }         from '@/components/ui/SideNav'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { BarChart }        from '@/components/ui/BarChart'
import { DonutChart }      from '@/components/ui/DonutChart'
import { CodeBlock }       from '@/components/ui/CodeBlock'
import { CopyButton }      from '@/components/ui/CopyButton'
import { DatePicker }      from '@/components/ui/DatePicker'
import type { KanbanColumn } from '@/components/ui/KanbanBoard'
import type { Column }     from '@/components/ui/Table'

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ id, title, description, children }: {
  id: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      <div className="space-y-8">{children}</div>
    </section>
  )
}

function Demo({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
      </div>
      <div className="rounded-xl border border-border bg-surface p-6">
        {children}
      </div>
    </div>
  )
}

// ── Sidebar categories ────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'forms',      label: 'Forms & Input',       icon: <FileText className="h-4 w-4" /> },
  { id: 'layout',     label: 'Layout & Structure',  icon: <BarChart2 className="h-4 w-4" /> },
  { id: 'display',    label: 'Data Display',        icon: <Star className="h-4 w-4" /> },
  { id: 'feedback',   label: 'Feedback & Overlays', icon: <Bell className="h-4 w-4" /> },
  { id: 'navigation', label: 'Navigation',          icon: <Globe className="h-4 w-4" /> },
  { id: 'dataviz',    label: 'Data Visualization',  icon: <BarChart2 className="h-4 w-4" /> },
  { id: 'productivity', label: 'Productivity',      icon: <GitBranch className="h-4 w-4" /> },
]

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ComponentShowcase() {
  // Forms state
  const [inputVal,     setInputVal]     = useState('')
  const [selectVal,    setSelectVal]    = useState('')
  const [checked,      setChecked]      = useState(false)
  const [toggled,      setToggled]      = useState(true)
  const [tags,         setTags]         = useState(['react', 'typescript'])
  const [multiVal,     setMultiVal]     = useState<string[]>(['react'])
  const [sliderVal,    setSliderVal]    = useState(60)
  const [dateVal,      setDateVal]      = useState<Date | null>(null)

  // Feedback state
  const [modalOpen,    setModalOpen]    = useState(false)
  const [confirmOpen,  setConfirmOpen]  = useState(false)
  const { toast }                       = useToast()
  const [page,         setPage]         = useState(1)

  // Stepper
  const [step, setStep] = useState(1)

  // Kanban
  const [kanbanCols, setKanbanCols] = useState<KanbanColumn[]>([
    {
      id: 'backlog', label: 'Backlog', color: '#6b7280',
      cards: [
        { id: 'c1', columnId: 'backlog', title: 'Set up CI pipeline', description: 'GitHub Actions + Docker', priority: 'medium', tags: ['devops'] },
        { id: 'c2', columnId: 'backlog', title: 'Write unit tests', priority: 'low', tags: ['testing'] },
      ],
    },
    {
      id: 'inprog', label: 'In Progress', color: 'rgb(var(--color-accent))', limit: 3,
      cards: [
        { id: 'c3', columnId: 'inprog', title: 'Design system tokens', description: 'CSS variables & Tailwind config', priority: 'high', assignee: { name: 'Alex Kim' }, dueDate: new Date(Date.now() - 86400000).toISOString() },
        { id: 'c4', columnId: 'inprog', title: 'Auth flow', priority: 'urgent', tags: ['auth', 'backend'] },
      ],
    },
    {
      id: 'review', label: 'In Review', color: 'rgb(var(--color-warning))',
      cards: [
        { id: 'c5', columnId: 'review', title: 'Kanban component', priority: 'high', assignee: { name: 'Sam Chen' } },
      ],
    },
    {
      id: 'done', label: 'Done', color: 'rgb(var(--color-success))',
      cards: [
        { id: 'c6', columnId: 'done', title: 'Initial project scaffold', priority: 'medium' },
        { id: 'c7', columnId: 'done', title: 'MongoDB schema design', priority: 'low' },
      ],
    },
  ])

  // Notifications
  const [notifications, setNotifications] = useState([
    { id: 'n1', title: 'Build succeeded', body: 'main branch deployed to production', time: '2 min ago', read: false, variant: 'success' as const },
    { id: 'n2', title: 'New comment on Issue #42', body: 'Alex Kim: "Looks good to merge!"', time: '15 min ago', read: false, variant: 'info' as const },
    { id: 'n3', title: 'Memory usage high', body: 'Server at 87% — consider scaling', time: '1h ago', read: true, variant: 'warning' as const },
  ])

  // CommandPalette
  const [cmdOpen, setCmdOpen] = useCommandPalette()
  const commands = [
    { id: '1', label: 'Go to Dashboard',  group: 'Navigate', icon: <Home className="h-4 w-4" />, shortcut: '⌘D', onSelect: () => {} },
    { id: '2', label: 'Open Settings',    group: 'Navigate', icon: <Settings className="h-4 w-4" />, onSelect: () => {} },
    { id: '3', label: 'Create new todo',  group: 'Actions',  icon: <CheckCircle className="h-4 w-4" />, onSelect: () => toast.success('Created!') },
    { id: '4', label: 'Toggle dark mode', group: 'Actions',  icon: <Zap className="h-4 w-4" />, onSelect: () => toast.info('Theme toggled') },
    { id: '5', label: 'View components',  group: 'Navigate', icon: <Code2 className="h-4 w-4" />, onSelect: () => {} },
  ]

  // Table data
  interface Person { name: string; role: string; status: string; joined: string }
  const tableData: Person[] = [
    { name: 'Alex Kim',    role: 'Frontend',  status: 'Active',   joined: '2024-01' },
    { name: 'Sam Chen',    role: 'Backend',   status: 'Active',   joined: '2024-03' },
    { name: 'Jamie Park',  role: 'Design',    status: 'On leave', joined: '2023-11' },
    { name: 'Taylor Moss', role: 'DevOps',    status: 'Active',   joined: '2024-05' },
  ]
  const tableCols: Column<Person>[] = [
    { key: 'name',   header: 'Name',   render: (_, row) => <span className="font-medium">{row.name}</span> },
    { key: 'role',   header: 'Role'  },
    { key: 'status', header: 'Status', render: (_, row) => <Badge variant={row.status === 'Active' ? 'success' : 'warning'} size="sm">{row.status}</Badge> },
    { key: 'joined', header: 'Joined' },
  ]

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Sticky sidebar ────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-52 flex-shrink-0 border-r border-border sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted">Categories</p>
        <nav className="flex flex-col gap-0.5">
          {CATEGORIES.map(c => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
            >
              {c.icon}
              {c.label}
            </a>
          ))}
        </nav>
        <Divider className="my-4" />
        <a
          href="#"
          onClick={() => setCmdOpen(true)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
        >
          <Terminal className="h-4 w-4" />
          ⌘K Palette
        </a>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border px-8 py-8 bg-surface">
          <Breadcrumb items={[{ label: 'CodeMax' }, { label: 'Components' }]} />
          <h1 className="mt-4 text-3xl font-bold text-foreground gradient-text">Component Library</h1>
          <p className="mt-2 text-muted">
            All {44} components — interactive demos, all using the current theme. Change <code className="text-accent text-xs bg-accent/10 px-1.5 py-0.5 rounded">src/config/theme.ts</code> to retheme everything at once.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {CATEGORIES.map(c => (
              <a key={c.id} href={`#${c.id}`}>
                <Badge variant="default" size="sm">{c.label}</Badge>
              </a>
            ))}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-8 py-12 space-y-20">

          {/* ═══════════════════════════════════════════════════════════════
              FORMS & INPUT
          ═══════════════════════════════════════════════════════════════ */}
          <Section id="forms" title="Forms & Input" description="All input primitives. All support label, error, disabled, and match the global theme.">

            <Demo title="Button" description="All variants and sizes.">
              <div className="flex flex-wrap gap-3">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
                <Button size="sm">Small</Button>
                <Button size="lg">Large</Button>
                <Button isLoading>Loading</Button>
                <Button disabled>Disabled</Button>
                <Button leftIcon={<Rocket className="h-4 w-4" />}>With icon</Button>
              </div>
            </Demo>

            <Demo title="Input" description="Text field with label, placeholder, icon and error state.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Name" placeholder="John Doe" value={inputVal} onChange={e => setInputVal(e.target.value)} />
                <Input label="Email" placeholder="you@example.com" icon={<Mail className="h-4 w-4" />} />
                <Input label="With error" placeholder="…" error="This field is required" />
                <Input label="Disabled" placeholder="Can't type here" disabled />
              </div>
            </Demo>

            <Demo title="Select" description="Native select with label and error.">
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <Select
                  label="Role"
                  value={selectVal}
                  onChange={e => setSelectVal(e.target.value)}
                  options={[{value:'admin',label:'Admin'},{value:'user',label:'User'},{value:'guest',label:'Guest'}]}
                  placeholder="Pick a role"
                />
                <Select label="Disabled" disabled options={[{value:'x',label:'Locked'}]} />
              </div>
            </Demo>

            <Demo title="Checkbox & Switch" description="Controlled boolean inputs.">
              <div className="flex flex-wrap gap-8">
                <Checkbox label="I agree to the terms" checked={checked} onChange={e => setChecked(e.target.checked)} />
                <Checkbox label="Disabled unchecked" checked={false} onChange={() => {}} disabled />
                <Checkbox label="Disabled checked"   checked={true}  onChange={() => {}} disabled />
                <Divider orientation="vertical" className="h-6" />
                <Switch label="Enable notifications" checked={toggled} onChange={v => setToggled(v)} />
                <Switch label="Disabled off" checked={false} onChange={() => {}} disabled />
                <Switch label="Disabled on"  checked={true}  onChange={() => {}} disabled />
              </div>
            </Demo>

            <Demo title="TagInput" description="Type and press Enter or comma to add tags. Backspace removes last tag.">
              <div className="max-w-md">
                <TagInput value={tags} onChange={setTags} label="Skills" max={8} placeholder="Add skill…" />
              </div>
            </Demo>

            <Demo title="MultiSelect" description="Dropdown with checkboxes, selected values rendered as chips.">
              <div className="max-w-sm">
                <MultiSelect
                  label="Frameworks"
                  value={multiVal}
                  onChange={setMultiVal}
                  options={[
                    {value:'react',   label:'React',   icon:<Zap className="h-3.5 w-3.5"/>},
                    {value:'vue',     label:'Vue'},
                    {value:'svelte',  label:'Svelte'},
                    {value:'angular', label:'Angular'},
                    {value:'solid',   label:'SolidJS'},
                  ]}
                  placeholder="Select frameworks"
                />
              </div>
            </Demo>

            <Demo title="Slider" description="Range slider with live value display.">
              <div className="max-w-sm space-y-6">
                <Slider value={sliderVal} onChange={setSliderVal} label="Volume" showValue formatValue={v => `${v}%`} />
                <Slider value={30} onChange={() => {}} label="Disabled" showValue disabled />
              </div>
            </Demo>

            <Demo title="DatePicker" description="Click to open calendar. Clear with × button.">
              <div className="max-w-xs">
                <DatePicker value={dateVal} onChange={setDateVal} label="Due date" />
              </div>
            </Demo>

            <Demo title="FileUpload" description="Drag-and-drop or click-to-browse. Validates size, shows file list.">
              <div className="max-w-md">
                <FileUpload
                  onFiles={f => toast.success(`${f.length} file(s) selected`)}
                  multiple
                  label="Attachments"
                  hint="PNG, JPG, PDF up to 5 MB"
                  maxSize={5 * 1024 * 1024}
                />
              </div>
            </Demo>

            <Demo title="SearchInput" description="Debounced search with loading state and clear button.">
              <div className="max-w-sm">
                <SearchInput onSearch={q => console.log('search:', q)} placeholder="Search components…" debounce={300} />
              </div>
            </Demo>

            <Demo title="CopyButton" description="Click to copy text to clipboard. Shows checkmark feedback.">
              <div className="flex items-center gap-3 flex-wrap">
                <CopyButton value="npm install @/components/ui" label="Copy command" />
                <code className="text-xs text-muted bg-surface-2 px-3 py-1.5 rounded">npm install @/components/ui</code>
              </div>
            </Demo>

          </Section>

          {/* ═══════════════════════════════════════════════════════════════
              LAYOUT & STRUCTURE
          ═══════════════════════════════════════════════════════════════ */}
          <Section id="layout" title="Layout & Structure" description="Container and organisation primitives.">

            <Demo title="Card" description="Surface container with optional padding.">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-5"><p className="text-sm text-foreground font-medium">Default card</p><p className="text-xs text-muted mt-1">Surface background with border</p></Card>
                <Card className="p-5 glass"><p className="text-sm text-foreground font-medium">Glass card</p><p className="text-xs text-muted mt-1">Add className="glass"</p></Card>
                <Card className="p-5 border-accent/40"><p className="text-sm text-foreground font-medium">Accent border</p><p className="text-xs text-muted mt-1">Override border colour</p></Card>
              </div>
            </Demo>

            <Demo title="Tabs" description="Controlled or uncontrolled tab panel.">
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                <TabsContent value="overview"><p className="text-sm text-muted p-4">Overview content goes here.</p></TabsContent>
                <TabsContent value="analytics"><p className="text-sm text-muted p-4">Analytics charts go here.</p></TabsContent>
                <TabsContent value="settings"><p className="text-sm text-muted p-4">Settings form goes here.</p></TabsContent>
              </Tabs>
            </Demo>

            <Demo title="Accordion" description="Collapsible sections, supports single or multiple open.">
              <Accordion type="single" defaultValue="item-1">
                <AccordionItem value="item-1">
                  <AccordionTrigger>What is this template?</AccordionTrigger>
                  <AccordionContent>A full-stack Vite + React + Express + MongoDB application template with OAuth, email, Docker, and a complete UI component library.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>How do I change the accent colour?</AccordionTrigger>
                  <AccordionContent>Edit <code className="text-accent text-xs bg-accent/10 px-1.5 py-0.5 rounded">src/config/theme.ts</code> and change the <code className="text-accent text-xs bg-accent/10 px-1.5 py-0.5 rounded">accent</code> RGB triple.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>Can multiple sections be open?</AccordionTrigger>
                  <AccordionContent>Set <code className="text-accent text-xs bg-accent/10 px-1.5 py-0.5 rounded">type="multiple"</code> on the Accordion.</AccordionContent>
                </AccordionItem>
              </Accordion>
            </Demo>

            <Demo title="Modal" description="Dialog with Portal, Escape and backdrop close. Sub-components: Modal.Body, Modal.Footer.">
              <div className="flex gap-3">
                <Button onClick={() => setModalOpen(true)}>Open modal</Button>
                <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Example modal">
                  <Modal.Body>
                    <p className="text-sm text-muted">This is the modal body. Put forms, details, or any content here.</p>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                    <Button onClick={() => { setModalOpen(false); toast.success('Saved!') }}>Save changes</Button>
                  </Modal.Footer>
                </Modal>
              </div>
            </Demo>

            <Demo title="Divider" description="Horizontal and vertical separators, with optional label.">
              <div className="space-y-6">
                <Divider />
                <Divider label="or continue with" />
                <div className="flex items-center gap-4 h-10">
                  <span className="text-sm text-muted">Left</span>
                  <Divider orientation="vertical" className="h-full" />
                  <span className="text-sm text-muted">Right</span>
                </div>
              </div>
            </Demo>

          </Section>

          {/* ═══════════════════════════════════════════════════════════════
              DATA DISPLAY
          ═══════════════════════════════════════════════════════════════ */}
          <Section id="display" title="Data Display" description="Components for presenting information.">

            <Demo title="Badge" description="Status pills with variants and optional dot indicator.">
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="error">Error</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="success" dot>Online</Badge>
                <Badge size="sm" variant="info">Small</Badge>
              </div>
            </Demo>

            <Demo title="Avatar & AvatarGroup" description="User avatars with initials fallback, stacked groups.">
              <div className="flex flex-wrap items-center gap-8">
                <Avatar name="Alex Kim" size="sm" />
                <Avatar name="Sam Chen" size="md" />
                <Avatar name="Jamie Park" size="lg" />
                <Avatar src="https://i.pravatar.cc/100?img=3" name="Taylor" size="xl" />
                <Divider orientation="vertical" className="h-12" />
                <AvatarGroup
                  users={[
                    { name: 'Alex Kim' },
                    { name: 'Sam Chen' },
                    { name: 'Jamie Park' },
                    { name: 'Taylor Moss' },
                    { name: 'Robin Lee' },
                  ]}
                  max={3}
                />
              </div>
            </Demo>

            <Demo title="StatCard" description="KPI card with icon, value, trend indicator.">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard icon={<Users className="h-5 w-5" />}   value="1 248"  label="Users"    trend={{ value: 12, direction: 'up' }} />
                <StatCard icon={<Star className="h-5 w-5" />}    value="4.9"    label="Rating"   trend={{ value: 3, direction: 'up' }} />
                <StatCard icon={<Rocket className="h-5 w-5" />}  value="98.2%"  label="Uptime"   trend={{ value: 0.1, direction: 'down' }} />
                <StatCard icon={<Zap className="h-5 w-5" />}     value="42 ms"  label="Latency"  trend={{ value: 5, direction: 'down' }} />
              </div>
            </Demo>

            <Demo title="Table" description="Generic typed table with sortable columns and custom renderers.">
              <Table<Person> columns={tableCols} data={tableData} striped />
            </Demo>

            <Demo title="ImageCard" description="Image with caption and hover overlay.">
              <div className="grid grid-cols-3 gap-4 max-w-lg">
                {['4', '5', '6'].map(i => (
                  <ImageCard
                    key={i}
                    src={`https://picsum.photos/seed/${i}/400/300`}
                    alt={`Photo ${i}`}
                    caption={`Photo #${i}`}
                    aspectRatio="video"
                  />
                ))}
              </div>
            </Demo>

            <Demo title="Timeline" description="Chronological event list with variant colours.">
              <Timeline items={[
                { id:'1', title:'Project created',   time:'Today',    variant:'success', icon:<CheckCircle className="h-4 w-4"/>, description:'Repository initialised and pushed to GitHub.' },
                { id:'2', title:'Auth implemented',  time:'Yesterday',variant:'info',    icon:<Zap className="h-4 w-4"/>,          description:'Local + Google + GitHub OAuth all working.' },
                { id:'3', title:'Bug reported',      time:'2d ago',   variant:'error',   icon:<AlertCircle className="h-4 w-4"/>, description:'Pagination offset by one — assigned to Alex.' },
                { id:'4', title:'PR opened',         time:'3d ago',   variant:'warning', icon:<GitBranch className="h-4 w-4"/>  },
              ]} />
            </Demo>

            <Demo title="ActivityFeed" description="Compact activity stream like GitHub or Jira history.">
              <ActivityFeed items={[
                { id:'1', actor:{name:'Alex Kim'},  action:'commented on', target:'Issue #12', time:'5 min ago', extra:'Looks good, just fix the types.' },
                { id:'2', actor:{name:'Sam Chen'},  action:'merged',       target:'PR #8',     time:'1h ago'   },
                { id:'3', actor:{name:'Jamie Park'},action:'created',      target:'Milestone "v1.0"', time:'3h ago', icon:<Star className="h-3.5 w-3.5"/> },
              ]} />
            </Demo>

            <Demo title="UserCard" description="Compact and full variants for user profiles.">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <UserCard
                  variant="compact"
                  user={{ name:'Alex Kim', role:'Frontend Engineer', online: true }}
                  actions={[{ label:'Message', onClick: () => toast.info('DM opened') }]}
                />
                <UserCard
                  variant="full"
                  user={{
                    name: 'Sam Chen',
                    role: 'Backend Lead',
                    bio: 'Loves clean APIs and type safety. Building things that scale.',
                    location: 'Amsterdam, NL',
                    tags: ['Node.js','MongoDB','TypeScript'],
                    online: true,
                  }}
                  actions={[
                    { label: 'Follow',   onClick: () => toast.success('Following!'), variant: 'primary' },
                    { label: 'Message',  onClick: () => {},  variant: 'secondary' },
                  ]}
                  className="max-w-xs"
                />
              </div>
            </Demo>

            <Demo title="Skeleton" description="Loading placeholder animations.">
              <div className="flex flex-wrap gap-6 items-start">
                <div className="flex items-center gap-3">
                  <Skeleton variant="circle" className="h-10 w-10" />
                  <div className="flex flex-col gap-2">
                    <Skeleton variant="text" className="h-3 w-24" />
                    <Skeleton variant="text" className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton variant="rect" className="h-24 w-48 rounded-lg" />
                <div className="flex flex-col gap-2 flex-1 min-w-48">
                  <Skeleton variant="text" className="h-4 w-3/4" />
                  <Skeleton variant="text" className="h-4 w-full" />
                  <Skeleton variant="text" className="h-4 w-2/3" />
                </div>
              </div>
            </Demo>

            <Demo title="ProgressBar" description="Animated progress with label and percentage.">
              <div className="space-y-4 max-w-md">
                <ProgressBar value={75}  max={100} label="Storage"   color="accent"   showPercentage />
                <ProgressBar value={42}  max={100} label="CPU"       color="warning"  showPercentage />
                <ProgressBar value={95}  max={100} label="Memory"    color="error"    showPercentage />
                <ProgressBar value={100} max={100} label="Completed" color="success"  showPercentage />
              </div>
            </Demo>

            <Demo title="PricingCard" description="Plan cards with feature lists and highlighted variant.">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <PricingCard
                  name="Free"   price="$0"   period="/mo"
                  features={['5 projects','1 user','Community support']}
                  cta={{ label:'Get started', onClick: () => {} }}
                />
                <PricingCard
                  name="Pro"    price="$19"  period="/mo"
                  features={['Unlimited projects','5 users','Priority support','Custom domain']}
                  cta={{ label:'Upgrade to Pro', onClick: () => {} }}
                  highlighted
                />
                <PricingCard
                  name="Team"   price="$49"  period="/mo"
                  features={['Unlimited projects','Unlimited users','SLA support','SSO & audit logs']}
                  cta={{ label:'Contact sales', onClick: () => {} }}
                />
              </div>
            </Demo>

            <Demo title="EmptyState" description="Zero-data placeholder with optional call to action.">
              <EmptyState
                icon={<Filter className="h-6 w-6" />}
                title="No results found"
                description="Try adjusting your filters or search query."
                action={{ label: 'Clear filters', onClick: () => {} }}
              />
            </Demo>

            <Demo title="CodeBlock" description="Display code with copy, line numbers and filename.">
              <CodeBlock
                filename="server/src/utils/jwt.ts"
                language="typescript"
                showLines
                code={`import jwt from 'jsonwebtoken'
import { env } from '@/config/env'

export function signToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  })
}

export function verifyToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET)
}`}
              />
            </Demo>

          </Section>

          {/* ═══════════════════════════════════════════════════════════════
              FEEDBACK & OVERLAYS
          ═══════════════════════════════════════════════════════════════ */}
          <Section id="feedback" title="Feedback & Overlays" description="Communicate status, errors, and require user decisions.">

            <Demo title="Toast" description="Non-blocking notifications. Trigger via useToast hook.">
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => toast.success('Saved successfully!')} variant="secondary" size="sm">Success</Button>
                <Button onClick={() => toast.error('Something went wrong.')} variant="secondary" size="sm">Error</Button>
                <Button onClick={() => toast.warning('You are almost out of storage.')} variant="secondary" size="sm">Warning</Button>
                <Button onClick={() => toast.info('New version available.')} variant="secondary" size="sm">Info</Button>
              </div>
            </Demo>

            <Demo title="Alert" description="Inline status messages. Add onDismiss to make them dismissable.">
              <div className="space-y-3">
                <Alert variant="success" title="Deployment successful" description="Your app is live at production." />
                <Alert variant="warning" title="Approaching limit" description="You have used 90% of your storage quota." />
                <Alert variant="error"   title="Build failed" description="TypeScript error in src/pages/Dashboard.tsx:42." onDismiss={() => {}} />
                <Alert variant="info"    title="Maintenance window" description="Scheduled downtime Sunday 02:00–04:00 UTC." />
              </div>
            </Demo>

            <Demo title="ConfirmDialog" description="Destructive action confirmation. Use before deletes.">
              <div className="flex gap-3">
                <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>Delete item</Button>
                <ConfirmDialog
                  isOpen={confirmOpen}
                  onCancel={() => setConfirmOpen(false)}
                  onConfirm={() => { setConfirmOpen(false); toast.success('Deleted!') }}
                  title="Delete this item?"
                  description="This action is permanent and cannot be undone."
                  confirmLabel="Yes, delete"
                  variant="danger"
                />
              </div>
            </Demo>

            <Demo title="Tooltip" description="Hover or focus to reveal contextual hints.">
              <div className="flex flex-wrap gap-6 items-center">
                <Tooltip content="Trigger a rocket launch 🚀"><Button size="sm" leftIcon={<Rocket className="h-4 w-4" />}>Hover me</Button></Tooltip>
                <Tooltip content="This field is required" position="right"><Badge variant="error">!</Badge></Tooltip>
                <Tooltip content="GitHub repository" position="bottom"><Button variant="ghost" size="sm"><Github className="h-4 w-4" /></Button></Tooltip>
              </div>
            </Demo>

            <Demo title="Spinner" description="Loading indicator in multiple sizes and colours.">
              <div className="flex flex-wrap items-center gap-8">
                <Spinner size="sm" />
                <Spinner size="md" />
                <Spinner size="lg" />
                <Spinner size="md" color="accent" />
                <Spinner size="md" color="muted" />
                <div className="flex items-center gap-2">
                  <Spinner size="sm" />
                  <span className="text-sm text-muted">Processing…</span>
                </div>
              </div>
            </Demo>

          </Section>

          {/* ═══════════════════════════════════════════════════════════════
              NAVIGATION
          ═══════════════════════════════════════════════════════════════ */}
          <Section id="navigation" title="Navigation" description="Move users around the app.">

            <Demo title="Breadcrumb" description="Hierarchical location indicator.">
              <div className="space-y-3">
                <Breadcrumb items={[{ label:'Dashboard' }]} />
                <Breadcrumb items={[{ label:'Projects' }, { label:'CodeMax Template' }]} />
                <Breadcrumb items={[{ label:'Settings' }, { label:'Team' }, { label:'Permissions' }]} showHome={false} />
              </div>
            </Demo>

            <Demo title="Stepper" description="Multi-step wizard indicator. Click steps to jump.">
              <div className="space-y-6">
                <Stepper
                  current={step}
                  onChange={setStep}
                  steps={[
                    { label:'Account',    description:'Create your account'  },
                    { label:'Profile',    description:'Fill in details'      },
                    { label:'Plan',       description:'Choose a plan'        },
                    { label:'Confirm',    description:'Review and submit'    },
                  ]}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>Prev</Button>
                  <Button size="sm"                     onClick={() => setStep(s => Math.min(3, s + 1))} disabled={step === 3}>Next</Button>
                </div>
              </div>
            </Demo>

            <Demo title="Pagination" description="Page navigator with automatic ellipsis.">
              <Pagination currentPage={page} totalPages={12} onPageChange={setPage} />
            </Demo>

            <Demo title="SideNav" description="Collapsible sidebar. Used in dashboard/app shells.">
              <div className="h-64 overflow-hidden rounded-xl border border-border flex">
                <SideNav
                  items={[
                    { id:'dash',    label:'Dashboard', href:'/dashboard', icon:<Home className="h-4 w-4"/>    },
                    { id:'users',   label:'Users',     href:'#',          icon:<Users className="h-4 w-4"/>,  badge: 3 },
                    { id:'reports', label:'Reports',   href:'#',          icon:<BarChart2 className="h-4 w-4"/> },
                    { id:'settings',label:'Settings',  href:'#',          icon:<Settings className="h-4 w-4"/> },
                  ]}
                />
                <div className="flex-1 p-6 flex items-center justify-center bg-background">
                  <p className="text-sm text-muted">App content area</p>
                </div>
              </div>
            </Demo>

            <Demo title="CommandPalette" description="⌘K spotlight-style command search. Keyboard driven.">
              <div className="flex items-center gap-3">
                <Button onClick={() => setCmdOpen(true)} leftIcon={<Terminal className="h-4 w-4" />} variant="secondary">
                  Open palette
                </Button>
                <Badge size="sm">or press ⌘K</Badge>
                <CommandPalette commands={commands} isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
              </div>
            </Demo>

            <Demo title="NotificationBell" description="Bell icon with unread count and dropdown list.">
              <div className="flex items-center gap-4">
                <NotificationBell
                  notifications={notifications}
                  onRead={id => setNotifications(ns => ns.map(n => n.id === id ? {...n, read: true} : n))}
                  onDismiss={id => setNotifications(ns => ns.filter(n => n.id !== id))}
                />
                <span className="text-sm text-muted">Click the bell →</span>
              </div>
            </Demo>

          </Section>

          {/* ═══════════════════════════════════════════════════════════════
              DATA VISUALIZATION
          ═══════════════════════════════════════════════════════════════ */}
          <Section id="dataviz" title="Data Visualization" description="Pure CSS and SVG charts. No external charting library.">

            <Demo title="BarChart — Vertical" description="Vertical bars with optional value labels.">
              <BarChart
                data={[
                  { label:'Mon', value:32 },
                  { label:'Tue', value:58 },
                  { label:'Wed', value:47 },
                  { label:'Thu', value:73 },
                  { label:'Fri', value:61 },
                  { label:'Sat', value:24 },
                  { label:'Sun', value:18 },
                ]}
                orientation="vertical"
                height={160}
                label="Daily active users"
              />
            </Demo>

            <Demo title="BarChart — Horizontal" description="Horizontal bars, great for leaderboards and rankings.">
              <BarChart
                data={[
                  { label:'TypeScript', value:85  },
                  { label:'React',      value:78  },
                  { label:'Node.js',    value:62  },
                  { label:'MongoDB',    value:54  },
                  { label:'Docker',     value:41  },
                ]}
                orientation="horizontal"
                label="Tech stack adoption %"
              />
            </Demo>

            <Demo title="DonutChart" description="SVG donut chart with legend. Adjust thickness prop.">
              <div className="flex flex-wrap gap-12 items-center justify-center">
                <DonutChart
                  data={[
                    { label:'React',      value:60 },
                    { label:'Vue',        value:25 },
                    { label:'Angular',    value:10 },
                    { label:'Other',      value:5  },
                  ]}
                  centerLabel="Framework"
                  centerValue="4"
                />
                <DonutChart
                  data={[
                    { label:'Done',       value:18 },
                    { label:'In Progress',value:7  },
                    { label:'Blocked',    value:3  },
                    { label:'Backlog',    value:22 },
                  ]}
                  thickness={0.3}
                  centerLabel="Tasks"
                  centerValue="50"
                />
              </div>
            </Demo>

          </Section>

          {/* ═══════════════════════════════════════════════════════════════
              PRODUCTIVITY
          ═══════════════════════════════════════════════════════════════ */}
          <Section id="productivity" title="Productivity" description="Building blocks for task, project, and workflow management.">

            <Demo
              title="KanbanBoard"
              description="Drag cards between columns. Supports WIP limits, priority badges, assignees, due dates, tags."
            >
              <div className="overflow-x-auto -mx-2 px-2">
                <KanbanBoard
                  columns={kanbanCols}
                  onChange={setKanbanCols}
                  onCardClick={card => toast.info(`Opened: ${card.title}`)}
                  onCreateCard={colId => toast.info(`Create card in "${colId}"`)}
                />
              </div>
            </Demo>

          </Section>

          {/* Footer */}
          <div className="border-t border-border pt-8 pb-16 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">44 components · {CATEGORIES.length} categories</p>
            <p className="text-xs text-muted">All theming is controlled by <code className="text-accent bg-accent/10 px-1.5 py-0.5 rounded">src/config/theme.ts</code></p>
            <p className="text-xs text-muted">Docs: <code className="text-accent bg-accent/10 px-1.5 py-0.5 rounded">COMPONENTS.md</code> · <code className="text-accent bg-accent/10 px-1.5 py-0.5 rounded">AI_CONTEXT.md</code></p>
          </div>

        </div>
      </main>
    </div>
  )
}
