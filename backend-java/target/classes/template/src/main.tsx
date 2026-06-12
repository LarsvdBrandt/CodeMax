import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/globals.css'
import App from '@/App'
import { theme } from '@/config/theme'
import { CONTENT } from '@/config/content'

// Inject theme tokens as CSS custom properties so Tailwind's color classes resolve.
const root = document.documentElement
Object.entries(theme.colors).forEach(([key, value]) => {
  root.style.setProperty(`--color-${key}`, value as string)
})
root.style.setProperty('--radius', theme.radius)
root.style.setProperty('--radius-lg', theme.radiusLg)
// Override accent with the project-specific color from content.ts (set by pipeline)
root.style.setProperty('--color-accent', CONTENT.brand.accentColor)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
