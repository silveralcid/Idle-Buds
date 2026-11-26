import { randomUUID } from 'node:crypto'
import { createServer } from 'node:net'
import { resolve } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { Pool } from 'pg'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../server/app.ts'
import { PlayerClient } from '../../tools/player-client.ts'
import type { PlayerStateResponse } from '../../tools/player-client.ts'
import { assertTestDatabase } from '../../tools/db-local.mjs'

const database = process.env.DATABASE_URL
if (!database || process.env.IDLE_BUDS_TEST_DATABASE !== '1') throw new Error('Run MCP HTTP qualification using npm run test:integration.')
assertTestDatabase(database)
const pool = new Pool({ connectionString: database, max: 4 })
const password = 'MCP isolated test password 2026!'
let app: Awaited<ReturnType<typeof buildApp>>
let origin: string
let now: number
let dropCommandResponse: boolean

async function freePort() {
  const server = createServer()
  await new Promise<void>((accept, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', accept) })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Port unavailable.')
  await new Promise<void>((accept, reject) => server.close((error) => error ? reject(error) : accept()))
  return address.port
}
async function register(username: string) {
  const response = await fetch(origin + '/api/register', { method: 'POST', headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }) })
  expect(response.status).toBe(200)
}
function player(username: string) { return new PlayerClient({ baseUrl: origin, username, password }) }
function data(value: unknown) { return (value as { structuredContent: { outcome: string; data: { data?: PlayerStateResponse; commandId?: string } } }).structuredContent }

beforeEach(async () => {
  const { rows: [target] } = await pool.query<{ name: string; host: string }>('SELECT current_database() AS name, host(inet_server_addr()) AS host')
  if (target.name !== 'idle_buds_test' || !['127.0.0.1', '::1'].includes(target.host)) throw new Error('Refusing non-test database cleanup.')
  await pool.query('TRUNCATE accounts, clans, store_stock CASCADE')
  now = Date.parse('2026-11-26T10:00:00Z')
  const port = await freePort()
  origin = `http://127.0.0.1:${port}`
  app = await buildApp({ pool, allowedOrigin: origin, clock: () => now })
  dropCommandResponse = false
  app.addHook('onSend', async (request, reply, payload) => {
    if (dropCommandResponse && request.url === '/api/command') reply.raw.destroy()
    return payload
  })
  await app.listen({ host: '127.0.0.1', port })
})
afterEach(async () => { await app.close() })
afterAll(async () => { await pool.end() })

describe('player API and MCP through real HTTP and PostgreSQL', () => {
  it('uses normal login and receipts, keeps accounts isolated and preserves progress on a rejected replacement', async () => {
    await register('mcp_alpha'); await register('mcp_beta')
    const alpha = player('mcp_alpha'), beta = player('mcp_beta')
    const id = randomUUID()
    const command = { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap' } } as const
    const started = await alpha.act(id, command)
    expect(started.status).toBe('ok')
    now += 8_000
    const observation = await alpha.observe(['player', 'world'])
    expect(observation.data?.player?.state.inventory.scrap).toBe(2)
    expect(observation.data?.world).toHaveProperty('listings')
    expect(await alpha.act(id, command)).toEqual(started)
    expect((await alpha.observe()).data?.player?.state.inventory.scrap).toBe(2)
    expect((await alpha.act(id, { type: 'pauseActivity' })).status).toBe('rejected')
    const rejected = await alpha.act(randomUUID(), { type: 'startActivity', order: { kind: 'gather', nodeId: 'tide-basalt' } })
    expect(rejected.status).toBe('rejected')
    expect(rejected.data?.state.activities.tender.order).toEqual(command.order)
    expect((await beta.observe()).data?.player?.state.inventory.scrap).toBeUndefined()
    expect((await beta.observe()).data?.player?.state.activities).toEqual({})
    const state = observation.data!.player!.state
    for (const key of ['seed', 'rngCounter', 'nextId', 'eggGenetics']) expect(state).not.toHaveProperty(key)
    expect(JSON.stringify(observation)).not.toContain(password)
    expect(JSON.stringify(observation)).not.toContain('idle_buds_session')
    const { rows: [receipts] } = await pool.query('SELECT count(*)::int AS count FROM command_receipts WHERE command_id = $1', [id])
    expect(receipts.count).toBe(1)
  })

  it('submits player commands through a real SDK client and stdio MCP process', async () => {
    await register('mcp_agent')
    const transport = new StdioClientTransport({ command: process.execPath, args: [resolve('tools/mcp.ts')], cwd: resolve('.'),
      env: { IDLE_BUDS_MCP_PROFILE: 'player', IDLE_BUDS_API_URL: origin, IDLE_BUDS_USERNAME: 'mcp_agent', IDLE_BUDS_PASSWORD: password }, stderr: 'pipe' })
    let stderr = ''
    transport.stderr?.on('data', (chunk) => { stderr += String(chunk) })
    const client = new Client({ name: 'http-qualification', version: '1.0.0' })
    try {
      await client.connect(transport)
      const commandId = randomUUID()
      const request = { name: 'player_act', arguments: { commandId, command: { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap' } } } }
      const started = data(await client.callTool(request))
      expect(started.outcome).toBe('ok')
      expect(started.data.commandId).toBe(commandId)
      expect(started.data.data?.state.activities.tender.order).toEqual(request.arguments.command.order)
      now += 4_000
      const observation = await client.callTool({ name: 'player_observe', arguments: {} })
      expect(JSON.stringify(observation)).toContain('foreground check-in')
      expect(data(await client.callTool(request))).toEqual(started)
      expect(stderr).not.toContain(password)
      expect(stderr).not.toContain('idle_buds_session')
      expect((await client.callTool({ name: 'player_act', arguments: { commandId, command: { type: 'grant', coins: 10 } } })).isError).toBe(true)
    } finally { await client.close() }
  }, 60_000)

  it('reports unknown command completion without making a second mutation or changing the key', async () => {
    await register('mcp_interrupted')
    const alpha = player('mcp_interrupted')
    expect((await alpha.observe()).status).toBe('ok')
    // Drop the outgoing response after Fastify and the PostgreSQL transaction have completed.
    dropCommandResponse = true
    const commandId = randomUUID()
    const command = { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap' } } as const
    const unknown = await alpha.act(commandId, command)
    expect(unknown.status).toBe('unknown')
    expect(unknown.commandId).toBe(commandId)
    const { rows: [receipt] } = await pool.query('SELECT count(*)::int AS count FROM command_receipts WHERE command_id = $1', [commandId])
    expect(receipt.count).toBe(1)
    await app.close()
    app = await buildApp({ pool, allowedOrigin: origin, clock: () => now })
    await app.listen({ host: '127.0.0.1', port: Number(new URL(origin).port) })
    const recovered = await alpha.act(commandId, command)
    expect(recovered.status).toBe('ok')
    const { rows: [after] } = await pool.query('SELECT count(*)::int AS count FROM command_receipts WHERE command_id = $1', [commandId])
    expect(after.count).toBe(1)
  })
})
