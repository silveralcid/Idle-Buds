import { useEffect, useRef, useState } from 'react'
import { PRODUCTION_SKILLS, ZONES } from './data/index.ts'
import type { ProductionSkill } from './game/types.ts'
import { ActivityMonitor, ProductionPanel } from './ui/activities.tsx'
import { useGame } from './ui/api.ts'
import { CollectionPanel, NurseryPanel } from './ui/collection.tsx'
import { CombatPanel, FormationPanel } from './ui/combat.tsx'
import { CommunityPanel, RankedPanel } from './ui/community.tsx'
import { MarketPanel } from './ui/market.tsx'
import { FieldGuide, InventoryPanel, OutpostHero, ReturnSummary } from './ui/outpost.tsx'
import { AuthScreen, Mark, Navigation } from './ui/shell.tsx'
import type { GamePanelProps } from './ui/shared.tsx'
import { readDestination } from './ui/view-model.ts'

export default function App() {
  const game = useGame()
  const { state } = game
  const signedIn = Boolean(state)
  const [destination, setDestination] = useState(readDestination)
  const [tick, setTick] = useState(() => performance.now())
  const main = useRef<HTMLElement>(null)
  const navigated = useRef(false)
  useEffect(() => {
    function route() {
      navigated.current = true
      setDestination(readDestination())
    }
    window.addEventListener('hashchange', route)
    return () => window.removeEventListener('hashchange', route)
  }, [])
  useEffect(() => {
    if (!signedIn) return
    const interval = window.setInterval(() => setTick(performance.now()), 500)
    return () => window.clearInterval(interval)
  }, [signedIn])
  useEffect(() => {
    if (!navigated.current) return
    main.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
    navigated.current = false
  }, [destination])

  const notice = game.notice && <div className={`banner spread ${game.notice.error ? 'error' : ''}`}>
    {game.notice.error ? <p role="alert">{game.notice.text}</p> : <output>{game.notice.text}</output>}
    {game.retry ? <button disabled={game.busy} onClick={game.retryCommand}>Retry action</button> : <button className="quiet small" onClick={game.dismissNotice}>Dismiss</button>}
  </div>
  if (!state) return <AuthScreen busy={game.busy} ready={game.ready} notice={notice} authenticate={game.authenticate} />

  const props: GamePanelProps = {
    state,
    now: state.lastAt + Math.max(0, tick - game.lastResponseAt.current),
    disabled: game.busy || Boolean(game.retry) || !game.connected,
    run: game.command,
  }
  const worldProps = { ...props, disabled: props.disabled || game.worldUnavailable }
  const worldPanel = ['market', 'community', 'ranked'].includes(destination)
  let panel
  switch (destination) {
    case 'overview': panel = <FieldGuide state={state} />; break
    case 'combat': panel = <CombatPanel {...props} />; break
    case 'buds': panel = <CollectionPanel {...props} />; break
    case 'formation': panel = <FormationPanel {...props} />; break
    case 'nursery': panel = <NurseryPanel {...props} />; break
    case 'inventory': panel = <InventoryPanel {...props} />; break
    case 'market': panel = game.world && <MarketPanel world={game.world} {...worldProps} />; break
    case 'community': panel = game.world && <CommunityPanel world={game.world} {...worldProps} />; break
    case 'ranked': panel = game.world && <RankedPanel world={game.world} {...worldProps} />; break
    default: panel = PRODUCTION_SKILLS.includes(destination as ProductionSkill)
      ? <ProductionPanel key={destination} skill={destination as ProductionSkill} {...props} />
      : null
  }

  return <>
    <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); main.current?.focus() }}>Skip to main content</a>
    <header className="topbar">
      <a href="#overview" className="brand"><Mark /><span>Idle Buds</span></a>
      <div className="row"><span className="tag">{ZONES[state.zoneId].name}</span><span className="tag live">{state.coins.toLocaleString('en-US')} coins</span><span className="profile">{state.name}</span><button className="quiet small" onClick={() => void game.logOut()} disabled={game.busy}>Sign out</button></div>
    </header>
    <div className="app-layout">
      <Navigation state={state} destination={destination} />
      <main id="main-content" className="workspace stack" ref={main} tabIndex={-1}>
        {!game.connected && <output className="banner error">Reconnecting to the outpost. Showing progress saved at {new Date(state.lastAt).toLocaleTimeString([], { timeZoneName: 'short' })}.</output>}
        {notice}
        {destination === 'overview' && <OutpostHero state={state} />}
        {game.summary && <ReturnSummary state={state} summary={game.summary} dismiss={game.dismissSummary} />}
        {(destination === 'overview' || Object.keys(state.activities).length > 0) && <ActivityMonitor {...props} />}
        {worldPanel && game.worldUnavailable && <p className="banner error">{game.world ? 'World data is out of date. Reconnecting…' : 'World data is currently unavailable. Reconnecting…'}</p>}
        {worldPanel && !game.world && !game.worldUnavailable && <output>Loading world data…</output>}
        {panel}
      </main>
    </div>
  </>
}
