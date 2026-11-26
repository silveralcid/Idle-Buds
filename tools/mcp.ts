import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { playerClientFromEnv } from './player-client.ts'
import type { PlayerClient, PlayerCommand } from './player-client.ts'
import { playerActSchema, playerObserveSchema, replaySchema, reportSchema, runSchema, toolOutputSchema } from './mcp-schemas.ts'
import { readReport, replayRun, runScenario, summarizeReport, listSeedSets } from './lab/runner.ts'
import { SCENARIOS } from './lab/scenarios.ts'

export type McpProfile = 'all' | 'player' | 'lab'
export interface McpOptions { profile?: McpProfile; artifactRoot?: string; player?: PlayerClient }

function result(outcome: string, value: object): CallToolResult {
  const data = JSON.parse(JSON.stringify(value)) as Record<string, unknown>
  const structuredContent = { outcome, data }
  return { content: [{ type: 'text', text: JSON.stringify(structuredContent) }], structuredContent,
    isError: !['ok', 'passed', 'matched'].includes(outcome) }
}

async function labResult(run: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try { return await run() }
  catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.startsWith('Runtime source changed since this process started.')) {
      return result('inconclusive', { message: message.slice(0, 800) })
    }
    if (/^(Unknown scenario:|Unknown seed set\.|Unknown variant for |Invalid lab run request\.|Invalid run limits\.|Invalid lab run ID\.|Limit [A-Za-z]+ must be)/.test(message)) {
      return result('invalid', { message: message.slice(0, 800) })
    }
    const code = (error as { code?: unknown } | null)?.code
    if (code === 'ENOENT') return result('unavailable', { message: 'The saved run is not available under the configured artifact root. Use a runId returned by lab_run in this environment.' })
    if (['EACCES', 'EPERM', 'ENOSPC', 'EROFS'].includes(String(code))) {
      return result('unavailable', { message: 'The lab could not access or save its artifact files. Check the configured artifact root and available disk space.' })
    }
    if (error instanceof SyntaxError || /^(Invalid or excessive lab report|Invalid lab report shape|Lab artifact exceeds|Lab run directory must|Lab report must)/.test(message)) {
      return result('unavailable', { message: 'The saved artifact is invalid, oversized, or outside its run directory. Restore the original artifact or run the scenario again.' })
    }
    return result('failed', { message: 'The lab operation failed unexpectedly. Check the local runner and source compatibility; this request did not establish an experiment result.' })
  }
}

/** Local adapters only. No fixture, clock or administrative routes are added to the player server. */
export function createMcpServer(options: McpOptions = {}): McpServer {
  const profile = options.profile ?? 'all'
  if (!['all', 'player', 'lab'].includes(profile)) throw new Error('Choose MCP profile all, player or lab.')
  const player = options.player ?? playerClientFromEnv()
  const server = new McpServer({ name: 'idle-buds', version: '1.0.0' }, { maxToolInputElements: 1000 })
  if (profile !== 'lab') {
    server.registerTool('player_observe', {
      description: 'Observe the configured account using the normal game API. The player section reconciles progress and counts as a foreground check-in. Use lab reports for passive experimental inspection.',
      inputSchema: playerObserveSchema, outputSchema: toolOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    }, async ({ sections }) => { const response = await player.observe(sections); return result(response.status, response) })
    server.registerTool('player_act', {
      description: 'Submit one normal player command. Reuse the exact commandId and payload after unknown completion. A new intentional action requires a new UUID. Server rules, account ownership and receipts remain authoritative.',
      inputSchema: playerActSchema, outputSchema: toolOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    }, async ({ commandId, command }) => { const response = await player.act(commandId, command as PlayerCommand); return result(response.status, response) })
  }
  if (profile !== 'player') {
    server.registerResource('scenario-catalog', 'idle-buds://lab/scenarios', {
      description: 'Registered synthetic scenarios, variants, default limits and seed sets. Experiments do not establish human enjoyment or device qualification.', mimeType: 'application/json',
    }, async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify({
      seedSets: listSeedSets(), scenarios: SCENARIOS.map(({ create: _create, run: _run, ...definition }) => definition),
    }) }] }))
    server.registerTool('lab_run', {
      description: 'Run a named bounded scenario against shared game rules and save an individual JSON report, trace and Markdown summary. Limits may only tighten scenario defaults. Returns a compact summary, not private snapshots.',
      inputSchema: runSchema, outputSchema: toolOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    }, async (request, extra) => labResult(async () => {
      const report = await runScenario(request, { artifactRoot: options.artifactRoot, signal: extra.signal })
      return result(report.status, summarizeReport(report))
    }))
    server.registerTool('lab_report', {
      description: 'Read a saved lab report without advancing game time, modifying player activity, or exposing private replay snapshots. Select summary, aggregate metrics, failures, or provenance manifest.',
      inputSchema: reportSchema, outputSchema: toolOutputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    }, async ({ runId, section = 'summary' }) => labResult(async () => {
      const report = await readReport(runId, { artifactRoot: options.artifactRoot })
      const data = section === 'summary' ? summarizeReport(report)
        : section === 'manifest' ? { runId: report.runId, provenance: report.provenance }
        : section === 'metrics' ? { runId: report.runId, metrics: report.metrics }
        : { runId: report.runId, failedOrIncompleteCases: report.cases.filter((entry) => entry.status !== 'passed').length,
          cases: report.cases.filter((entry) => entry.status !== 'passed').slice(0, 20).map((entry) => ({
          seed: entry.seed, status: entry.status, error: entry.error,
          failedAssertions: entry.assertions.filter((assertion) => !assertion.passed).length,
          assertions: entry.assertions.filter((assertion) => !assertion.passed).slice(0, 20),
        })) }
      return result('ok', data)
    }))
    server.registerTool('lab_replay', {
      description: 'Reproduce a saved synthetic run using matching source and recorded inputs. Reports matched, the first divergence, or inconclusive when source identity differs.',
      inputSchema: replaySchema, outputSchema: toolOutputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    }, async ({ runId }, extra) => labResult(async () => {
      const replay = await replayRun(runId, { artifactRoot: options.artifactRoot, signal: extra.signal })
      return result(replay.status, replay)
    }))
  }
  return server
}

async function main() {
  const profile = process.env.IDLE_BUDS_MCP_PROFILE ?? 'all'
  if (!['all', 'player', 'lab'].includes(profile)) throw new Error('Invalid MCP profile.')
  const server = createMcpServer({ profile: profile as McpProfile, artifactRoot: process.env.IDLE_BUDS_LAB_ARTIFACT_ROOT })
  await server.connect(new StdioServerTransport())
  process.once('SIGINT', () => { void server.close() })
  process.once('SIGTERM', () => { void server.close() })
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => { console.error('Idle Buds MCP could not start. Check the local configuration.'); process.exitCode = 1 })
}
