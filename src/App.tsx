import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PRODUCTION_SKILLS } from './data/index.ts'
import type { PlayerView, ProductionSkill } from './game/types.ts'
import { ProductionPanel } from './ui/activities.tsx'
import { useGame } from './ui/api.ts'
import { CollectionPanel, NurseryPanel } from './ui/collection.tsx'
import { CombatPanel, FormationPanel } from './ui/combat.tsx'
import { ChatDock, CommunityPanel, RankedPanel } from './ui/community.tsx'
import type { ChatMode } from './ui/community.tsx'
import { useController } from './ui/controller.ts'
import { MarketPanel } from './ui/market.tsx'
import { FieldGuide, InventoryPanel, OutpostHero, ReturnSummary } from './ui/outpost.tsx'
import { usePreferences } from './ui/preferences.ts'
import { ActiveWork, AuthScreen, GameMenu, Mark, Navigation, Settings, WorkGlance } from './ui/shell.tsx'
import type { GamePanelProps } from './ui/shared.tsx'
import { number, readDestination } from './ui/view-model.ts'

type Game = ReturnType<typeof useGame>

function Notices({ game }: { game: Game }) {
  return game.notice && <div className={`banner spread ${game.notice.error ? 'error' : ''}`}>
    {game.notice.error ? <p role="alert">{game.notice.text}</p> : <output>{game.notice.text}</output>}
    {game.retry ? <button disabled={game.busy} onClick={game.retryCommand}>Retry action</button> : <button className="quiet small" onClick={game.dismissNotice}>Dismiss</button>}
  </div>
}

export default function App() {
  const game = useGame()
  if (!game.state) return <AuthScreen busy={game.busy} ready={game.ready} notice={<Notices game={game} />} authenticate={game.authenticate} />
  return <GameView key={game.state.name} state={game.state} game={game} />
}

