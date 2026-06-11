// ─────────────────────────────────────────────────────────────────────────────
// Todo model
//
// This is the EXAMPLE resource that ships with the template to demonstrate
// the full auth → protected API → frontend CRUD pattern.
//
// REPLACE / EXTEND THIS for your real application:
//   - Rename the model to match your domain (Project, Task, Post, etc.)
//   - Add/remove fields from the schema
//   - The route file (server/src/routes/todos.ts) follows the same pattern
//   - The frontend page (src/pages/Dashboard.tsx) shows how to wire it up
//
// Schema fields:
//   userId      ObjectId  ref to User — every todo belongs to one user
//   title       String    required
//   description String    optional — longer notes
//   completed   Boolean   default false
//   priority    Enum      low | medium | high  default medium
//   dueDate     Date      optional
//   tags        String[]  optional labels (e.g. ['work', 'personal'])
//   completedAt Date      set automatically when completed flips to true
// ─────────────────────────────────────────────────────────────────────────────

import mongoose, { Document, Schema, Types } from 'mongoose'

export interface ITodo extends Document {
  userId:      Types.ObjectId
  title:       string
  description?: string
  completed:   boolean
  priority:    'low' | 'medium' | 'high'
  dueDate?:    Date
  tags:        string[]
  completedAt?: Date
  createdAt:   Date
  updatedAt:   Date
}

const todoSchema = new Schema<ITodo>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title:       { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    completed:   { type: Boolean, default: false },
    priority:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    dueDate:     { type: Date },
    tags:        { type: [String], default: [] },
    completedAt: { type: Date },
  },
  { timestamps: true },
)

// Auto-set completedAt when completed changes to true
todoSchema.pre('save', function () {
  if (this.isModified('completed')) {
    this.completedAt = this.completed ? new Date() : undefined
  }
})

export const Todo = mongoose.model<ITodo>('Todo', todoSchema)
