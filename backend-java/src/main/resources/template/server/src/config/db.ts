import mongoose from 'mongoose'
import { env } from './env'

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI)
    console.log(`✅  MongoDB connected: ${mongoose.connection.host}`)
  } catch (err) {
    console.error('❌  MongoDB connection failed:', err)
    process.exit(1)
  }
}
