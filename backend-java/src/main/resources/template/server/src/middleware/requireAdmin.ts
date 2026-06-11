import { Request, Response, NextFunction } from 'express'
import { IUser } from '../models/User'

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user as IUser | undefined
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden: admin access required' })
  }
  next()
}
