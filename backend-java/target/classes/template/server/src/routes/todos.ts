// ─────────────────────────────────────────────────────────────────────────────
// Todo routes — example authenticated CRUD resource
//
// All routes require a valid JWT (authenticate middleware).
// Users can only access their own todos (filtered by userId = req.user._id).
//
// ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
// GET    /api/todos              list todos for the current user
//          ?completed=true|false  filter by status
//          ?priority=low|medium|high
//          ?tag=work              filter by tag
//          ?sort=dueDate|createdAt|priority  (default: createdAt desc)
// POST   /api/todos              create a new todo
// GET    /api/todos/:id          get single todo
// PUT    /api/todos/:id          update todo (full or partial)
// PATCH  /api/todos/:id/toggle   flip completed ↔ incomplete
// DELETE /api/todos/:id          delete todo
//
// TEMPLATE NOTE
// ─────────────────────────────────────────────────────────────────────────────
// This file is the reference implementation for a protected resource route.
// To add a new resource to the app:
//   1. Copy this file, rename Todo → YourModel
//   2. Import your model from ../models/YourModel
//   3. Register the router in ../routes/index.ts
//   4. Add frontend service in src/services/yourResource.ts
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express'
import { z }      from 'zod'
import { Todo }         from '../models/Todo'
import { authenticate } from '../middleware/authenticate'
import { validate }     from '../middleware/validate'
import { IUser }        from '../models/User'
import { Types }        from 'mongoose'

const router = Router()

// All todo routes require authentication
router.use(authenticate)

// ── Zod schemas ───────────────────────────────────────────────────────────────

const createSchema = z.object({
  title:       z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  priority:    z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate:     z.string().datetime({ offset: true }).optional().transform(v => v ? new Date(v) : undefined),
  tags:        z.array(z.string().max(50)).max(10).default([]),
})

const updateSchema = z.object({
  title:       z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  completed:   z.boolean().optional(),
  priority:    z.enum(['low', 'medium', 'high']).optional(),
  dueDate:     z.string().datetime({ offset: true }).optional().nullable().transform(v => v ? new Date(v) : undefined),
  tags:        z.array(z.string().max(50)).max(10).optional(),
})

// ── GET /todos ────────────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const userId = (req.user as IUser)._id as Types.ObjectId
    const { completed, priority, tag, sort = 'createdAt' } = req.query

    // Build filter — always scoped to the current user
    const filter: Record<string, unknown> = { userId }
    if (completed !== undefined) filter.completed = completed === 'true'
    if (priority)                filter.priority  = priority
    if (tag)                     filter.tags      = tag

    // Sort mapping
    const sortMap: Record<string, Record<string, 1 | -1>> = {
      createdAt: { createdAt: -1 },
      dueDate:   { dueDate: 1 },
      priority:  { priority: 1 },
    }
    const sortObj = sortMap[sort as string] ?? sortMap.createdAt

    const todos = await Todo.find(filter).sort(sortObj)
    res.json({ success: true, data: todos })
  } catch (err) {
    next(err)
  }
})

// ── POST /todos ───────────────────────────────────────────────────────────────

router.post('/', validate(createSchema), async (req, res, next) => {
  try {
    const userId = (req.user as IUser)._id as Types.ObjectId
    const todo   = await Todo.create({ ...req.body, userId })
    res.status(201).json({ success: true, data: todo })
  } catch (err) {
    next(err)
  }
})

// ── GET /todos/:id ────────────────────────────────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    const userId = (req.user as IUser)._id as Types.ObjectId
    const todo   = await Todo.findOne({ _id: req.params.id, userId })
    if (!todo) return res.status(404).json({ success: false, message: 'Todo not found' })
    res.json({ success: true, data: todo })
  } catch (err) {
    next(err)
  }
})

// ── PUT /todos/:id ────────────────────────────────────────────────────────────

router.put('/:id', validate(updateSchema), async (req, res, next) => {
  try {
    const userId = (req.user as IUser)._id as Types.ObjectId
    const todo   = await Todo.findOneAndUpdate(
      { _id: req.params.id, userId },
      req.body,
      { new: true, runValidators: true },
    )
    if (!todo) return res.status(404).json({ success: false, message: 'Todo not found' })
    res.json({ success: true, data: todo })
  } catch (err) {
    next(err)
  }
})

// ── PATCH /todos/:id/toggle ───────────────────────────────────────────────────

router.patch('/:id/toggle', async (req, res, next) => {
  try {
    const userId = (req.user as IUser)._id as Types.ObjectId
    const todo   = await Todo.findOne({ _id: req.params.id, userId })
    if (!todo) return res.status(404).json({ success: false, message: 'Todo not found' })
    todo.completed = !todo.completed
    await todo.save()
    res.json({ success: true, data: todo })
  } catch (err) {
    next(err)
  }
})

// ── DELETE /todos/:id ─────────────────────────────────────────────────────────

router.delete('/:id', async (req, res, next) => {
  try {
    const userId = (req.user as IUser)._id as Types.ObjectId
    const todo   = await Todo.findOneAndDelete({ _id: req.params.id, userId })
    if (!todo) return res.status(404).json({ success: false, message: 'Todo not found' })
    res.json({ success: true, message: 'Todo deleted' })
  } catch (err) {
    next(err)
  }
})

export default router
