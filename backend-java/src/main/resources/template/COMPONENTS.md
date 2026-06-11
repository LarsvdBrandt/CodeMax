# Component Library Reference

> **For AI agents:** This file is the single authoritative reference for every component in this project.
> When a user asks you to use, modify, or compose components, read this file first — it tells you
> the exact file path, every prop, all variants, customisation hooks, and a usage example for each component.
> Never guess prop names; everything is listed here.
>
> **For humans:** Start here when building new pages. Copy the usage examples and swap the props.

---

## Theming System

All colours, radii, and shadows are defined in **one file**:

```
src/config/theme.ts   ← edit here
    ↓
src/styles/globals.css  ← injects as CSS custom properties (:root)
    ↓
tailwind.config.js    ← maps CSS vars to Tailwind colour names
```

**Tailwind colour names you can use anywhere:**
`bg-primary`, `bg-secondary`, `bg-accent`, `bg-surface`, `bg-surface-2`,
`bg-background`, `bg-border`, `bg-muted`, `bg-foreground`,
`text-*` (same names), `border-*` (same names).

All colours support opacity modifiers: `bg-accent/20`, `text-muted/50`.

**To change the accent colour** (e.g. to emerald):
```ts
// src/config/theme.ts
accent: '16 185 129',   // R G B triples — no commas
```

---

## Barrel Import

All UI components are re-exported from a single barrel. Use this import everywhere:

```ts
import { Button, Modal, useToast, Badge, ... } from '@/components/ui'
```

---

## UI Components (`src/components/ui/`)

---

### Button
**File:** `src/components/ui/Button.tsx`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | `primary \| secondary \| ghost \| danger` | `primary` | Visual style |
| size | `sm \| md \| lg` | `md` | Height and font size |
| isLoading | `boolean` | `false` | Shows spinner, disables button |
| leftIcon | `ReactNode` | — | Icon before label |
| rightIcon | `ReactNode` | — | Icon after label |
| ...HTMLButtonAttributes | — | — | All native button props |

**Variants:**
- `primary` — filled accent background, white text. Use for the main CTA.
- `secondary` — surface-2 background, border. Use for secondary actions.
- `ghost` — transparent, muted text. Use for tertiary / icon actions.
- `danger` — red-tinted background/border. Use for destructive actions.

**Customisation:** Change `accent` in `theme.ts` to restyle all primary buttons.

**Usage:**
```tsx
<Button variant="primary" size="lg" isLoading={saving} rightIcon={<ArrowRight />}>
  Save changes
</Button>
<Button variant="danger" onClick={handleDelete}>Delete</Button>
```

---

### Card
**File:** `src/components/ui/Card.tsx`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | required | Card content |
| hover | `boolean` | `false` | Adds lift + shadow on hover |
| glass | `boolean` | `false` | Glass-morphism style (blur backdrop) |
| className | `string` | — | Extra Tailwind classes |

**Sub-components:** `Card.Header`, `Card.Footer` — add a border-separated header or footer.

**Usage:**
```tsx
<Card hover>
  <Card.Header><h3>Title</h3></Card.Header>
  <p>Content</p>
  <Card.Footer><Button size="sm">Action</Button></Card.Footer>
</Card>
```

---

### Input
**File:** `src/components/ui/Input.tsx`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| label | `string` | — | Label above input |
| error | `string` | — | Red error message below |
| hint | `string` | — | Grey hint below (hidden when error shown) |
| icon | `ReactNode` | — | Leading icon inside input |
| ...HTMLInputAttributes | — | — | All native input props |

**Usage:**
```tsx
<Input label="Email" type="email" error={errors.email} icon={<Mail />}
  placeholder="you@example.com" {...register('email')} />
```

---

### Select
**File:** `src/components/ui/Select.tsx`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| options | `{value: string, label: string}[]` | required | Dropdown options |
| label | `string` | — | Label above |
| error | `string` | — | Error message |
| hint | `string` | — | Hint text |
| placeholder | `string` | — | Disabled first option |
| ...HTMLSelectAttributes | — | — | All native select props |

**Usage:**
```tsx
<Select label="Role" options={[{value:'admin',label:'Admin'},{value:'user',label:'User'}]}
  placeholder="Select role" {...register('role')} />
```

---

### Checkbox
**File:** `src/components/ui/Checkbox.tsx`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| label | `string` | — | Text beside checkbox |
| indeterminate | `boolean` | `false` | Shows a dash — for "select all" patterns |
| ...HTMLInputAttributes (minus type) | — | — | |

