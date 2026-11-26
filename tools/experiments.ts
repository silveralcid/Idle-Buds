import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import { writeFile, mkdir } from 'node:fs/promises'
import { advance, applyCommand, buildFormation, createPlayer, MAX_BATTLE_ROUNDS, resolveBattle } from '../src/game/index.ts'
import { NODES, SPECIES } from '../src/data/catalog.ts'
import { addBud, rollGenetics } from '../src/game/breeding.ts'
import { sourceFor } from '../src/game/random.ts'
import type { ActivityOrder, BattleResult, BattleTeam, GameState, Gear } from '../src/game/types.ts'
import { progressedFixture } from './fixtures.ts'
import { runScenario } from './lab/runner.ts'

// Bounded original-content baselines, using the exact game code run by the server.
// These synthetic observations do not establish human enjoyment or live balance.
function finish(state: GameState, order: ActivityOrder): GameState {
  let next = applyCommand(state, { type: 'startActivity', order }, state.lastAt).state
  for (let events = 0; next.activities.tender.nextAt !== null; events += 1) {
    assert.ok(events < 10_000, 'Finite experiment order exceeded its event budget')
    next = advance(next, next.activities.tender.nextAt!).state
  }
  return next
}

function onboarding() {
  const outcomes = []
  for (let seed = 0; seed < 100; seed += 1) {
    let state = createPlayer('experiment', 0, `onboarding-${seed}`)
    let attempts = 0
    while (!state.buds.length && attempts < 8) {
      state = finish(state, { kind: 'gather', nodeId: 'earth-scrap', count: 3 })
      state = finish(state, { kind: 'craft', recipeId: 'capture-kit', count: 1 })
      state = finish(state, { kind: 'battle', zoneId: 'earth', count: 1 })
      attempts += 1
    }
    const caughtAt = state.buds.length ? state.lastAt : null
    if (state.buds.length) {
      const bud = state.buds[0]
      const nodeId = Object.keys(NODES).find(id => NODES[id].zoneId === 'earth' && SPECIES[bud.speciesId].aptitudes.includes(NODES[id].skill))!
      const tenderXp = structuredClone(state.xp)
      state = applyCommand(state, { type: 'startActivity', workerId: bud.id, order: { kind: 'gather', nodeId, count: 5 } }, state.lastAt).state
      state = advance(state, state.lastAt + 30_000).state
      assert.ok(state.buds[0].xp > 0)
      assert.deepEqual(state.xp, tenderXp, 'Bud labor must not train Tender skills')
    }
    outcomes.push({ seed, attempts, caughtAt, worked: state.buds[0]?.xp > 0 })
  }
  const times = outcomes.flatMap(row => row.caughtAt === null ? [] : [row.caughtAt]).sort((a, b) => a - b)
  return {
    runs: 100, succeeded: times.length,
    medianSeconds: times[Math.floor(times.length / 2)] / 1000,
    p90Seconds: times[Math.ceil(times.length * 0.9) - 1] / 1000,
    maximumSeconds: times.at(-1)! / 1000,
    outcomes,
  }
}

function offline() {
  const times = [0, 1, 3999, 4000, 4001, 300_000, 3_600_000, 86_400_000]
  const rows = []
  let state = createPlayer('offline_lab', 0, 'offline-experiment')
  state = applyCommand(state, { type: 'startActivity', order: { kind: 'gather', nodeId: 'earth-scrap' } }, 0).state
  for (const elapsed of times) {
    const one = advance(state, elapsed).state
    let partitioned = structuredClone(state)
    for (const time of [...new Set([Math.floor(elapsed / 3), Math.floor(elapsed * 2 / 3), elapsed])]) {
      partitioned = advance(partitioned, time).state
    }
    assert.deepEqual(partitioned, one)
    assert.deepEqual(advance(one, elapsed).state, one)
    rows.push({ elapsedMs: elapsed, partitionEquivalent: true, repeatSafe: true })
  }
  const capped = advance(state, 172_800_000)
  assert.equal(capped.summary.simulatedMs, 86_400_000)
  assert.equal(capped.summary.discardedMs, 86_400_000)
  return { rows, overCapDiscardedMs: capped.summary.discardedMs }
}

