import { useCallback, useEffect, useRef, useState } from 'react'
import type { AdvanceSummary, GameCommand, PlayerView } from '../game/types.ts'
import type { WorldCommand, WorldView } from '../../server/world-types.ts'

export type Command = GameCommand | WorldCommand
export type RunCommand = (command: Command) => Promise<boolean>

type GameReply = {
  state: PlayerView
  summary?: AdvanceSummary
  message?: string
}

type PendingCommand = { id: string; command: Command }

type Notice = { text: string; error?: boolean }

class RequestError extends Error {
  status: number
  state?: PlayerView
  summary?: AdvanceSummary

  constructor(status: number, reply: Partial<GameReply> | null) {
    super(reply?.message ?? `Request failed (${status}).`)
    this.status = status
    this.state = reply?.state
    this.summary = reply?.summary
  }
}

async function request<T>(path: string, options: { body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const { body, signal } = options
  const timeout = AbortSignal.timeout(10_000)
  const response = await fetch(`/api/${path}`, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    credentials: 'same-origin',
    ...(body === undefined ? {} : {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => null) as Partial<GameReply> | null
    throw new RequestError(response.status, data)
  }
  return await response.json() as T
}

// randomUUID requires a secure context; getRandomValues also works on LAN HTTP.
function commandId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-')
}

function messageFrom(error: unknown) {
  return error instanceof RequestError ? error.message : 'Could not reach the outpost. Try again in a moment.'
}

export function useGame() {
  const [state, setState] = useState<PlayerView | null>(null)
  const [world, setWorld] = useState<WorldView | null>(null)
  const [summary, setSummary] = useState<AdvanceSummary | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [ready, setReady] = useState(false)
  const [connected, setConnected] = useState(false)
  const [worldUnavailable, setWorldUnavailable] = useState(false)
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState<PendingCommand | null>(null)
  const outstanding = useRef<AbortController | null>(null)
  const write = useRef(false)
  const pending = useRef<PendingCommand | null>(null)
  const signedIn = useRef(false)
  const lastResponseAt = useRef(0)
  const lastServerAt = useRef(0)

  const showSummary = useCallback((report: AdvanceSummary | undefined, returning: boolean) => {
    if (!report || !(report.cycles || report.discardedMs || report.stopped.length || report.eggs)) return
    if (returning || report.simulatedMs >= 5_000 || report.discardedMs > 0) setSummary(report)
  }, [])

  const apply = useCallback((reply: GameReply, returning: boolean) => {
    showSummary(reply.summary, returning || lastResponseAt.current > 0 && performance.now() - lastResponseAt.current >= 5_000)
    signedIn.current = true
    if (reply.state.lastAt >= lastServerAt.current) {
      lastServerAt.current = reply.state.lastAt
      lastResponseAt.current = performance.now()
      setState(reply.state)
    }
    setConnected(true)
  }, [showSummary])

  const clear = useCallback(() => {
    signedIn.current = false
    lastServerAt.current = 0
    lastResponseAt.current = 0
    pending.current = null
    setRetry(null)
    setState(null)
    setWorld(null)
    setSummary(null)
    setConnected(false)
    setWorldUnavailable(false)
  }, [])

  const refresh = useCallback(async (returning = false) => {
    if (outstanding.current || write.current) return
    const controller = new AbortController()
    outstanding.current = controller
    const { signal } = controller
    try {
      const reply = await request<GameReply>('state', { signal })
      if (signal.aborted) return
      apply(reply, returning)
      try {
        const data = await request<WorldView>('world', { signal })
        if (signal.aborted) return
        setWorld(data)
        setWorldUnavailable(false)
      } catch {
        if (!signal.aborted) setWorldUnavailable(true)
      }
    } catch (error) {
      if (signal.aborted) return
      if (error instanceof RequestError && error.status === 401) {
        const expired = signedIn.current
        clear()
        if (expired) setNotice({ text: 'Your session expired. Sign in to continue.', error: true })
      } else {
        setConnected(false)
        if (returning) setNotice({ text: messageFrom(error), error: true })
      }
    } finally {
      if (outstanding.current === controller) outstanding.current = null
      if (!signal.aborted) setReady(true)
    }
  }, [apply, clear])

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(true), 0)
    const reconnect = () => { if (signedIn.current) void refresh(true) }
    const onVisible = () => { if (!document.hidden) reconnect() }
    const interval = window.setInterval(() => {
      if (signedIn.current && !document.hidden) void refresh()
    }, 2000)
    window.addEventListener('online', reconnect)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      outstanding.current?.abort()
      outstanding.current = null
      window.clearTimeout(initial)
      window.clearInterval(interval)
      window.removeEventListener('online', reconnect)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  async function runWrite<T>(operation: () => Promise<T>) {
    write.current = true
    outstanding.current?.abort()
    outstanding.current = null
    setBusy(true)
    setNotice(null)
    try {
      return await operation()
    } finally {
      write.current = false
      setBusy(false)
    }
  }

  async function authenticate(mode: 'register' | 'login', username: string, password: string, invite: string) {
    if (write.current) return false
    try {
      await runWrite(async () => {
        const reply = await request<GameReply>(mode, { body: { username, password, ...(invite ? { invite } : {}) } })
        apply(reply, true)
      })
      void refresh()
      return true
    } catch (error) {
      setNotice({ text: messageFrom(error), error: true })
      return false
    }
  }

  async function send(command: PendingCommand) {
    if (write.current) return false
    const replay = pending.current?.id === command.id
    try {
      await runWrite(async () => {
        const reply = await request<GameReply>('command', { body: command })
        if (replay) {
          // A receipt is the original result. A fresh read follows before controls are enabled.
          setConnected(false)
          showSummary(reply.summary, false)
        } else apply(reply, false)
        setNotice(reply.message ? { text: reply.message } : null)
        pending.current = null
        setRetry(null)
      })
      void refresh()
      return true
    } catch (error) {
      if (error instanceof RequestError && error.status >= 400 && error.status < 500) {
        pending.current = null
        setRetry(null)
        if (error.status === 401) clear()
        else if (replay) {
          setConnected(false)
          showSummary(error.summary, false)
        } else if (error.state) apply({ state: error.state, summary: error.summary }, false)
        setNotice({ text: messageFrom(error), error: true })
        void refresh()
      } else {
        setConnected(false)
        pending.current = command
        setRetry(command)
        setNotice({ text: 'The outpost did not confirm that action. Retry it to recover the result.', error: true })
      }
      return false
    }
  }

  const command: RunCommand = async (next) => {
    if (write.current || pending.current) return false
    return await send({ id: commandId(), command: next })
  }

  async function logOut() {
    if (write.current) return
    try {
      await runWrite(async () => {
        await request('logout', { body: {} })
        clear()
      })
    } catch (error) {
      setNotice({ text: messageFrom(error), error: true })
    }
  }

  return {
    state, world, summary, ready, connected, worldUnavailable, busy, retry, notice, lastResponseAt,
    authenticate, command, logOut,
    retryCommand: () => { if (pending.current) void send(pending.current) },
    dismissSummary: () => setSummary(null),
    dismissNotice: () => setNotice(null),
  }
}
