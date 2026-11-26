import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { PlayerView, ProductionSkill } from '../game/types.ts'
import { levelForXp } from '../game/index.ts'
import { PRODUCTION_SKILLS } from '../data/index.ts'
import { destinations } from './view-model.ts'
import type { Destination } from './view-model.ts'

const skillIcons: Record<ProductionSkill, string> = {
  Mining: '◈', Woodcutting: '▲', Fishing: '∿', Farming: '✿', Crafting: '⊞', Cooking: '◉', Synthesis: '⌬',
}

export function Mark() {
  return <span className="brand-mark" aria-hidden="true"><i /></span>
}

export function AuthScreen({ busy, ready, notice, authenticate }: {
  busy: boolean
  ready: boolean
  notice: ReactNode
  authenticate: (mode: 'register' | 'login', name: string, password: string, invite: string) => Promise<boolean>
}) {
  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [invite, setInvite] = useState('')
  function submit(event: FormEvent) {
    event.preventDefault()
    void authenticate(mode, username.trim(), password, invite.trim())
  }

  return (
    <main className="auth-layout" id="main-content">
      <section className="auth-intro">
        <div className="brand"><Mark /><span>Frontier Operations</span></div>
        <div className="portal-art" aria-hidden="true"><i /><b /><span /></div>
        <div className="auth-title">
          <h1>Idle <em>Buds</em></h1>
          <p>Cross the portal, meet the Buds, and build an outpost that keeps working while you’re away.</p>
        </div>
      </section>
      <section className="auth-card" aria-label="Tender account">
        {ready ? <>
          <div className="segmented" aria-label="Account action">
            <button type="button" aria-pressed={mode === 'register'} onClick={() => setMode('register')}>Create account</button>
            <button type="button" aria-pressed={mode === 'login'} onClick={() => setMode('login')}>Sign in</button>
          </div>
          <h2>{mode === 'register' ? 'Register as a Tender' : 'Return to your outpost'}</h2>
          {notice}
          <form className="stack" onSubmit={submit}>
            <label>Username<input autoComplete="username" minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" required value={username} onChange={(event) => setUsername(event.target.value)} /></label>
            <label>Password<input type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            {mode === 'register' && <details open={inviteOpen} onToggle={(event) => setInviteOpen(event.currentTarget.open)}>
              <summary>Enter an invite code</summary>
              <label>Invite code<input autoComplete="off" value={invite} onChange={(event) => setInvite(event.target.value)} /></label>
            </details>}
            {mode === 'register' && <small>Use 3–24 letters, numbers, or underscores for your username and at least 12 characters for your password.</small>}
            <button className="primary" disabled={busy}>{busy ? 'Connecting…' : mode === 'register' ? 'Register' : 'Sign in to outpost'}</button>
          </form>
        </> : <output>Connecting to the outpost…</output>}
      </section>
    </main>
  )
}

export function Navigation({ state, destination }: { state: PlayerView; destination: Destination }) {
  return (
    <nav className="navigation" aria-label="Outpost navigation">
      <div className="nav-block">
        <h2>Outpost</h2>
        {destinations.map(([key, label, icon]) => <a key={key} href={`#${key}`} aria-current={destination === key ? 'page' : undefined}><span aria-hidden="true" className="nav-icon">{icon}</span><span>{label}</span></a>)}
      </div>
      <div className="nav-block">
        <h2>Production</h2>
        {PRODUCTION_SKILLS.map((skill) => <a key={skill} href={`#${skill.toLowerCase()}`} aria-current={destination === skill ? 'page' : undefined}><span aria-hidden="true" className="nav-icon">{skillIcons[skill]}</span><span>{skill}</span><span className="nav-level" aria-label={`Level ${levelForXp(state.xp[skill])}`}>{levelForXp(state.xp[skill])}</span></a>)}
      </div>
    </nav>
  )
}