**Usage:**
```tsx
<Checkbox label="Accept terms" checked={accepted} onChange={e => setAccepted(e.target.checked)} />
<Checkbox indeterminate checked={someSelected} onChange={toggleAll} label="Select all" />
```

---

### Switch
**File:** `src/components/ui/Switch.tsx`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| checked | `boolean` | required | Controlled value |
| onChange | `(checked: boolean) => void` | required | Change handler |
| label | `string` | — | Text beside toggle |
| disabled | `boolean` | `false` | |

**Usage:**
```tsx
<Switch checked={notifications} onChange={setNotifications} label="Email notifications" />
```

---

### Modal
**File:** `src/components/ui/Modal.tsx`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| isOpen | `boolean` | required | Controls visibility |
| onClose | `() => void` | required | Called on backdrop click or Escape |
| title | `string` | — | Header text (renders close button automatically) |
| size | `sm \| md \| lg \| full` | `md` | Max width |

**Sub-components:** `Modal.Header`, `Modal.Body`, `Modal.Footer`

**Behaviour:** Renders via `createPortal` into `document.body`. Blocks body scroll while open.

**Usage:**
```tsx
const [open, setOpen] = useState(false)
<Button onClick={() => setOpen(true)}>Open</Button>
<Modal isOpen={open} onClose={() => setOpen(false)} title="Confirm deletion" size="sm">
  <Modal.Body>Are you sure you want to delete this item?</Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
    <Button variant="danger" onClick={handleDelete}>Delete</Button>
  </Modal.Footer>
</Modal>
```

---

### Toast / ToastProvider / useToast
**File:** `src/components/ui/Toast.tsx`

**Setup:** `<ToastProvider>` is already wrapped around the app in `src/App.tsx`.

**Hook:** `useToast()` returns `{ toast }` with four methods.

| Method | Signature |
|--------|-----------|
| `toast.success` | `(title, opts?) => void` |
| `toast.error` | `(title, opts?) => void` |
| `toast.warning` | `(title, opts?) => void` |
| `toast.info` | `(title, opts?) => void` |

`opts`: `{ message?: string, duration?: number }` (default duration: 4000 ms)

**Usage:**
```tsx
const { toast } = useToast()
toast.success('File saved!')
toast.error('Upload failed', { message: 'File exceeds 10 MB limit', duration: 6000 })
```

---

### Badge
**File:** `src/components/ui/Badge.tsx`

| Prop | Type | Default |
|------|------|---------|
| variant | `default \| success \| error \| warning \| info` | `default` |
| size | `sm \| md` | `sm` |
| dot | `boolean` | `false` |

**Usage:**
```tsx
<Badge variant="success" dot>Active</Badge>
<Badge variant="error">3 errors</Badge>
```

---

### Avatar / AvatarGroup
**File:** `src/components/ui/Avatar.tsx`

**Avatar props:**

| Prop | Type | Default |
|------|------|---------|
| src | `string` | — |
| name | `string` | — | Used for alt text and fallback initials |
| size | `xs \| sm \| md \| lg \| xl` | `md` |

**AvatarGroup props:**

| Prop | Type | Default |
|------|------|---------|
| users | `{src?, name?}[]` | required |
| max | `number` | `4` |
| size | same as Avatar | `sm` |

**Usage:**
```tsx
<Avatar src={user.avatarUrl} name={user.name} size="lg" />
<AvatarGroup users={team} max={5} />
```

---

### Alert
**File:** `src/components/ui/Alert.tsx`

| Prop | Type | Default |
|------|------|---------|
| variant | `success \| error \| warning \| info` | `info` |
| title | `string` | required |
| description | `string` | — |
| onDismiss | `() => void` | — | Shows ✕ button |

**Usage:**
```tsx
<Alert variant="error" title="Upload failed" description="File exceeds 10 MB."
  onDismiss={() => setError(null)} />
```

---

### Skeleton
**File:** `src/components/ui/Skeleton.tsx`

| Prop | Type | Default |
|------|------|---------|
| variant | `text \| circle \| rect` | `rect` |
| lines | `number` | `1` | For `text` variant, renders N lines |
| width | `string \| number` | — |
| height | `string \| number` | — |

**Usage:**
```tsx
<Skeleton variant="text" lines={3} />         {/* paragraph placeholder */}
<Skeleton variant="circle" className="h-10 w-10" />
<Skeleton variant="rect" className="h-40 w-full rounded-lg" />
```

---

### Tabs / TabsList / TabsTrigger / TabsContent
**File:** `src/components/ui/Tabs.tsx`

Controlled (pass `value` + `onValueChange`) or uncontrolled (pass `defaultValue`).

