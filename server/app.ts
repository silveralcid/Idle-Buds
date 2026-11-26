import { createHash, randomBytes } from 'node:crypto'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import staticFiles from '@fastify/static'
import bcrypt from 'bcryptjs'
import Fastify, { LogController } from 'fastify'
import type { Pool, PoolClient } from 'pg'
import { applyCommand, publicState, RuleError } from '../src/game/index.ts'
import type { AdvanceSummary, PlayerView } from '../src/game/types.ts'
import {
  authenticate, COOKIE_NAME, credentials, newSession, PASSWORD_ROUNDS, registerAccount,
  revokeSession, sessionAccount, sessionCookie, validateInvite,
} from './auth.ts'
import { decodeCommand, isWorldCommand, object } from './commands.ts'
import { lockRawPlayer, reconcilePlayer, savePlayer, transaction } from './db.ts'
import { ApiError, requireRule } from './errors.ts'
import { isPrivateIPv4, LOOPBACK } from './lan.ts'
import { applyWorldCommand, lockWorld, worldView } from './world.ts'

interface AppOptions {
  pool: Pool
  clock?: () => number
  allowedOrigin?: string | readonly string[]
  inviteCode?: string
  secureCookies?: boolean
  lan?: boolean
  distRoot?: string
  logger?: boolean
}

interface StateResponse {
  username: string
  state: PlayerView
  summary?: AdvanceSummary
  message?: string
}

interface Receipt {
  fingerprint: string
  status_code: number
  response: StateResponse
}

const DEFAULT_ORIGINS = [
  'http://127.0.0.1:3000', 'http://localhost:3000', 'http://[::1]:3000', 'http://127.0.0.1:5173', 'http://localhost:5173',
]

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']'
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return '{' + Object.keys(record).sort().map((key) => JSON.stringify(key) + ':' + stableJson(record[key])).join(',') + '}'
  }
  return JSON.stringify(value)
}

async function playerResponse(db: PoolClient, account: { id: string; username: string }, clock: () => number): Promise<StateResponse> {
  const before = await lockRawPlayer(db, account.id)
  const { state, summary } = reconcilePlayer(before, clock())
  await savePlayer(db, account.id, state, state.lastAt)
  return { username: account.username, state: publicState(state), summary }
}

