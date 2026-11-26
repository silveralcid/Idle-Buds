import { spawn } from 'node:child_process'
import { localDatabase, migrate, assertTestDatabase, databaseVersion } from './db-local.mjs'

// Each default invocation owns an isolated disposable real PostgreSQL cluster.
const local = process.env.DATABASE_URL ? null : await localDatabase({ temporary: true })
const url = process.env.DATABASE_URL ?? local.url
assertTestDatabase(url)
const env = { ...process.env, DATABASE_URL: url, NODE_ENV: 'test', PORT: '4173',
  HOST: '127.0.0.1', ALLOWED_ORIGIN: 'http://127.0.0.1:4173', IDLE_BUDS_TEST_DATABASE: '1' }
let active
process.once('SIGINT', () => active?.kill('SIGINT'))
process.once('SIGTERM', () => active?.kill('SIGTERM'))
async function run(args, environment = {}) {
  const code = await new Promise((accept, reject) => {
    active = spawn(process.execPath, args, { env: { ...env, ...environment }, stdio: 'inherit' })
    active.once('error', reject); active.once('exit', (code) => accept(code ?? 1))
  })
  if (code !== 0) throw new Error(`Verification failed: ${args.join(' ')} (${code})`)
}
try {
  await migrate(url)
  console.log(`Real PostgreSQL ${await databaseVersion(url)}; isolated test database.`)
  const only = process.argv[2]
  if (only !== 'browser') await run(['node_modules/vitest/vitest.mjs', 'run', ...(only === 'integration' ? ['tests/integration'] : [])])
  if (!only || only === 'browser') {
    await run(['node_modules/typescript/bin/tsc', '-b'])
    await run(['node_modules/vite/bin/vite.js', 'build'], { NODE_ENV: 'production' })
    await run(['tests/e2e/playwright.mjs', 'test'])
  }
} catch (error) { console.error(error.message); process.exitCode = 1 }
finally { await local?.stop() }