**Usage:**
```tsx
<Tabs defaultValue="profile">
  <TabsList>
    <TabsTrigger value="profile">Profile</TabsTrigger>
    <TabsTrigger value="security">Security</TabsTrigger>
  </TabsList>
  <TabsContent value="profile"><ProfileForm /></TabsContent>
  <TabsContent value="security"><SecurityForm /></TabsContent>
</Tabs>
```

---

### Accordion / AccordionItem / AccordionTrigger / AccordionContent
**File:** `src/components/ui/Accordion.tsx`

| Prop (Accordion) | Type | Default |
|------|------|---------|
| type | `single \| multiple` | `single` |
| defaultValue | `string \| string[]` | — |

**Usage:**
```tsx
<Accordion type="single" defaultValue="faq-1">
  <AccordionItem value="faq-1">
    <AccordionTrigger>What is included?</AccordionTrigger>
    <AccordionContent>Everything you need to ship.</AccordionContent>
  </AccordionItem>
</Accordion>
```

---

### Tooltip
**File:** `src/components/ui/Tooltip.tsx`

| Prop | Type | Default |
|------|------|---------|
| content | `string` | required |
| position | `top \| bottom \| left \| right` | `top` |

**Usage:**
```tsx
<Tooltip content="Copy to clipboard" position="bottom">
  <Button variant="ghost" size="sm"><Copy /></Button>
</Tooltip>
```

---

### Spinner
**File:** `src/components/ui/Spinner.tsx`

| Prop | Type | Default |
|------|------|---------|
| size | `sm \| md \| lg` | `md` |
| color | `accent \| white \| muted` | `accent` |

**Usage:**
```tsx
<Spinner size="lg" />
{isLoading && <Spinner color="white" size="sm" />}
```

---

### Divider
**File:** `src/components/ui/Divider.tsx`

| Prop | Type | Default |
|------|------|---------|
| orientation | `horizontal \| vertical` | `horizontal` |
| label | `string` | — | Centred text between two lines |

**Usage:**
```tsx
<Divider />
<Divider label="or" />
<Divider orientation="vertical" className="h-6" />
```

---

### Pagination
**File:** `src/components/ui/Pagination.tsx`

| Prop | Type | Description |
|------|------|-------------|
| currentPage | `number` | 1-based |
| totalPages | `number` | |
| onPageChange | `(page: number) => void` | |

Truncates with `…` when `totalPages > 7`.

**Usage:**
```tsx
const [page, setPage] = useState(1)
<Pagination currentPage={page} totalPages={20} onPageChange={setPage} />
```

---

### Table
**File:** `src/components/ui/Table.tsx`

Generic typed component. Define columns with optional `render` for custom cells.

```ts
interface Column<T> {
  key:       keyof T
  header:    string
  sortable?: boolean
  render?:   (value: T[keyof T], row: T) => ReactNode
  className?: string
}
```

| Prop | Type | Default |
|------|------|---------|
| columns | `Column<T>[]` | required |
| data | `T[]` | required |
| striped | `boolean` | `false` |
| onSort | `(key, dir) => void` | — | External sort handler; omit for local sort |
| emptyText | `string` | `'No data'` |

**Usage:**
```tsx
const cols: Column<User>[] = [
  { key: 'name',  header: 'Name', sortable: true },
  { key: 'role',  header: 'Role', render: v => <Badge>{String(v)}</Badge> },
]
<Table columns={cols} data={users} striped />
```

---

### ImageCard
**File:** `src/components/ui/ImageCard.tsx`

| Prop | Type | Default |
|------|------|---------|
| src | `string` | required |
| alt | `string` | required |
| caption | `string` | — |
| aspectRatio | `square \| video \| portrait` | `video` |
| onClick | `() => void` | — | Adds hover overlay |

**Usage:**
```tsx
<ImageCard src="/project.jpg" alt="Dashboard screenshot" caption="v2.0 release"
  aspectRatio="video" onClick={() => openLightbox()} />
```

---

### StatCard
**File:** `src/components/ui/StatCard.tsx`

| Prop | Type | Description |
|------|------|-------------|
| icon | `ReactNode` | Lucide icon |
| value | `string \| number` | The metric |
| label | `string` | Description |
| trend | `{value: number, direction: 'up'\|'down'}` | Optional trend indicator |

**Usage:**
```tsx
<StatCard icon={<Users className="h-5 w-5" />} value="1,234" label="Total users"
  trend={{ value: 12, direction: 'up' }} />
```

---

### PricingCard
**File:** `src/components/ui/PricingCard.tsx`

