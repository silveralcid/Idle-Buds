import { localDatabase, migrate } from './db-local.mjs'
import { runWorldExperiments } from './world-experiments.ts'

const local = await localDatabase({ temporary: true })
try {
  await migrate(local.url)
  await runWorldExperiments(local.url)
} finally {
  await local.stop()
}
