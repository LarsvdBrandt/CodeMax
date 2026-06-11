import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'

// Returns an Express middleware that validates req.body against the given Zod schema.
// Calls next() on success; returns 400 with field errors on failure.
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const errors = result.error.issues.map(i => ({
        field:   i.path.join('.'),
        message: i.message,
      }))
      return res.status(400).json({ success: false, message: 'Validation failed', errors })
    }
    req.body = result.data
    next()
  }
}
