// ─────────────────────────────────────────────────────────────────────────────
// User model
// Supports both local (email/password) and OAuth (Google, GitHub) sign-in.
// Password is only stored for local accounts; OAuth users have no password.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose, { Document, Model, Schema } from 'mongoose'
import { hash, compare } from '../utils/password'

export interface IUser extends Document {
  email:         string
  name:          string
  password?:     string
  provider:      'local' | 'google' | 'github'
  providerId?:   string
  avatarUrl?:    string
  role:          'user' | 'admin'
  emailVerified: boolean
  createdAt:     Date
  updatedAt:     Date
  comparePassword(candidate: string): Promise<boolean>
}

interface UserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>
}

const userSchema = new Schema<IUser>(
  {
    email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    name:          { type: String, required: true, trim: true },
    password:      { type: String, select: false },  // excluded from queries by default
    provider:      { type: String, enum: ['local', 'google', 'github'], default: 'local' },
    providerId:    { type: String },
    avatarUrl:     { type: String },
    role:          { type: String, enum: ['user', 'admin'], default: 'user' },
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
)

// Hash password before saving if it was modified
userSchema.pre('save', async function () {
  if (this.isModified('password') && this.password) {
    this.password = await hash(this.password)
  }
})

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  if (!this.password) return Promise.resolve(false)
  return compare(candidate, this.password)
}

userSchema.statics.findByEmail = function (email: string) {
  // Include password field for auth checks
  return this.findOne({ email: email.toLowerCase() }).select('+password')
}

export const User = mongoose.model<IUser, UserModel>('User', userSchema)
