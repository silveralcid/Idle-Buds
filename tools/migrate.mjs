import { migrate } from './db-local.mjs'
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL before running migrations')
await migrate(process.env.DATABASE_URL)
console.log('Database migrations applied.')
