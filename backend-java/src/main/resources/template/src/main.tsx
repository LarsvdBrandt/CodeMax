import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/globals.css'
import App from '@/App'
import { theme } from '@/config/theme'

// Inject theme tokens as CSS custom properties so Tailwind's color classes resolve.
// Editing theme.ts is the single source of truth — this picks changes up at runtime.
const root = document.documentElement
Object.entries(theme.colors).forEach(([key, value]) => {
  root.style.setProperty(`--color-${key}`, value as string)
})
root.style.setProperty('--radius', theme.radius)
root.style.setProperty('--radius-lg', theme.radiusLg)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