// Diagnostic from the ranked matcher. This controls snapshot strength in the
// fixtures, without assigning a market price to a crafted roll or active Bud.
function teamStrength(team: BattleTeam) {
  return [...team.buds, team.commander].reduce((sum, unit) => sum + 2 * unit.attack + unit.health, 0)
}

function combatFixture(name: string, roster: { speciesId: string; attack: number; health: number }[], equipment: Gear[]) {
  let state = progressedFixture(name, 0)
  state.buds = []
  state.formation = []
  state.equipment = equipment
  for (const { speciesId, attack, health } of roster) {
    addBud(state, speciesId, { sex: 'Female', trait: 'Diligent', ivs: { attack, health, gather: 0, craft: 0 } })
  }
  for (const gear of equipment) state = applyCommand(state, { type: 'equip', slot: gear.slot, gearId: gear.id }, 0).state
  state = applyCommand(state, { type: 'setFormation', budIds: state.buds.map(({ id }) => id) }, 0).state
  assert.equal(state.buds.length + state.equipment.length, 3)
  return buildFormation(state)
}

function relativeWinner(result: BattleResult, swap: boolean) {
  if (result.winner === 'draw') return 'draws'
  return (result.winner === 'left') !== swap ? 'wins' : 'losses'
}

function checkedBattle(left: BattleTeam, right: BattleTeam, seed: string, effects = true) {
  const result = resolveBattle(left, right, seed, { effects })
  assert.ok(result.rounds <= MAX_BATTLE_ROUNDS)
  assert.deepEqual(resolveBattle(left, right, seed, { effects }), result)
  return result
}

function combat() {
  const weapon: Gear = { id: 'lab-weapon', definitionId: 'tide-resonator', slot: 'weapon', bonus: 5, technique: 'Strike' }
  const armor: Gear = { id: 'lab-armor', definitionId: 'fiber-vest', slot: 'armor', bonus: 5, technique: 'Guard' }
  const styles = {
    'Tender-led': combatFixture('tender_lab', [{ speciesId: 'breakwater', attack: 0, health: 0 }], [weapon, armor]),
    'Bud-led': combatFixture('bud_lab', [
      { speciesId: 'spriglet', attack: 0, health: 0 }, { speciesId: 'whispermoth', attack: 0, health: 3 },
      { speciesId: 'coilbit', attack: 5, health: 0 },
    ], []),
    Hybrid: combatFixture('hybrid_lab', [
      { speciesId: 'coilbit', attack: 0, health: 3 }, { speciesId: 'pebbleback', attack: 0, health: 6 },
    ], [weapon]),
  }
  const entries = Object.entries(styles)
  const strengths = Object.fromEntries(entries.map(([name, team]) => [name, teamStrength(team)]))
  assert.equal(new Set(Object.values(strengths)).size, 1)
  const rows = []
  for (const [index, [firstStyle, first]] of entries.entries()) {
    for (const [secondStyle, second] of entries.slice(index + 1)) {
      const outcomes = [false, true].map((effects) => ({
        effects, firstOnLeft: { wins: 0, losses: 0, draws: 0 }, firstOnRight: { wins: 0, losses: 0, draws: 0 },
        positionDisagreements: 0, minimumRounds: MAX_BATTLE_ROUNDS, maximumRounds: 0,
      }))
      let outcomeChanges = 0
      for (let index = 0; index < 100; index += 1) {
        const seed = `combat-${index}`
        const paired = outcomes.map((row) => {
          const left = checkedBattle(first, second, seed, row.effects)
          const right = checkedBattle(second, first, seed, row.effects)
          const leftOutcome = relativeWinner(left, false)
          const rightOutcome = relativeWinner(right, true)
          row.firstOnLeft[leftOutcome] += 1
          row.firstOnRight[rightOutcome] += 1
          row.positionDisagreements += Number(leftOutcome !== rightOutcome)
          row.minimumRounds = Math.min(row.minimumRounds, left.rounds, right.rounds)
          row.maximumRounds = Math.max(row.maximumRounds, left.rounds, right.rounds)
          return [leftOutcome, rightOutcome]
        })
        outcomeChanges += paired[0].filter((value, position) => value !== paired[1][position]).length
      }
      rows.push({ firstStyle, secondStyle, pairedSeeds: 100, outcomeChanges, outcomes })
    }
  }
  return {
    note: 'Three prepared styles with three assets each, equal Tender XP and equal ranked strength. Asset acquisition time and market price are uncontrolled. Seeds can change event order while preserving win/loss outcomes. Wins and losses are from the first style’s perspective.',
    disposition: 'Keep the implemented effects as the playtest variant. These pairings qualify replay and position symmetry. Human play and a larger set of compositions are needed for a balance decision.',
    strengths, rows,
  }
}