export async function buildApp(options: AppOptions) {
  const { pool, inviteCode, distRoot, logger = false, clock = Date.now } = options
  const configured = options.allowedOrigin ?? DEFAULT_ORIGINS
  const parsed = (typeof configured === 'string' ? [configured] : configured).map((value) => new URL(value))
  const origins = new Set(parsed.map((origin) => origin.origin))
  const localOnly = parsed.every((origin) => LOOPBACK.has(origin.hostname))
  const secureCookies = options.secureCookies ?? parsed.every((origin) => origin.protocol === 'https:')
  if (!origins.size || parsed.some((origin) => !['http:', 'https:'].includes(origin.protocol)
    || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password)) {
    throw new Error('Configure valid HTTP or HTTPS origins for Idle Buds.')
  }
  if (options.lan && (inviteCode || secureCookies || parsed.some((origin) => origin.protocol !== 'http:'
    || (!LOOPBACK.has(origin.hostname) && !isPrivateIPv4(origin.hostname))))) {
    throw new Error('LAN play requires only exact HTTP loopback/private IPv4 origins, no invite, and HTTP session cookies.')
  }
  if (!options.lan && !localOnly && (!inviteCode || inviteCode.length < 12 || !secureCookies
    || parsed.some((origin) => !LOOPBACK.has(origin.hostname) && origin.protocol !== 'https:'))) {
    throw new Error('Nonlocal playtests require an HTTPS origin, secure cookies and a playtest invite of at least 12 characters.')
  }

  const app = Fastify({ logger, logController: new LogController({ disableRequestLogging: true }), bodyLimit: 16_384, requestTimeout: 30_000 })
  await app.register(cookie)
  await app.register(rateLimit, { global: false })
  const dummyHash = await bcrypt.hash(randomBytes(24).toString('hex'), PASSWORD_ROUNDS)

  app.addHook('onRequest', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff').header('X-Frame-Options', 'DENY')
    if (options.lan) {
      requireRule(LOOPBACK.has(request.ip) || isPrivateIPv4(request.ip), 'LAN play is restricted to private network clients.', 403)
    }
    if (request.url.startsWith('/api/')) {
      reply.header('Cache-Control', 'no-store')
      if (request.method === 'POST') {
        requireRule(request.headers.origin && origins.has(request.headers.origin), 'This request origin is not allowed.', 403)
        const mediaType = request.headers['content-type']?.split(';', 1)[0].trim().toLowerCase()
        requireRule(mediaType === 'application/json', 'Send application/json.', 415)
      }
    }
  })

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) {
      void reply.code(error.statusCode).send({ message: error.message })
      return
    }
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      const message = statusCode === 429 ? 'Too many requests. Try again in a moment.' : 'Invalid request.'
      void reply.code(statusCode).send({ message })
      return
    }
    // Error details may contain private SQL values or user input.
    request.log.error({ name: (error as Error).name, code: (error as { code?: string }).code, requestId: request.id }, 'Idle Buds request failed')
    void reply.code(500).send({ message: 'The server could not complete this request.' })
  })

  const authLimit = { config: { rateLimit: { max: 10, timeWindow: '1 minute', groupId: 'credentials' } } }
  const readLimit = { config: { rateLimit: { max: 240, timeWindow: '1 minute' } } }
  const writeLimit = { config: { rateLimit: { max: 240, timeWindow: '1 minute' } } }

  app.post('/api/register', authLimit, async (request, reply) => {
    const user = credentials(request.body)
    validateInvite(inviteCode, user.invite)
    const passwordHash = await bcrypt.hash(user.password, PASSWORD_ROUNDS)
    const result = await transaction(pool, async (db) => {
      const account = await registerAccount(db, user.username, passwordHash, clock())
      const token = await newSession(db, account.id, request)
      return { token, response: await playerResponse(db, account, clock) }
    })
    sessionCookie(reply, result.token, secureCookies)
    return { ...result.response, message: 'Account created.' }
  })

  app.post('/api/login', authLimit, async (request, reply) => {
    const user = credentials(request.body)
    const result = await transaction(pool, async (db) => {
      const account = await authenticate(db, user, dummyHash)
      const token = await newSession(db, account.id, request)
      return { token, response: await playerResponse(db, account, clock) }
    })
    sessionCookie(reply, result.token, secureCookies)
    return { ...result.response, message: 'Signed in.' }
  })

  app.post('/api/logout', async (request, reply) => {
    object(request.body, [])
    await transaction(pool, (db) => revokeSession(db, request))
    reply.clearCookie(COOKIE_NAME, { path: '/', httpOnly: true, sameSite: 'strict', secure: secureCookies })
    return { message: 'Signed out.' }
  })

  app.get('/api/health', readLimit, async () => {
    await pool.query('SELECT 1')
    return { status: 'ok' }
  })

  app.get('/api/state', readLimit, (request) => transaction(pool, async (db) => {
    const account = await sessionAccount(db, request)
    return playerResponse(db, account, clock)
  }))

  app.get('/api/world', readLimit, (request) => transaction(pool, async (db) => {
    await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const account = await sessionAccount(db, request, false)
    return worldView(db, account.id, clock())
  }))

  app.post('/api/command', writeLimit, async (request, reply) => {
    const { id, command } = decodeCommand(request.body)
    const fingerprint = createHash('sha256').update(stableJson(command)).digest('hex')
    const worldCommand = isWorldCommand(command)
    const result = await transaction(pool, async (db) => {
      const account = await sessionAccount(db, request)
      if (worldCommand) await lockWorld(db)
      const before = await lockRawPlayer(db, account.id)
      const { rows: [receipt] } = await db.query<Receipt>(
        'SELECT fingerprint, status_code, response FROM command_receipts WHERE account_id = $1 AND command_id = $2',
        [account.id, id],
      )
      if (receipt) {
        requireRule(receipt.fingerprint === fingerprint, 'This command ID is already in use.')
        return receipt
      }

      const progressed = reconcilePlayer(before, clock())
      const now = progressed.state.lastAt
      let state = progressed.state
      let message: string
      let statusCode = 200
      await db.query('SAVEPOINT command_effects')
      try {
        if (worldCommand) {
          state = structuredClone(state)
          message = await applyWorldCommand(db, account.id, state, command, now)
        } else {
          ({ state, message } = applyCommand(state, command, now))
        }
      } catch (error) {
        if (!(error instanceof ApiError) && !(error instanceof RuleError)) throw error
        await db.query('ROLLBACK TO SAVEPOINT command_effects')
        state = progressed.state
        statusCode = error instanceof ApiError ? error.statusCode : 409
        message = error.message
      }
      await db.query('RELEASE SAVEPOINT command_effects')
      await savePlayer(db, account.id, state, now)
      const response = { username: account.username, state: publicState(state), summary: progressed.summary, message }
      await db.query(
        `INSERT INTO command_receipts (account_id, command_id, fingerprint, status_code, response)
          VALUES ($1,$2,$3,$4,$5)`, [account.id, id, fingerprint, statusCode, response],
      )
      return { fingerprint, status_code: statusCode, response }
    })
    return reply.code(result.status_code).send(result.response)
  })

  if (distRoot) await app.register(staticFiles, { root: distRoot, index: ['index.html'] })
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ message: 'Page not found.' }))
  return app
}
