import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { PlayerView, ProductionSkill } from '../game/types.ts'
import { levelForXp } from '../game/index.ts'
import { PRODUCTION_SKILLS } from '../data/index.ts'
import { destinations } from './view-model.ts'
import type { Destination } from './view-model.ts'
import { activityName, budName, duration } from './view-model.ts'
import { NODES, RECIPES } from '../data/index.ts'
import { TENDER_ID } from '../game/limits.ts'
import { activityAssigned } from '../game/breeding.ts'
import { defaultPreferences, groupLabels, move } from './preferences.ts'
import type { NavigationGroup, Preferences } from './preferences.ts'
import { Modal } from './shared.tsx'
import type { GamePanelProps } from './shared.tsx'

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

function destinationLabel(key: Destination) { return destinations.find(([id]) => id === key)?.[1] ?? key }

export function Navigation({ state, destination, preferences, update, editing, setEditing, mobileOpen, navigate }: {
  state: PlayerView; destination: Destination; preferences: Preferences; update: (change: Partial<Preferences>) => void
  editing: boolean; setEditing: (value: boolean) => void; mobileOpen: boolean; navigate: () => void
}) {
  function reorder(group: NavigationGroup, index: number, direction: number) {
    update({ entries: { ...preferences.entries, [group]: move(preferences.entries[group], index, direction) } })
  }
  return <nav className={`navigation ${preferences.collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''} ${editing ? 'is-editing' : ''}`} aria-label="Outpost navigation">
    <div className="nav-tools">
      <span className="nav-caption">FRONTIER</span>
      <button className="icon-button quiet" aria-label={preferences.collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-pressed={preferences.collapsed} onClick={() => update({ collapsed: !preferences.collapsed })}>{preferences.collapsed ? '»' : '«'}</button>
    </div>
    {preferences.groups.map((group, groupIndex) => <section key={group} className={`nav-block ${group === 'activities' && preferences.activityIcons && !editing ? 'icon-grid' : ''}`} aria-label={`${groupLabels[group]} navigation`}>
      <div className="nav-group-heading"><h2>{groupLabels[group]}</h2>
        {group === 'activities' && <button className="icon-button quiet" aria-label={preferences.activityIcons ? 'Show activity labels' : 'Show activity icons'} aria-pressed={preferences.activityIcons} onClick={() => update({ activityIcons: !preferences.activityIcons })}>{preferences.activityIcons ? '›' : '⌄'}</button>}
        {editing && <div className="reorder-controls"><button className="icon-button" aria-label={`Move ${groupLabels[group]} category up`} disabled={groupIndex === 0} onClick={() => update({ groups: move(preferences.groups, groupIndex, -1) })}>↑</button><button className="icon-button" aria-label={`Move ${groupLabels[group]} category down`} disabled={groupIndex === preferences.groups.length - 1} onClick={() => update({ groups: move(preferences.groups, groupIndex, 1) })}>↓</button></div>}
      </div>
      <div className="nav-entries">{preferences.entries[group].map((key, index) => {
        const skill = PRODUCTION_SKILLS.includes(key as ProductionSkill) ? key as ProductionSkill : null
        const label = destinationLabel(key)
        const icon = skill ? skillIcons[skill] : destinations.find(([id]) => id === key)?.[2]
        return <div className="nav-entry" key={key}>
          <a href={`#${key.toLowerCase()}`} aria-label={label} title={label} onClick={navigate} aria-current={destination === key ? 'page' : undefined}>
            <span aria-hidden="true" className="nav-icon">{icon}</span><span className="nav-label">{label}</span>
            {skill && <span className="nav-level" aria-hidden="true">{levelForXp(state.xp[skill])}</span>}
          </a>
          {editing && <div className="reorder-controls"><button className="icon-button" aria-label={`Move ${label} up`} disabled={index === 0} onClick={() => reorder(group, index, -1)}>↑</button><button className="icon-button" aria-label={`Move ${label} down`} disabled={index === preferences.entries[group].length - 1} onClick={() => reorder(group, index, 1)}>↓</button></div>}
        </div>
      })}</div>
    </section>)}
    <div className="nav-footer"><button className="quiet" title={editing ? 'Finish arranging sidebar' : 'Arrange sidebar'} aria-label={editing ? 'Finish arranging sidebar' : 'Arrange sidebar'} aria-pressed={editing} onClick={() => { if (!editing) update({ collapsed: false }); setEditing(!editing) }}><span aria-hidden="true">{editing ? '✓' : '⚙'}</span><span className="nav-label">{editing ? 'Done' : 'Arrange'}</span></button></div>
  </nav>
}

export function ActiveWork({ state, now, disabled, run, close }: GamePanelProps & { close: () => void }) {
  const activities = Object.values(state.activities).filter(activityAssigned)
  return <Modal title="Active work" close={close}>
    <div className="stack">
      {activities.length === 0 && <p className="muted">Choose an activity to begin.</p>}
      {activities.map((activity) => {
        const target = activity.order.kind === 'battle' ? 'combat' : activity.order.kind === 'gather' ? NODES[activity.order.nodeId].skill.toLowerCase() : RECIPES[activity.order.recipeId].skill.toLowerCase()
        const left = activity.nextAt === null ? activity.remainingMs : Math.max(0, activity.nextAt - now)
        return <section className="work-peek" key={activity.workerId}>
          <div className="spread"><a href={`#${target}`} onClick={close}><strong>{budName(state, activity.workerId)}</strong> · {activityName(activity.order)}</a><small>{activity.nextAt === null ? activity.stopReason : duration(left)}</small></div>
          {activity.nextAt !== null && <progress aria-label={`${budName(state, activity.workerId)} cycle progress`} max={activity.durationMs} value={Math.max(0, activity.durationMs - left)} />}
          <div className="row"><button className="small quiet" disabled={disabled} onClick={() => void run({ type: activity.nextAt === null ? 'resumeActivity' : 'pauseActivity', workerId: activity.workerId })}>{activity.nextAt === null ? 'Resume' : 'Pause'}</button><button className="small quiet" disabled={disabled} onClick={() => void run({ type: 'stopActivity', workerId: activity.workerId })}>Stop</button></div>
        </section>
      })}
      <button onClick={close}>Close</button>
    </div>
  </Modal>
}

export function WorkGlance({ state }: { state: PlayerView }) {
  const candidate = state.activities[TENDER_ID]
  const tender = activityAssigned(candidate) ? candidate : undefined
  const buds = Object.values(state.activities).filter((activity) => activity.workerId !== TENDER_ID && activityAssigned(activity)).length
  const blocked = Object.values(state.activities).some((activity) => activity.status === 'blocked')
  return <><span className={`status-led ${blocked ? 'waiting' : tender || buds ? 'working' : ''}`} aria-hidden="true" /><span className="work-glance-label">{tender ? activityName(tender.order) : 'Idle'}</span><span className="work-bud-count">{buds} <span className="toolbar-label">Buds</span></span></>
}

export function GameMenu({ state, connected, busy, close, settings, logOut, guide, toggleGuide }: {
  state: PlayerView; connected: boolean; busy: boolean; close: () => void; settings: () => void
  logOut: () => Promise<void>; guide: boolean; toggleGuide: () => void
}) {
  return <Modal title="Menu" close={close}>
    <div className="game-menu stack">
      <button className="primary" onClick={close}>Resume</button>
      <button onClick={toggleGuide}>{guide ? 'Hide onboarding' : 'Show onboarding'}</button>
      <button onClick={settings}>Settings</button>
      <div className="menu-divider">Feedback</div>
      <button disabled title="Not available yet">Report a bug <small>Coming later</small></button>
      <button disabled title="Not available yet">Submit feedback <small>Coming later</small></button>
      <div className="menu-divider">Account</div>
      <output className="save-status"><span className={`status-led ${connected ? 'working' : 'waiting'}`} aria-hidden="true" /><span><strong>{connected ? 'Saved to server' : 'Connection interrupted'}</strong><small>Last confirmed: <time dateTime={new Date(state.lastAt).toISOString()}>{new Date(state.lastAt).toLocaleTimeString()}</time></small></span></output>
      <button className="danger" disabled={busy} onClick={() => void logOut()}>Sign out</button>
    </div>
  </Modal>
}

export function Settings({ preferences, update, stored, controller, arrange, close }: {
  preferences: Preferences; update: (change: Partial<Preferences>) => void; stored: boolean; controller: boolean
  arrange: () => void; close: () => void
}) {
  return <Modal title="Settings" close={close}><div className="stack">
    <label className="check"><input type="checkbox" checked={preferences.reducedMotion} onChange={(event) => update({ reducedMotion: event.target.checked })} />Reduce motion</label>
    <label className="check"><input type="checkbox" checked={preferences.guide} onChange={(event) => update({ guide: event.target.checked })} />Show onboarding</label>
    <button onClick={arrange}>Arrange sidebar</button>
    <button onClick={() => update(defaultPreferences())}>Reset interface preferences</button>
    <section className="surface subtle stack tight"><h3>Controls</h3><p>Arrow keys or D-pad move focus. Enter / A selects. Escape / B goes back. Start opens the menu.</p><small>For selectors: A enters, D-pad changes, A confirms.</small><small>{controller ? 'Controller connected' : 'Connect a controller and press a button to begin.'}</small></section>
    {!stored && <p className="attention">This browser cannot store preferences. They will reset when this tab closes.</p>}
    <small>Interface preferences apply to this account in this browser. Game progress saves automatically to the server.</small>
    <small><a href={new URL('../assets/font-licenses.txt', import.meta.url).href} target="_blank" rel="noreferrer">Font licenses</a></small>
    <button onClick={close}>Back</button>
  </div></Modal>
}
