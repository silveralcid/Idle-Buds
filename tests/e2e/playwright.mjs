import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Keep browser downloads task-local on every supported host shell.
const root = fileURLToPath(new URL('../../', import.meta.url))
const cli = join(root, 'node_modules', '@playwright', 'test', 'cli.js')
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  cwd: root,
  env: {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH:
      process.env.PLAYWRIGHT_BROWSERS_PATH ?? join(root, '.repo-local', 'browsers'),
  },
  stdio: 'inherit',
})

if (result.error) throw result.error
process.exit(result.status ?? 1)
