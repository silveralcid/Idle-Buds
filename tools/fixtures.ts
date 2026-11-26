import { randomUUID } from 'node:crypto'
import { hash } from 'bcryptjs'
import type { Pool } from 'pg'
import { createPlayer } from '../src/game/index.ts'
import { SPECIES, ITEM_DEFINITIONS, SKILLS } from '../src/data/catalog.ts'
import { addBud, rollGenetics } from '../src/game/breeding.ts'
import { eventRandom } from '../src/game/random.ts'
import type { GameState } from '../src/game/types.ts'
import { assertTestDatabase } from './database-guard.ts'

export const FIXTURE_PASSWORD = 'Local-playtest-only-2026'

export function progressedFixture(name: string, now: number): GameState {
  const state = createPlayer(name, now, `fixture-${name}`)
  for (const skill of SKILLS) state.xp[skill] = 240
  state.coins = 1_000
  state.unlockedZones = ['earth', 'glassreach', 'hollowtide']
  state.discoveries = ['tide-resonator']
  state.upgrades = { tool: 1, worker: 2, storage: 1, remote: 1 }
  state.inventory = Object.fromEntries(Object.keys(ITEM_DEFINITIONS).map(id => [id, 30]))
  state.stats.catches = 6
  state.stats.gathered = 100
  state.stats.crafted = 20
  state.stats.battles = 30
  state.stats.wins = 30
  state.stats.zoneWins = { earth: 10, glassreach: 10, hollowtide: 10 }
  for (const id of ['pebbleback', 'coilbit', 'spriglet', 'tinwhisker', 'shardram', 'kelpkeeper']) {
    addBud(state, id, rollGenetics(SPECIES[id], eventRandom(state, `fixture-${id}`)))
  }
  // The first two are a compatible pair for testing primary-parent inheritance.
  state.buds[0].sex = 'Female'
  state.buds[1].sex = 'Male'
  state.formation = [state.buds[2].id, state.buds[3].id]
  return state
}

export async function seedPlaytest(pool: Pool, databaseUrl: string, reset = false) {
  assertTestDatabase(databaseUrl)
  const client = await pool.connect()
  try {
    const target = await client.query('SELECT current_database() AS name, host(inet_server_addr()) AS address')
    if (target.rows[0].name !== 'idle_buds_test' || !['127.0.0.1', '::1'].includes(target.rows[0].address)) {
      throw new Error('Connected database is not the expected loopback idle_buds_test target')
    }
    await client.query('BEGIN')
    if (reset) await client.query('TRUNCATE accounts, clans, store_stock CASCADE')
    const passwordHash = await hash(FIXTURE_PASSWORD, 12)
    for (const username of ['alpha', 'beta', 'fresh']) {
      const id = randomUUID()
      const inserted = await client.query(
        'INSERT INTO accounts(id,username,password_hash) VALUES($1,$2,$3) ON CONFLICT(username) DO NOTHING RETURNING id',
        [id, username, passwordHash],
      )
      if (inserted.rowCount) {
        const state = username === 'fresh' ? createPlayer(username, Date.now(), `fixture-${username}`)
          : progressedFixture(username, Date.now())
        await client.query('INSERT INTO players(account_id,state) VALUES($1,$2)', [id, state])
      }
    }
    await client.query('COMMIT')
  } catch (error) { await client.query('ROLLBACK'); throw error }
  finally { client.release() }
  console.log(`Local disposable fixture accounts: alpha, beta, fresh. Password: ${FIXTURE_PASSWORD}`)
  console.log('Existing fixture progress is preserved unless --reset is explicitly supplied.')
}
