import { Router } from 'express'
import authRouter    from './auth'
import usersRouter   from './users'
import contactRouter from './contact'
import todosRouter   from './todos'

const router = Router()

router.use('/auth',    authRouter)
router.use('/users',   usersRouter)
router.use('/contact', contactRouter)
// ── Example authenticated resource — replace with your own ───────────────────
router.use('/todos',   todosRouter)

// Health check
router.get('/health', (_req, res) => res.json({ status: 'ok' }))

export default router
