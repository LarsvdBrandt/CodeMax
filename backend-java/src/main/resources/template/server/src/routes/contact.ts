import { Router } from 'express'
import { z }      from 'zod'
import { Contact }                  from '../models/Contact'
import { validate }                 from '../middleware/validate'
import { sendContactConfirmation }  from '../services/email'

const router = Router()

const contactSchema = z.object({
  name:    z.string().min(1, 'Name is required'),
  email:   z.string().email('Valid email required'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})

router.post('/', validate(contactSchema), async (req, res, next) => {
  try {
    const doc = await Contact.create(req.body)

    sendContactConfirmation({ name: doc.name, email: doc.email, subject: doc.subject })
      .catch(console.error)

    res.status(201).json({ success: true, message: 'Message received' })
  } catch (err) {
    next(err)
  }
})

export default router
