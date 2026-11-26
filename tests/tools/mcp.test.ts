import { appendFile, copyFile, cp, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { describe, expect, it } from 'vitest'
import { decodeCommand } from '../../server/commands.ts'
import { commandSchema, playerActSchema } from '../../tools/mcp-schemas.ts'
import { runScenario, summarizeReport } from '../../tools/lab/runner.ts'

const root = resolve('.')
async function connection(profile: string, artifactRoot: string, workspace = root) {
  const transport = new StdioClientTransport({ command: process.execPath, args: [join(workspace, 'tools/mcp.ts')], cwd: workspace,
    env: { IDLE_BUDS_MCP_PROFILE: profile, IDLE_BUDS_LAB_ARTIFACT_ROOT: artifactRoot,
      IDLE_BUDS_API_URL: '', IDLE_BUDS_USERNAME: '', IDLE_BUDS_PASSWORD: '', IDLE_BUDS_SESSION: '' }, stderr: 'pipe' })
  let stderr = ''
  transport.stderr?.on('data', (value) => { stderr += String(value) })
  const client = new Client({ name: 'idle-buds-qualification', version: '1.0.0' })
  try { await client.connect(transport) } catch (error) { await transport.close(); throw new Error(`${String(error)} ${stderr}`) }
  return { client, stderr: () => stderr }
}

async function copyRuntime(workspace: string) {
  await mkdir(join(workspace, 'src'), { recursive: true })
  await mkdir(join(workspace, 'tools'), { recursive: true })
  await Promise.all([
    ...['src/game', 'src/data', 'server', 'tools/lab'].map((path) => cp(join(root, path), join(workspace, path), { recursive: true })),
    ...['tools/fixtures.ts', 'tools/player-client.ts', 'tools/mcp.ts', 'tools/mcp-schemas.ts', 'tools/lab.ts', 'package.json', 'package-lock.json']
      .map((path) => copyFile(join(root, path), join(workspace, path))),
    symlink(join(root, 'node_modules'), join(workspace, 'node_modules'), 'junction'),
  ])
}

function structured(value: unknown) {
  return (value as { structuredContent: { outcome: string; data: Record<string, unknown> }; isError?: boolean }).structuredContent
}

describe('MCP protocol through an actual stdio client', () => {
  it('discovers five tools, runs the same scenario as the API, reads and replays its report', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'idle-buds-mcp-'))
    const { client, stderr } = await connection('all', directory)
    try {
      const list = await client.listTools()
      expect(list.tools.map((tool) => tool.name).sort()).toEqual(['lab_replay', 'lab_report', 'lab_run', 'player_act', 'player_observe'])
      expect(list.tools.every((tool) => tool.outputSchema)).toBe(true)
      expect(list.tools.find((tool) => tool.name === 'player_observe')?.annotations?.readOnlyHint).toBe(false)
      const resources = await client.listResources()
      expect(resources.resources.map((resource) => resource.uri)).toContain('idle-buds://lab/scenarios')
      const catalog = await client.readResource({ uri: 'idle-buds://lab/scenarios' })
      expect(JSON.stringify(catalog)).toContain('activity-replacement')
      expect(JSON.stringify(catalog)).not.toContain('function')

      const request = { scenarioId: 'activity-replacement', seedSetId: 'smoke' }
      const direct = summarizeReport(await runScenario(request, { artifactRoot: directory }))
      const ran = structured(await client.callTool({ name: 'lab_run', arguments: request }, undefined, { timeout: 60_000 }))
      expect(ran.outcome).toBe('passed')
      expect(ran.data.metrics).toEqual(direct.metrics)
      expect(ran.data.summary).toEqual(direct.summary)
      expect(ran.data).not.toHaveProperty('cases')
      const runId = ran.data.runId as string
      const report = structured(await client.callTool({ name: 'lab_report', arguments: { runId } }))
      expect(report.outcome).toBe('ok')
      expect(report.data).toEqual(ran.data)
      const replay = structured(await client.callTool({ name: 'lab_replay', arguments: { runId } }, undefined, { timeout: 60_000 }))
      expect(replay.outcome).toBe('matched')
      const unconfigured = structured(await client.callTool({ name: 'player_observe', arguments: {} }))
      expect(unconfigured.outcome).toBe('not_configured')
      expect(stderr()).toBe('')
    } finally { await client.close(); await rm(directory, { recursive: true, force: true }) }
  }, 90_000)

  it('reports exhausted budgets, rejects bad IDs and exposes only the selected profile', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'idle-buds-mcp-limit-'))
    const { client } = await connection('lab', directory)
    try {
      expect((await client.listTools()).tools.map((tool) => tool.name).sort()).toEqual(['lab_replay', 'lab_report', 'lab_run'])
      const limited = await client.callTool({ name: 'lab_run', arguments: { scenarioId: 'activity-replacement', seedSetId: 'smoke', limits: { maxActions: 1 } } })
      expect(structured(limited).outcome).toBe('budget_exhausted')
      expect(limited.isError).toBe(true)
      const unknown = await client.callTool({ name: 'lab_run', arguments: { scenarioId: 'not-a-scenario' } })
      expect(unknown.isError).toBe(true)
      expect(structured(unknown).outcome).toBe('invalid')
      expect(structured(unknown).data.message).toContain('Unknown scenario')
      const missing = await client.callTool({ name: 'lab_report', arguments: { runId: 'unavailable-run' } })
      expect(structured(missing).outcome).toBe('unavailable')
      expect(structured(missing).data.message).not.toContain(directory)
      const traversal = await client.callTool({ name: 'lab_report', arguments: { runId: '../report' } })
      expect(traversal.isError).toBe(true)
    } finally { await client.close(); await rm(directory, { recursive: true, force: true }) }
    const player = await connection('player', directory)
    try {
      expect((await player.client.listTools()).tools.map((tool) => tool.name).sort()).toEqual(['player_act', 'player_observe'])
      expect(player.client.getServerCapabilities()?.resources).toBeUndefined()
    } finally { await player.client.close() }
  }, 60_000)

  it('requires a persistent MCP process to restart after its runtime source changes', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'idle-buds-mcp-source-'))
    const workspace = join(directory, 'source')
    const artifacts = join(directory, 'artifacts')
    await copyRuntime(workspace)
    const { client } = await connection('lab', artifacts, workspace)
    const request = { name: 'lab_run', arguments: { scenarioId: 'activity-replacement', seedSetId: 'smoke' } }
    try {
      const first = structured(await client.callTool(request))
      expect(first.outcome).toBe('passed')
      // Edit only an isolated source copy. The live process still holds its earlier imported modules.
      await appendFile(join(workspace, 'src/game/limits.ts'), '\n// Runtime changed after MCP loaded.\n')
      const stale = await client.callTool(request)
      expect(stale.isError).toBe(true)
      expect(structured(stale).outcome).toBe('inconclusive')
      expect(structured(stale).data.message).toMatch(/restart/i)
      const replay = structured(await client.callTool({ name: 'lab_replay', arguments: { runId: first.data.runId } }))
      expect(replay.outcome).toBe('inconclusive')
      const fresh = await connection('lab', artifacts, workspace)
      try { expect(structured(await fresh.client.callTool(request)).outcome).toBe('passed') }
      finally { await fresh.client.close() }
    } finally { await client.close(); await rm(directory, { recursive: true, force: true }) }
  }, 60_000)
})

