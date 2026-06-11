import { Request, Response, NextFunction } from 'express'
import passport from 'passport'

// Wraps passport JWT strategy as a standard async middleware.
// Attaches the authenticated user to req.user on success.
// Returns 401 if no valid token is present.
export function authenticate(req: Request, res: Response, next: NextFunction) {
  passport.authenticate('jwt', { session: false }, (err: Error, user: Express.User) => {
    if (err)   return next(err)
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorised' })
    req.user = user
    next()
  })(req, res, next)
}
