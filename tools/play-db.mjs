import { localDatabase } from './db-local.mjs'

// This helper alone owns embedded-postgres and its global exit hooks. The launcher
// closes the HTTP server first, then requests database shutdown over private IPC.
if (!process.connected) throw new Error('The local database helper requires its launcher IPC channel.')
let database
let stopping = false
let requestStop
const stopped = new Promise((resolve) => { requestStop = () => { stopping = true; resolve() } })
process.on('message', (message) => { if (message?.type === 'stop') requestStop() })
process.on('disconnect', requestStop)
try {
  database = await localDatabase({ playtest: process.argv.includes('--fixtures') })
  if (process.connected && !stopping) process.send({ type: 'ready', url: database.url }, (error) => { if (error) requestStop() })
  else requestStop()
  await stopped
} finally {
  await database?.stop()
  if (process.connected) process.disconnect()
}