function breeding() {
  const state = progressedFixture('breeding_lab', 0)
  const [primary, secondary] = state.buds
  primary.ivs = { attack: 0, health: 0, gather: 0, craft: 0 }
  secondary.ivs = { attack: 10, health: 10, gather: 10, craft: 10 }
  const rows = []
  for (const enhanced of [false, true]) {
    const outcomes = { primaryValue: 0, secondaryValue: 0, otherValue: 0, mixedSpecimens: 0 }
    for (let seed = 0; seed < 1000; seed += 1) {
      const genes = rollGenetics(SPECIES[primary.speciesId], sourceFor(`hatch-${seed}`, 'inheritance'), { primary, secondary, enhanced })
      const values = Object.values(genes.ivs)
      assert.ok(values.every(value => Number.isInteger(value) && value >= 0 && value <= 10))
      if (new Set(values).size > 1) outcomes.mixedSpecimens += 1
      for (const value of values) outcomes[value === 0 ? 'primaryValue' : value === 10 ? 'secondaryValue' : 'otherValue'] += 1
    }
    rows.push({ enhanced, hatches: 1000, ivRolls: 4000, ...outcomes })
  }
  return { note: 'Random IVs can equal either parent; these are observed values, not latent inheritance branch counts.', rows }
}

async function production() {
  const rows = []
  for (const variant of ['daily', 'frequent', 'paused']) {
    const report = await runScenario({ scenarioId: 'production-recovery', variant, seedSetId: 'baseline' })
    assert.equal(report.status, 'passed', `Production qualification failed: ${report.runId}`)
    rows.push({ variant, runId: report.runId, status: report.status, metrics: report.metrics,
      gameplayDigest: report.gameplayDigest, artifacts: report.artifacts })
  }
  return {
    note: 'Current shared-slot inventory and unlimited item stacks; independent mining and crafting Buds, Tender free. Identical fixture and five seeds per variant over 24 simulated hours. Daily and frequent returns never stop blocked work. Paused is a deliberate-pause control. Full run provenance, traces and reports are retained by the lab.',
    disposition: 'This qualifies automatic recovery and deliberate pause. It does not establish long-term progression balance, market value or human enjoyment. Use lab policy-progression for explicit public-state policies; do not reuse historical per-item-cap production figures as current economics.',
    rows,
  }
}

