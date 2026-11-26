import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { PoolClient } from 'pg'
import { createPlayer } from '../src/game/index.ts'
import { object, USERNAME } from './commands.ts'
import { requireRule } from './errors.ts'

export const COOKIE_NAME = 'idle_buds_session'
const SESSION_SECONDS = 14 * 24 * 60 * 60
export const PASSWORD_ROUNDS = 12

interface Account {
  id: string
  username: string
}

const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const tokenHash = (request: FastifyRequest) => {
  const token = request.cookies[COOKIE_NAME]
  return token && /^[0-9A-Za-z_-]{43}$/.test(token) ? hash(token) : null
}

export function credentials(body: unknown) {
  const values = object(body, ['username', 'password', 'invite'])
  requireRule(typeof values.username === 'string' && typeof values.password === 'string', 'Enter a username and password.', 400)
  const username = values.username.trim().toLowerCase()
  const password = values.password
  requireRule(USERNAME.test(username), 'Use 3–24 letters, numbers or underscores for your username.', 400)
  requireRule([...password].length >= 12 && Buffer.byteLength(password) <= 72 && !password.includes('\0'),
    'Use a password with at least 12 characters and at most 72 UTF-8 bytes.', 400)
  requireRule(values.invite === undefined || (typeof values.invite === 'string' && values.invite.length <= 256),
    'Enter a valid invite.', 400)
  return { username, password, invite: values.invite }
}

export function validateInvite(requiredCode: string | undefined, suppliedCode: string | undefined) {
  if (!requiredCode) return
  requireRule(suppliedCode && timingSafeEqual(Buffer.from(hash(requiredCode), 'hex'), Buffer.from(hash(suppliedCode), 'hex')),
    'A valid playtest invite is required.', 403)
}

export async function registerAccount(db: PoolClient, username: string, passwordHash: string, now: number): Promise<Account> {
  const { rows: [account] } = await db.query<Account>(
    'INSERT INTO accounts (id, username, password_hash) VALUES ($1,$2,$3) ON CONFLICT (username) DO NOTHING RETURNING id, username',
    [randomUUID(), username, passwordHash],
  )
  requireRule(account, 'That username is already taken.')
  const state = createPlayer(username, now, randomBytes(24).toString('hex'))
  await db.query('INSERT INTO players (account_id, state) VALUES ($1,$2)', [account.id, state])
  return account
}

export async function authenticate(
  db: PoolClient, user: { username: string; password: string }, dummyHash: string,
): Promise<Account> {
  const { rows: [account] } = await db.query<Account & { password_hash: string }>(
    'SELECT id, username, password_hash FROM accounts WHERE username = $1 AND banned_at IS NULL FOR SHARE', [user.username],
  )
  const valid = await bcrypt.compare(user.password, account?.password_hash ?? dummyHash)
  requireRule(account && valid, 'Username or password is incorrect.', 401)
  return { id: account.id, username: account.username }
}

export async function sessionAccount(db: PoolClient, request: FastifyRequest, lock = true): Promise<Account> {
  const digest = tokenHash(request)
  requireRule(digest, 'Sign in to continue.', 401)
  const { rows: [account] } = await db.query<Account>(
    `SELECT a.id, a.username FROM sessions s JOIN accounts a ON a.id = s.account_id
      WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND a.banned_at IS NULL
        AND s.generation = a.session_generation ${lock ? 'FOR SHARE OF a, s' : ''}`,
    [digest],
  )
  requireRule(account, 'Your session has expired. Sign in to continue.', 401)
  return account
}

export async function newSession(db: PoolClient, id: string, request: FastifyRequest) {
  await revokeSession(db, request)
  const token = randomBytes(32).toString('base64url')
  await db.query(
    `INSERT INTO sessions (token_hash, account_id, expires_at, generation)
      SELECT $1, id, now() + $3 * interval '1 second', session_generation FROM accounts WHERE id = $2`,
    [hash(token), id, SESSION_SECONDS],
  )
  return token
}

export function sessionCookie(reply: FastifyReply, token: string, secure: boolean) {
  reply.setCookie(COOKIE_NAME, token, { path: '/', maxAge: SESSION_SECONDS, httpOnly: true, sameSite: 'strict', secure })
}

export async function revokeSession(db: PoolClient, request: FastifyRequest) {
  const digest = tokenHash(request)
  if (digest) await db.query('UPDATE sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL', [digest])
}
