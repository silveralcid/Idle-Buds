import { decodeCommand } from '../server/commands.ts'
import type { WorldCommand, WorldView } from '../server/world-types.ts'
import type { AdvanceSummary, GameCommand, PlayerView } from '../src/game/types.ts'

export type PlayerCommand = GameCommand | WorldCommand
export interface PlayerStateResponse { username: string; state: PlayerView; summary?: AdvanceSummary; message?: string }
export interface PlayerObservation { player?: PlayerStateResponse; world?: WorldView }
export interface PlayerResult<T> {
  status: 'ok' | 'rejected' | 'invalid' | 'not_configured' | 'unavailable' | 'unknown'
  message: string
  httpStatus: number | null
  commandId?: string
  data?: T
}
export interface PlayerClientOptions {
  baseUrl?: string
  username?: string
  password?: string
  session?: string
  timeoutMs?: number
}

const SESSION = /^[0-9A-Za-z_-]{43}$/
const COOKIE = 'idle_buds_session'
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024
function failure<T>(status: PlayerResult<T>['status'], message: string, httpStatus: number | null = null): PlayerResult<T> {
  return { status, message, httpStatus }
}
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value) }

/** An account-scoped HTTP adapter. It never calculates rewards or mutates player rows directly. */
export class PlayerClient {
  #options: PlayerClientOptions
  #origin?: string
  #session?: string
  #configurationError?: string
  #login?: Promise<PlayerResult<never>>