| Prop | Type | Default |
|------|------|---------|
| name | `string` | required |
| price | `string` | required | e.g. `"$19"` |
| period | `string` | — | e.g. `"/month"` |
| description | `string` | — |
| features | `string[]` | required |
| cta | `{label: string, onClick: () => void}` | required |
| highlighted | `boolean` | `false` | Accent border, "Recommended" badge |

**Usage:**
```tsx
<PricingCard name="Pro" price="$19" period="/month"
  features={['Unlimited projects', 'Priority support', 'API access']}
  cta={{ label: 'Start free trial', onClick: () => navigate('/register') }}
  highlighted />
```

---

### EmptyState
**File:** `src/components/ui/EmptyState.tsx`

| Prop | Type | Default |
|------|------|---------|
| icon | `ReactNode` | required |
| title | `string` | required |
| description | `string` | — |
| action | `{label: string, onClick: () => void}` | — |

**Usage:**
```tsx
<EmptyState icon={<FileX className="h-6 w-6" />} title="No results"
  description="Try adjusting your search filters."
  action={{ label: 'Clear filters', onClick: clearFilters }} />
```

---

### ProgressBar
**File:** `src/components/ui/ProgressBar.tsx`

| Prop | Type | Default |
|------|------|---------|
| value | `number` | required |
| max | `number` | `100` |
| color | `accent \| success \| error \| warning` | `accent` |
| label | `string` | — |
| showPercentage | `boolean` | `false` |

**Usage:**
```tsx
<ProgressBar value={72} color="success" label="Storage used" showPercentage />
```

---

## Layout Components (`src/components/layout/`)

---

### Navbar
**File:** `src/components/layout/Navbar.tsx`

Floating fixed navbar that becomes opaque + blurred after 50 px of scroll.

**To add a nav item:** edit `NAV_ITEMS` at the top of the file.
```ts
const NAV_ITEMS = [
  { label: 'Features', section: 'features' },  // scrolls to <section id="features">
  { label: 'Pricing',  href: '/pricing' },      // routes to /pricing
]
```

Shows Login / Register buttons when logged out; user name + Sign out when logged in.
Collapses to hamburger menu on mobile.

---

### Footer
**File:** `src/components/layout/Footer.tsx`

Three-column footer with brand logo, social icons, and link columns.

**To add a column or link:** edit `FOOTER_LINKS` at the top of the file.

---

## Page Sections (`src/sections/`)

All sections use `framer-motion` `useInView` for scroll-triggered fade-in animations.
Each section takes an `id` attribute matching the navbar scroll targets.

| Section | File | id | Customise |
|---------|------|----|-----------|
| HeroSection | `HeroSection.tsx` | `hero` | Headline, sub-headline, CTA labels |
| FeaturesSection | `FeaturesSection.tsx` | `features` | Edit `FEATURES` array |
| AboutSection | `AboutSection.tsx` | `about` | Edit `STATS` and `BULLETS` arrays |
| WorkSection | `WorkSection.tsx` | `work` | Edit `PROJECTS` array |
| TestimonialsSection | `TestimonialsSection.tsx` | `testimonials` | Edit `TESTIMONIALS` array |
| ContactSection | `ContactSection.tsx` | `contact` | Contact info via `CONTACT_INFO` array |

**To reorder or remove sections:** edit `src/pages/Home.tsx` — it just imports and sequences them.

---

## Pages (`src/pages/`)

| Page | File | Route | Notes |
|------|------|-------|-------|
| Home | `Home.tsx` | `/` | Assembles all sections |
| Login | `Login.tsx` | `/login` | Email/password + Google/GitHub OAuth |
| Register | `Register.tsx` | `/register` | Name/email/password + OAuth |
| OAuthCallback | `OAuthCallback.tsx` | `/oauth-callback` | Reads `?token=` after OAuth redirect |

---

## API Services (`src/services/api.ts`)

### Fetch wrapper
All requests go through a typed fetch wrapper that automatically:
- Attaches `Authorization: Bearer <token>` from localStorage
- Applies a 10 s timeout
- Normalises errors to `{ message, status }`

### Named services
```ts
import { authService, contactService } from '@/services/api'

// Auth
await authService.login({ email, password })     // sets token, returns { user, tokens }
await authService.register({ name, email, password })
await authService.logout()                        // removes token
await authService.me()                            // returns User

// Contact
await contactService.send({ name, email, subject, message })
```

### Resource factory
```ts
import { createResourceService } from '@/services/api'

const postService = createResourceService<Post>('/api/posts')
const posts = await postService.list()
const post  = await postService.get('123')
await postService.create({ title: 'Hello' })
await postService.update('123', { title: 'Updated' })
await postService.remove('123')
```

