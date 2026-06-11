import { connectDB } from './config/db'
import { createApp } from './app'
import { env }       from './config/env'

async function main() {
  await connectDB()
  const app = createApp()
  app.listen(Number(env.PORT), () => {
    console.log(`🚀  Server running on http://localhost:${env.PORT}`)
  })
}

main().catch(err => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})
