import { pathToFileURL } from 'node:url'
import { validateContent } from './lab/content.ts'
import { compareRuns, listSeedSets, readReport, replayRun, runScenario, summarizeReport } from './lab/runner.ts'
import { SCENARIOS } from './lab/scenarios.ts'
import type { RunLimits, RunRequest } from './lab/types.ts'

const HELP = `Idle Buds experiment lab

  npm run lab -- list
  npm run lab -- smoke
  npm run lab -- run production-recovery --seeds baseline --variant daily
  npm run lab -- run policy-progression --variant producer
  npm run lab -- report <run-id>
  npm run lab -- replay <run-id>
  npm run lab -- compare <baseline-run-id> <candidate-run-id>
  npm run lab -- content

Run options: --seeds smoke|baseline|holdout, --variant <registered-variant>
Tighten a run: --max-actions N --max-events N --max-simulated-ms N --max-wall-ms N
All output is JSON. Run/report return concise evidence; raw traces remain in artifacts.
Artifact root: IDLE_BUDS_LAB_ARTIFACT_ROOT (default .repo-local/lab/runs).
Status exit codes: 0 passed, 1 failed/incomplete, 2 invalid command.
MCP clients should launch node tools/mcp.ts directly to keep stdout protocol-only.
`

function parseRun(args: string[]): RunRequest {
  const scenarioId = args.shift()
  if (!scenarioId || scenarioId.startsWith('--')) throw new Error('Specify a scenario ID. Use npm run lab -- list.')
  const request: RunRequest = { scenarioId }
  const seen = new Set<string>()
  const limitNames: Record<string, keyof RunLimits> = {
    '--max-actions': 'maxActions', '--max-events': 'maxEvents',
    '--max-simulated-ms': 'maxSimulatedMs', '--max-wall-ms': 'maxWallMs',
  }
  while (args.length) {
    const flag = args.shift()!
    const value = args.shift()
    if (!value || seen.has(flag)) throw new Error(`Missing value or repeated option: ${flag}`)
    seen.add(flag)
    if (flag === '--seeds') request.seedSetId = value
    else if (flag === '--variant') request.variant = value
    else if (Object.hasOwn(limitNames, flag)) {
      if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error(`Expected a positive integer for ${flag}.`)
      request.limits ??= {}
      request.limits[limitNames[flag]] = Number(value)
    } else throw new Error(`Unknown option: ${flag}`)
  }
  return request
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const [operation, ...args] = argv
  const artifactRoot = process.env.IDLE_BUDS_LAB_ARTIFACT_ROOT
  const options = { artifactRoot }
  const print = (value: unknown) => console.log(JSON.stringify(value, null, 2))
  if (!operation || operation === 'help' || operation === '--help') { console.log(HELP); return 0 }
  try {
    if (operation === 'list' && args.length === 0) {
      print({ scenarios: SCENARIOS.map(({ create: _create, run: _run, ...metadata }) => metadata), seedSets: listSeedSets() })
      return 0
    }
    if (operation === 'content' && args.length === 0) {
      const result = validateContent()
      print(result)
      return result.status === 'passed' ? 0 : 1
    }
    if (operation === 'run') {
      const result = await runScenario(parseRun(args), options)
      print(summarizeReport(result))
      return result.status === 'passed' ? 0 : 1
    }
    if (operation === 'smoke' && args.length === 0) {
      let passed = true
      for (const scenarioId of ['production-recovery', 'inventory-recovery', 'activity-replacement', 'offline-return']) {
        const report = await runScenario({ scenarioId, seedSetId: 'smoke' }, options)
        print(summarizeReport(report))
        passed &&= report.status === 'passed'
      }
      return passed ? 0 : 1
    }
    if (operation === 'report' && args.length === 1) {
      const report = await readReport(args[0], options)
      print(summarizeReport(report))
      return report.status === 'passed' ? 0 : 1
    }
    if (operation === 'replay' && args.length === 1) {
      const report = await replayRun(args[0], options)
      print(report)
      return report.status === 'matched' ? 0 : 1
    }
    if (operation === 'compare' && args.length === 2) {
      const report = await compareRuns(args[0], args[1], options)
      print(report)
      return report.comparable ? 0 : 1
    }
    throw new Error('Unknown command or argument count. Use npm run lab -- help.')
  } catch (error) {
    console.error(JSON.stringify({ status: 'invalid_request', message: error instanceof Error ? error.message : 'Lab request failed.' }))
    return 2
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await main()
