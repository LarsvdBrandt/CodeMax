import mongoose, { Document, Schema } from 'mongoose'

export interface IContact extends Document {
  name:      string
  email:     string
  subject:   string
  message:   string
  createdAt: Date
  updatedAt: Date
}

const contactSchema = new Schema<IContact>(
  {
    name:    { type: String, required: true, trim: true },
    email:   { type: String, required: true, lowercase: true, trim: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true },
  },
  { timestamps: true },
)

export const Contact = mongoose.model<IContact>('Contact', contactSchema)
