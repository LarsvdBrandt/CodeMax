// ─────────────────────────────────────────────────────────────────────────────
// User routes
//
// GET    /api/users          — list all users (admin only)
// GET    /api/users/:id      — get user by id (own account or admin)
// PUT    /api/users/:id      — update user (own account or admin)
// DELETE /api/users/:id      — delete user (admin only)
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express'
import { z }      from 'zod'
import { User, IUser }      from '../models/User'
import { authenticate }     from '../middleware/authenticate'
import { requireAdmin }     from '../middleware/requireAdmin'
import { validate }         from '../middleware/validate'

const router = Router()

const updateSchema = z.object({
  name:      z.string().min(1).optional(),
  avatarUrl: z.string().url().optional(),
}).strict()

// Ensure the request is for the user's own account or is an admin
function isSelfOrAdmin(req: any): boolean {
  const user = req.user as IUser
  return req.params.id === String(user._id).toString() || user.role === 'admin'
}

// GET /users — admin only
router.get('/', authenticate, requireAdmin, async (_req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 })
    res.json({ success: true, data: users })
  } catch (err) {
    next(err)
  }
})

// GET /users/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    if (!isSelfOrAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
})

// PUT /users/:id
router.put('/:id', authenticate, validate(updateSchema), async (req, res, next) => {
  try {
    if (!isSelfOrAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
})

// DELETE /users/:id — admin only
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    res.json({ success: true, message: 'User deleted' })
  } catch (err) {
    next(err)
  }
})

export default router