  constructor(options: PlayerClientOptions = {}) {
    this.#options = { ...options, timeoutMs: options.timeoutMs ?? 10_000 }
    if (options.baseUrl) {
      try {
        const url = new URL(options.baseUrl)
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error()
        this.#origin = url.origin
      } catch { this.#configurationError = 'IDLE_BUDS_API_URL must be an HTTP(S) origin without a path, credentials, query or fragment.' }
    }
    if (options.session) {
      if (SESSION.test(options.session)) this.#session = options.session
      else this.#configurationError = 'IDLE_BUDS_SESSION must be a valid account session token.'
    }
    if (!Number.isSafeInteger(this.#options.timeoutMs) || this.#options.timeoutMs! < 100 || this.#options.timeoutMs! > 30_000) {
      this.#configurationError = 'Player API timeout must be between 100 and 30000 milliseconds.'
    }
  }

  async #request(path: 'login' | 'state' | 'world' | 'command', body?: unknown): Promise<{ response: Response; data: unknown }> {
    const response = await fetch(`${this.#origin}/api/${path}`, {
      method: body === undefined ? 'GET' : 'POST', redirect: 'error',
      headers: { origin: this.#origin!, ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(this.#session ? { cookie: `${COOKIE}=${this.#session}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(this.#options.timeoutMs!),
    })
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Invalid API response.')
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Empty API response.')
    const chunks: Uint8Array[] = []
    let size = 0
    try {
      for (;;) {
        const next = await reader.read()
        if (next.done) break
        size += next.value.byteLength
        if (size > MAX_RESPONSE_BYTES) throw new Error('API response limit exceeded.')
        chunks.push(next.value)
      }
    } catch (error) { await reader.cancel().catch(() => {}); throw error }
    finally { reader.releaseLock() }
    return { response, data: JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown }
  }

  async #authenticate(): Promise<PlayerResult<never>> {
    if (this.#configurationError) return failure('not_configured', this.#configurationError)
    if (!this.#origin || (!this.#session && (!this.#options.username || !this.#options.password))) {
      return failure('not_configured', 'Set IDLE_BUDS_API_URL and IDLE_BUDS_USERNAME/IDLE_BUDS_PASSWORD, or IDLE_BUDS_SESSION, for the intended account.')
    }
    if (this.#session) return { status: 'ok', message: 'Session configured.', httpStatus: null }
    if (!this.#login) this.#login = this.#signIn()
    try { return await this.#login } finally { this.#login = undefined }
  }

  async #signIn(): Promise<PlayerResult<never>> {
    try {
      const { response } = await this.#request('login', { username: this.#options.username, password: this.#options.password })
      if (!response.ok) return failure('rejected', 'Account login was rejected. Check credentials and server configuration.', response.status)
      const entry = response.headers.getSetCookie().find((value) => value.startsWith(`${COOKIE}=`))
      const token = entry?.slice(COOKIE.length + 1).split(';')[0]
      if (!token || !SESSION.test(token)) return failure('unavailable', 'The server did not provide a valid account session.', response.status)
      this.#session = token
      return { status: 'ok', message: 'Signed in.', httpStatus: response.status }
    } catch { return failure('unavailable', 'Could not complete account login. No player command was submitted.') }
  }

  async observe(sections: readonly ('player' | 'world')[] = ['player']): Promise<PlayerResult<PlayerObservation>> {
    const auth = await this.#authenticate()
    if (auth.status !== 'ok') return auth
    const observed: PlayerObservation = {}
    try {
      for (const section of new Set(sections)) {
        const { response, data } = await this.#request(section === 'player' ? 'state' : 'world')
        if (!response.ok) return failure('rejected', apiMessage(data, 'The server rejected the observation.'), response.status)
        if (section === 'player') {
          if (!record(data) || typeof data.username !== 'string' || !record(data.state)) throw new Error('Invalid player response.')
          // Keep the current public boundary even if a future server accidentally includes a private field.
          for (const hidden of ['seed', 'rngCounter', 'nextId', 'eggGenetics']) delete data.state[hidden]
          observed.player = data as unknown as PlayerStateResponse
        } else {
          if (!record(data) || !Array.isArray(data.listings)) throw new Error('Invalid world response.')
          observed.world = data as unknown as WorldView
        }
      }
      return { status: 'ok', message: sections.includes('player') ? 'Player state reconciled as a foreground check-in.' : 'World observed.', httpStatus: 200, data: observed }
    } catch { return { ...failure<PlayerObservation>('unavailable', 'Observation did not complete. A requested player check-in may already have reconciled progress.'), ...(Object.keys(observed).length ? { data: observed } : {}) } }
  }

  async act(commandId: string, command: PlayerCommand): Promise<PlayerResult<PlayerStateResponse>> {
    let decoded: ReturnType<typeof decodeCommand>
    try { decoded = decodeCommand({ id: commandId, command }) }
    catch { return { ...failure<PlayerStateResponse>('invalid', 'Invalid command UUID, command type, fields or arguments. Nothing was submitted.'), commandId } }
    const auth = await this.#authenticate()
    if (auth.status !== 'ok') return { ...auth, commandId: decoded.id }
    try {
      const { response, data } = await this.#request('command', decoded)
      const message = apiMessage(data, response.ok ? 'Command completed.' : 'The server rejected the command.')
      const state = record(data) && typeof data.username === 'string' && record(data.state) ? data : undefined
      if (state && record(state.state)) for (const hidden of ['seed', 'rngCounter', 'nextId', 'eggGenetics']) delete state.state[hidden]
      if (response.ok && !state) throw new Error('Invalid command receipt.')
      return { status: response.ok ? 'ok' : response.status >= 500 ? 'unknown' : 'rejected', message, httpStatus: response.status,
        commandId: decoded.id, ...(state ? { data: state as unknown as PlayerStateResponse } : {}) }
    } catch {
      return { ...failure<PlayerStateResponse>('unknown', 'Command completion is unknown. Retry the exact same commandId and payload; do not generate a new ID.'), commandId: decoded.id }
    }
  }
}

function apiMessage(value: unknown, fallback: string): string {
  return record(value) && typeof value.message === 'string' ? value.message.slice(0, 500) : fallback
}

export function playerClientFromEnv(env: NodeJS.ProcessEnv = process.env): PlayerClient {
  return new PlayerClient({ baseUrl: env.IDLE_BUDS_API_URL, username: env.IDLE_BUDS_USERNAME,
    password: env.IDLE_BUDS_PASSWORD, session: env.IDLE_BUDS_SESSION })
}