function GameView({ state, game }: { state: PlayerView; game: Game }) {
  const [destination, setDestination] = useState(readDestination)
  const [tick, setTick] = useState(() => performance.now())
  const [menu, setMenu] = useState<'menu' | 'settings' | 'activity' | null>(null)
  const [chatMode, setChatMode] = useState<ChatMode>('closed')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [editingNav, setEditingNav] = useState(false)
  const { preferences, update, stored } = usePreferences(state.name)
  const main = useRef<HTMLElement>(null)
  const navigated = useRef(false)
  const controller = useController(() => setMenu('menu'), () => {
    if (mobileOpen) setMobileOpen(false)
    else if (chatMode === 'expanded') setChatMode('minimized')
    else document.querySelector<HTMLButtonElement>('[data-menu-trigger]')?.focus()
  })
  useEffect(() => {
    function route() { navigated.current = true; setDestination(readDestination()); setMobileOpen(false) }
    window.addEventListener('hashchange', route)
    return () => window.removeEventListener('hashchange', route)
  }, [])
  useEffect(() => {
    const interval = window.setInterval(() => setTick(performance.now()), 250)
    return () => window.clearInterval(interval)
  }, [])
  useEffect(() => {
    if (!navigated.current) return
    main.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
    navigated.current = false
  }, [destination])
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(preferences.reducedMotion)
    return () => { delete document.documentElement.dataset.reducedMotion }
  }, [preferences.reducedMotion])

  const props: GamePanelProps = {
    state, now: state.lastAt + Math.max(0, tick - game.lastResponseAt.current),
    disabled: game.busy || Boolean(game.retry) || !game.connected, run: game.command,
  }
  const worldProps = { ...props, disabled: props.disabled || game.worldUnavailable }
  const worldPanel = ['market', 'community', 'ranked'].includes(destination)
  let panel
  switch (destination) {
    case 'overview': panel = preferences.guide ? <FieldGuide state={state} /> : <section className="surface stack"><h2>Your next move</h2><div className="row"><a className="button" href="#mining">Gather</a><a className="button" href="#combat">Battle</a><a className="button" href="#buds">Manage Buds</a></div></section>; break
    case 'combat': panel = <CombatPanel {...props} />; break
    case 'buds': panel = <CollectionPanel {...props} />; break
    case 'formation': panel = <FormationPanel {...props} />; break
    case 'nursery': panel = <NurseryPanel {...props} />; break
    case 'inventory': panel = <InventoryPanel {...props} />; break
    case 'market': panel = game.world && <MarketPanel world={game.world} {...worldProps} />; break
    case 'community': panel = game.world && <CommunityPanel world={game.world} openChat={() => setChatMode('expanded')} {...worldProps} />; break
    case 'ranked': panel = game.world && <RankedPanel world={game.world} {...worldProps} />; break
    default: panel = PRODUCTION_SKILLS.includes(destination as ProductionSkill)
      ? <ProductionPanel key={destination} skill={destination as ProductionSkill} {...props} /> : null
  }

  return <>
    <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); main.current?.focus() }}>Skip to main content</a>
    <header className="topbar">
      <div className="brand-cluster"><button className="icon-button quiet mobile-nav-toggle" aria-label="Toggle navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>☷</button><a href="#overview" className="brand" aria-label="Idle Buds home"><Mark /><span>Idle <em>Buds</em></span></a></div>
      <div className="toolbar">
        <span className="coin-readout" title="Coins"><span aria-hidden="true">◉</span><strong>{number(state.coins)}</strong><span className="sr-only">coins</span></span>
        <button className="work-glance" aria-label="Active work" onClick={() => setMenu('activity')}><WorkGlance state={state} /></button>
        <button className="toolbar-button" aria-label="Chat" aria-expanded={chatMode === 'expanded'} onClick={() => setChatMode(chatMode === 'expanded' ? 'minimized' : 'expanded')}><span aria-hidden="true">◌</span><span className="toolbar-label">Chat</span></button>
        <a className="button toolbar-button market-shortcut" href="#market" aria-label="Open market"><span aria-hidden="true">⇄</span><span className="toolbar-label">Market</span></a>
        <button className="icon-button menu-trigger" data-menu-trigger aria-label="Menu" onClick={() => setMenu('menu')}>☰</button>
      </div>
    </header>
    <div className={`app-layout ${preferences.collapsed ? 'sidebar-collapsed' : ''}`}>
      {mobileOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <Navigation state={state} destination={destination} preferences={preferences} update={update} editing={editingNav} setEditing={setEditingNav} mobileOpen={mobileOpen} navigate={() => setMobileOpen(false)} />
      <main id="main-content" className="workspace stack" ref={main} tabIndex={-1}>
        {!game.connected && <output className="banner error">Reconnecting. Last confirmed save: {new Date(state.lastAt).toLocaleTimeString()}.</output>}
        <Notices game={game} />
        {destination === 'overview' && <OutpostHero state={state} />}
        {game.summary && <ReturnSummary state={state} summary={game.summary} dismiss={game.dismissSummary} />}
        {worldPanel && game.worldUnavailable && <p className="banner error">{game.world ? 'World data is out of date. Reconnecting…' : 'World data is currently unavailable. Reconnecting…'}</p>}
        {worldPanel && !game.world && !game.worldUnavailable && <output>Loading world data…</output>}
        {panel}
      </main>
    </div>
    <ChatDock mode={chatMode} setMode={setChatMode} world={game.world} {...worldProps} />
    {controller.connected && createPortal(<output className={`controller-hint ${controller.selection ? 'controller-choice' : ''}`}>{controller.selection ? <><small>{controller.selection.label} · {controller.selection.position}/{controller.selection.total}</small><strong>{controller.selection.text}</strong><small>D-pad Preview · A Confirm · B Cancel</small></> : 'A Select · B Back · Start Menu'}</output>, [...document.querySelectorAll('dialog[open]')].at(-1) ?? document.body)}
    {menu === 'activity' && <ActiveWork {...props} close={() => setMenu(null)} />}
    {menu === 'menu' && <GameMenu state={state} connected={game.connected} busy={game.busy} close={() => setMenu(null)} settings={() => setMenu('settings')} logOut={game.logOut} guide={preferences.guide} toggleGuide={() => { update({ guide: !preferences.guide }); setMenu(null) }} />}
    {menu === 'settings' && <Settings preferences={preferences} update={update} stored={stored} controller={controller.connected} close={() => setMenu('menu')} arrange={() => { update({ collapsed: false }); setEditingNav(true); setMobileOpen(true); setMenu(null) }} />}
  </>
}