function rankedCoverage() {
  const formationCount = 100
  const snapshots = Array.from({ length: formationCount }, (_, index) => {
    const random = sourceFor('ranked-lab', 'formation', index)
    const state = progressedFixture(`ranked_${index}`, 0)
    const roster = [...state.buds]
    for (let position = roster.length - 1; position > 0; position -= 1) {
      const selected = Math.floor(random() * (position + 1))
      const bud = roster[position]
      roster[position] = roster[selected]
      roster[selected] = bud
    }
    const budIds = roster.slice(0, 1 + Math.floor(random() * 5)).map(({ id }) => id)
    const commander = applyCommand(state, { type: 'setFormation', budIds }, 0).state
    const team = buildFormation(commander)
    const progression = 1 + index % 3
    const rating = index === formationCount - 1 ? 2_000 : 850 + Math.floor(random() * 301)
    return { index, team, strength: teamStrength(team), progression, rating }
  })

  const strengthBySlots = Object.fromEntries([1, 2, 3, 4, 5].map((size) => {
    const strengths = snapshots.filter(({ team }) => team.buds.length === size).map(({ strength }) => strength)
    return [size, { count: strengths.length, min: Math.min(...strengths), max: Math.max(...strengths) }]
  }))
  let matched = 0
  let minimumRatio = 1
  let fewestCandidates = formationCount
  let mostCandidates = 0
  let positionDisagreements = 0
  const results = { wins: 0, losses: 0, draws: 0 }
  const noMatch = []
  for (const challenger of snapshots) {
    // Same static bands as the server. Real matchmaking also checks blocks,
    // rematch intervals and defenses in the real PostgreSQL integration suite.
    const candidates = snapshots.filter((opponent) => opponent.index !== challenger.index
      && opponent.progression === challenger.progression
      && Math.abs(opponent.rating - challenger.rating) <= 200
      && opponent.strength >= Math.ceil(challenger.strength * 0.65)
      && opponent.strength <= Math.floor(challenger.strength / 0.65))
      .sort((a, b) => Math.abs(a.rating - challenger.rating) - Math.abs(b.rating - challenger.rating) || a.index - b.index)
    fewestCandidates = Math.min(fewestCandidates, candidates.length)
    mostCandidates = Math.max(mostCandidates, candidates.length)
    if (!candidates.length) {
      noMatch.push({ index: challenger.index, rating: challenger.rating, progression: challenger.progression, strength: challenger.strength })
      continue
    }
    const selection = sourceFor('ranked-lab', 'selection', challenger.index)
    const opponent = candidates[Math.floor(selection() * Math.min(candidates.length, 12))]
    const ratio = Math.min(challenger.strength, opponent.strength) / Math.max(challenger.strength, opponent.strength)
    minimumRatio = Math.min(minimumRatio, ratio)
    assert.ok(ratio >= 0.65)
    const seed = `ranked-${challenger.index}`
    const left = relativeWinner(checkedBattle(challenger.team, opponent.team, seed), false)
    const right = relativeWinner(checkedBattle(opponent.team, challenger.team, seed), true)
    results[left] += 1
    positionDisagreements += Number(left !== right)
    matched += 1
  }
  return {
    note: 'Seeded snapshot sampling checks formation strength coverage and replay using shipped battle rules. The harness applies static ranked bands. Production opponent selection remains server-owned.',
    disposition: 'Exercise rated matching during the internal playtest. A varied synthetic denominator with a known isolation case establishes coverage for this fixture only.',
    snapshots: formationCount, matched, noMatch, strengthBySlots, fewestCandidates, mostCandidates,
    smallestSelectedStrengthRatio: Number(minimumRatio.toFixed(3)), positionDisagreements, results,
  }
}

const started = performance.now()
const results = {
  rulesVersion: 1, onboarding: onboarding(), offline: offline(), combat: combat(), breeding: breeding(),
  production: await production(), rankedCoverage: rankedCoverage(),
}
await mkdir('.repo-local', { recursive: true })
await writeFile('.repo-local/experiments.json', JSON.stringify({ ...results, runtimeMs: performance.now() - started }, null, 2) + '\n')
console.log(JSON.stringify({
  onboarding: { ...results.onboarding, outcomes: undefined },
  offline: results.offline, combat: results.combat, breeding: results.breeding, production: results.production,
  rankedCoverage: results.rankedCoverage,
  runtimeMs: Math.round(performance.now() - started),
}, null, 2))