---

## Backend API (`server/src/`)

### Auth endpoints
| Method | Path | Auth | Body / Notes |
|--------|------|------|------|
| POST | `/api/auth/register` | none | `{name, email, password}` → `{user, tokens}` |
| POST | `/api/auth/login` | none | `{email, password}` → `{user, tokens}` |
| GET | `/api/auth/logout` | none | Informational — client drops JWT |
| GET | `/api/auth/me` | Bearer | Returns current user |
| GET | `/api/auth/google` | none | Starts Google OAuth flow |
| GET | `/api/auth/google/callback` | none | Redirects to `/oauth-callback?token=` |
| GET | `/api/auth/github` | none | Starts GitHub OAuth flow |
| GET | `/api/auth/github/callback` | none | Same redirect pattern |

### User endpoints
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/users` | admin |
| GET | `/api/users/:id` | own or admin |
| PUT | `/api/users/:id` | own or admin |
| DELETE | `/api/users/:id` | admin |

### Contact
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/contact` | none |

### MongoDB models
**User** — `email, name, password?, provider, providerId?, avatarUrl?, role, emailVerified`  
**Contact** — `name, email, subject, message`  
**Todo** — `userId (indexed, ref User), title, description?, completed, priority (low/medium/high), dueDate?, tags[], completedAt?`

---

## Example Authenticated Feature — Dashboard (Todo App)

**File:** `src/pages/Dashboard.tsx`  
**Route:** `/dashboard` (ProtectedRoute — requires JWT)  
**Purpose:** Demonstrates the complete authenticated CRUD pattern. Replace this with your own feature.

### What it demonstrates
- Loading data from a protected API on mount
- Create / edit modal using `Modal`, `Input`, `Select`, `Switch`, `Badge`
- Inline list with toggle, edit, delete actions
- Framer Motion `AnimatePresence` for list transitions
- `EmptyState` for zero-data UI
- `Skeleton` loading placeholders
- `useToast` for success/error feedback
- Filter state (show completed, filter by priority)

### Sub-components inside Dashboard.tsx
- `TodoForm` — modal form for create + edit. Props: `initial?: Todo, onSave, onClose, isOpen`
- `TodoItem` — single row with checkbox toggle, edit, delete. Props: `todo, onToggle, onEdit, onDelete`

### Service
`src/services/todos.ts` — `todoService.list/get/create/update/toggle/delete`

### To replace Todo with your own resource
1. Create `server/src/models/MyModel.ts` with `userId` field (indexed)
2. Create `server/src/routes/myresource.ts` — scope every query to `userId: req.user._id`
3. Mount in `server/src/routes/index.ts`
4. Add endpoint paths in `src/config/api.ts`
5. Add TypeScript interfaces in `src/types/index.ts`
6. Create `src/services/myresource.ts` (copy todos.ts pattern)
7. Create `src/pages/MyPage.tsx` (copy Dashboard pattern)
8. Add route in `src/App.tsx` inside `<ProtectedRoute>`

---

## Environment Variables

### Frontend (`.env`)
```
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_NAME=AppTemplate
VITE_GOOGLE_CLIENT_ID=          # public, matches server GOOGLE_CLIENT_ID
```

### Backend (`server/.env`)
```
PORT=3000
MONGODB_URI=                    # MongoDB Atlas connection string
JWT_SECRET=                     # 64+ random chars
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=               # from console.cloud.google.com
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=               # from github.com/settings/developers
GITHUB_CLIENT_SECRET=
EMAIL_PROVIDER=resend            # resend | sendgrid | mailgun
RESEND_API_KEY=                  # resend.com — free 3 000/month
SENDGRID_API_KEY=                # sendgrid.com — free 100/day
MAILGUN_API_KEY=                 # mailgun.com — free 5 000/month
MAILGUN_DOMAIN=
FROM_EMAIL=hello@example.com
APP_URL=http://localhost:5173
```

---

## Docker

```bash
docker-compose up          # start mongo + backend + frontend
docker-compose up --build  # rebuild images first
docker-compose down -v     # stop and remove volumes
```

Services:
- **mongo** — MongoDB 7, port 27017 (local dev only)
- **backend** — Express API, port 3000, hot-reload via nodemon
- **frontend** — Vite dev server, port 5173, hot-reload

The `docker-compose.yml` overrides `MONGODB_URI` to the local container.  
Set `MONGODB_URI` in `server/.env` to your Atlas URI for production.
