import express, { Request, Response, NextFunction } from 'express'
import cors    from 'cors'
import helmet  from 'helmet'
import { env }       from './config/env'
import './config/passport'       // registers all Passport strategies
import apiRouter from './routes'

export function createApp() {
  const app = express()

  // ── Security & parsing middleware ─────────────────────────────────────────
  app.use(helmet())
  app.use(cors({ origin: env.APP_URL, credentials: true }))
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // ── API routes ────────────────────────────────────────────────────────────
  app.use('/api', apiRouter)

  // ── 404 handler ───────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Not found' })
  })

  // ── Global error handler ──────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Mongoose validation error → 400
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message })
    }
    // JWT errors → 401
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' })
    }
    // Mongoose duplicate key → 409
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue ?? {})[0] ?? 'field'
      return res.status(409).json({ success: false, message: `${field} already in use` })
    }

    console.error(err)
    res.status(500).json({ success: false, message: 'Internal server error' })
  })

  return app
}