describe('player MCP contract uses current game commands', () => {
  it('describes all command families and delegates final validation to the existing decoder', () => {
    const samples: unknown[] = [
      { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap' } },
      { type: 'queueActivity', order: { kind: 'craft', recipeId: 'capture-kit', count: null }, workerId: 'bud-1' },
      { type: 'startActivity', order: { kind: 'battle', zoneId: 'earth', count: 1 } },
      ...['pauseActivity', 'resumeActivity', 'stopActivity'].map((type) => ({ type })),
      ...['travel', 'unlockZone'].map((type) => ({ type, zoneId: 'earth' })),
      { type: 'buyUpgrade', upgrade: 'worker' }, { type: 'setFormation', budIds: [] },
      { type: 'equip', slot: 'weapon', gearId: null },
      { type: 'setCaptureFilters', filters: [{ condition: 'any', itemId: 'skip' }, { condition: 'affinity', value: 'Core', itemId: 'capture-kit' }] },
      { type: 'protectBud', budId: 'bud-1', protected: true }, { type: 'releaseBud', budId: 'bud-1', confirm: true },
      { type: 'condenseBud', budId: 'bud-1', donorId: 'bud-2', confirm: true }, { type: 'teachBud', budId: 'bud-1', technique: 'Guard' },
      { type: 'breed', primaryId: 'bud-1', secondaryId: 'bud-2', enhanced: false }, { type: 'hatch', eggId: 'egg-1' },
      { type: 'eat', itemId: 'trail-stew' }, { type: 'market.list', asset: { kind: 'item', itemId: 'scrap' }, quantity: 1, unitPrice: 1 },
      { type: 'market.order', itemId: 'scrap', quantity: 1, unitPrice: 1 }, { type: 'market.fill', listingId: randomUUID(), quantity: 1 },
      { type: 'market.cancel', listingId: randomUUID() }, ...['store.buy', 'store.sell'].map((type) => ({ type, itemId: 'scrap', quantity: 1 })),
      { type: 'chat.send', text: 'test' }, { type: 'chat.report', messageId: randomUUID(), reason: 'test' },
      ...['social.friend', 'social.unfriend', 'social.block', 'social.unblock', 'social.mute', 'social.unmute'].map((type) => ({ type, username: 'other' })),
      ...['clan.create', 'clan.join'].map((type) => ({ type, name: 'test' })), { type: 'clan.contribute', quantity: 1 },
      ...['clan.leave', 'pvp.publish', 'pvp.match'].map((type) => ({ type })),
    ]
    for (const command of samples) {
      expect(commandSchema.safeParse(command).success, JSON.stringify(command)).toBe(true)
      expect(() => decodeCommand({ id: randomUUID(), command })).not.toThrow()
    }
    for (const command of [
      { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap', count: null } },
      { type: 'setFormation', budIds: ['a', 'b', 'c', 'd', 'e', 'f'] },
      { type: 'setCaptureFilters', filters: [{ condition: 'any', value: 'secret', itemId: 'skip' }] },
      { type: 'market.list', asset: { kind: 'item', itemId: 'scrap', instanceId: 'gear' }, quantity: 1, unitPrice: 1 },
      { type: 'pauseActivity', fixture: 'admin' }, { type: 'awardCoins', quantity: 10 },
    ]) expect(commandSchema.safeParse(command).success).toBe(false)
    expect(playerActSchema.safeParse({ commandId: 'new', command: { type: 'pauseActivity' } }).success).toBe(false)
  })
})
