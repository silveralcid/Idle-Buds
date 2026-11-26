import { useRef, useState } from 'react'
import { CAPTURE_ITEMS, FOOD_DURATION, GEAR_DEFINITIONS, ITEM_DEFINITIONS, UPGRADES, ZONES } from '../data/index.ts'
import { activityAssigned } from '../game/breeding.ts'
import { canReceiveGear, inventoryCapacity, inventorySlotsUsed, levelForXp, workerCapacity } from '../game/progression.ts'
import { TENDER_ID } from '../game/limits.ts'
import type { AdvanceSummary, Gear, GearSlot, PlayerView, Upgrade } from '../game/types.ts'
import { Amounts, Empty } from './shared.tsx'
import { budName, duration, itemName, number } from './view-model.ts'
import type { GamePanelProps } from './shared.tsx'
import { ItemMark } from './production-elements.tsx'
import './production.css'

export function OutpostHero({ state }: { state: PlayerView }) {
  const zone = ZONES[state.zoneId]
  return <header className="hero surface">
    <div className="portal-art" aria-hidden="true"><i /><b /><span /></div>
    <div className="stack tight">
      <small className="designation">NEON FRONTIER</small>
      <h1 tabIndex={-1}>Your outpost</h1>
      <p>{zone.description}</p>
    </div>
    <dl className="stat-line">
      <div><dt>Coins</dt><dd>{number(state.coins)}</dd></div>
      <div><dt>Buds</dt><dd>{number(state.buds.length)}</dd></div>
      <div><dt>Zone access</dt><dd>{state.unlockedZones.length}/{Object.keys(ZONES).length}</dd></div>
    </dl>
  </header>
}

export function FieldGuide({ state }: { state: PlayerView }) {
  const hasAssignedBud = Object.values(state.activities).some((activity) => activity.workerId !== TENDER_ID && activityAssigned(activity))
  const steps = [
    { title: 'Gather Scrap', detail: 'Collect 3 Scrap.', done: state.stats.gathered >= 3, href: '#mining', button: 'Go to Mining' },
    { title: 'Craft a Capture Kit', detail: 'Make one kit with 3 Scrap.', done: state.stats.crafted > 0, href: '#crafting', button: 'Go to Crafting' },
    { title: 'Earn a Bud', detail: 'Win an Earth patrol with a device in inventory. Craft another if the Bud escapes.', done: state.stats.catches > 0, href: '#combat', button: 'Go to Combat' },
    { title: 'Assign your Bud to work', detail: 'Pick a gathering node that matches your Bud’s aptitude. Your work continues while you’re away.', done: hasAssignedBud, href: '#buds', button: 'Go to Collection' },
  ]
  if (steps.every((step) => step.done)) return null
  const recommended = steps.findIndex((step) => !step.done)
  const next = steps[recommended]
  return <section className="surface stack" aria-label="First expedition">
    <div className="spread"><h2>First expedition</h2><small>{steps.filter((step) => step.done).length}/{steps.length}</small></div>
    <div className="spread"><div className="stack tight"><strong>{next.title}</strong><small>{next.detail}</small></div><a className="button primary" href={next.href}>{next.button}</a></div>
    <details><summary>View steps</summary><ol className="guide">{steps.map((step) => <li className="row" key={step.title} data-done={step.done}>
      <div className="guide-copy"><strong>{step.title}{step.done && <span className="tag live">Complete</span>}</strong><p className="muted">{step.detail}</p></div>
    </li>)}</ol></details>
  </section>
}

export function ReturnSummary({ state, summary, dismiss }: { state: PlayerView; summary: AdvanceSummary; dismiss: () => void }) {
  return <section className="surface line stack" aria-label="While you were away">
    <div className="spread"><h2>While you were away</h2><button className="quiet small" onClick={dismiss}>Dismiss summary</button></div>
    <p>{number(summary.cycles)} completed {summary.cycles === 1 ? 'cycle' : 'cycles'} over {duration(summary.simulatedMs)} of activity time.</p>
    {Object.keys(summary.items).length > 0 && <Amounts items={summary.items} />}
    <ul className="amounts">
      {summary.coins > 0 && <li><strong>+{number(summary.coins)}</strong> coins</li>}
      {summary.catches > 0 && <li><strong>+{number(summary.catches)}</strong> Buds</li>}
      {summary.eggs > 0 && <li><strong>+{number(summary.eggs)}</strong> eggs</li>}
      {Object.entries(summary.budXp).map(([id, xp]) => <li key={id}><strong>+{number(xp)}</strong> {budName(state, id)} XP</li>)}
      {Object.entries(summary.xp).map(([skill, xp]) => <li key={skill}><strong>+{number(xp)}</strong> {skill} XP</li>)}
    </ul>
    {summary.discardedMs > 0 && <p className="attention">The offline limit was reached. {duration(summary.discardedMs)} fell outside the catch-up window.</p>}
    {summary.stopped.length > 0 && <ul className="clean-list">{summary.stopped.map(({ workerId, reason }) => <li key={workerId}>{budName(state, workerId)} · {reason}</li>)}</ul>}
  </section>
}

interface InventoryEntry { key: string; itemId: string; label: string; count: number; kind: 'materials' | 'consumables' | 'equipment'; gear?: Gear }

export function InventoryPanel(props: GamePanelProps) {
  const { state, now, disabled, run } = props
  const capacity = inventoryCapacity(state)
  const used = inventorySlotsUsed(state)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [selectedKey, setSelectedKey] = useState('')
  const inspector = useRef<HTMLElement>(null)
  const gearEntries: InventoryEntry[] = state.equipment.map((gear) => ({ key: gear.id, itemId: gear.definitionId, label: GEAR_DEFINITIONS[gear.definitionId].name, count: 1, kind: 'equipment', gear }))
  const entries: InventoryEntry[] = [...Object.entries(state.inventory).filter(([, amount]) => amount > 0).map(([id, amount]): InventoryEntry => ({ key: id, itemId: id, label: itemName(id), count: amount, kind: id in FOOD_DURATION || id in CAPTURE_ITEMS || id === 'brood-tonic' ? 'consumables' : 'materials' })), ...gearEntries.filter((entry) => !Object.values(state.loadout).includes(entry.key))]
    .sort((left, right) => left.label.localeCompare(right.label))
  const visible = entries.filter((entry) => (filter === 'all' || entry.kind === filter) && entry.label.toLowerCase().includes(query.toLowerCase()))
  const selected = [...entries, ...gearEntries].find((entry) => entry.key === selectedKey)
  const patrol = state.activities[TENDER_ID]
  const inCombat = patrol?.order.kind === 'battle' && activityAssigned(patrol)
  const reservations = Object.values(state.storageReservations).filter((reservation) => reservation.kind !== 'bud').length
  function inspect(key: string) {
    setSelectedKey(key)
    if (window.matchMedia('(max-width: 760px)').matches) window.requestAnimationFrame(() => inspector.current?.scrollIntoView({ block: 'nearest' }))
  }
  return <div className="stack">
    <header className="section-heading production-heading"><h1 tabIndex={-1}>Inventory</h1><span className={used >= capacity ? 'tag alert' : 'tag'}>{used}/{capacity} slots</span></header>
    <div className="inventory-layout">
      <section className="surface stack" aria-label="Stored items">
        <div className="inventory-toolbar"><label>Search items<input type="search" placeholder="Find an item…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label>Filter<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All items</option><option value="materials">Materials</option><option value="consumables">Consumables</option><option value="equipment">Equipment</option></select></label></div>
        {state.foodUntil > now && <span className="tag live">Meal bonus · {duration(state.foodUntil - now)}</span>}
        {visible.length ? <div className="inventory-grid">{visible.map((entry) => <button key={entry.key} className="inventory-slot" data-selected={selected?.key === entry.key} aria-label={`Inspect ${entry.label}${entry.gear ? ` +${entry.gear.bonus}` : ''}`} aria-pressed={selected?.key === entry.key} onClick={() => inspect(entry.key)}>
          <ItemMark id={entry.itemId} /><span className="inventory-item-name">{entry.label}</span><strong className="inventory-quantity">{entry.gear ? `+${entry.gear.bonus}` : number(entry.count)}</strong>
        </button>)}</div> : <Empty>{entries.length ? 'No items match this filter.' : <>Your inventory is empty. <a href="#mining">Gather Scrap</a></>}</Empty>}
        <div className="spread inventory-footer"><small>Unlimited stacks</small><div className="row"><a href="#buds">Buds ({state.buds.length})</a><a href="#nursery">Eggs ({state.eggs.length})</a></div></div>
        {reservations > 0 && <small>{reservations} market {reservations === 1 ? 'listing reserves' : 'listings reserve'} return space.</small>}
      </section>
      <aside className="inventory-side stack">
        <section className="surface stack inventory-inspector" ref={inspector} aria-label="Item details">
          {selected ? <>
            <div className="production-specimen"><ItemMark id={selected.itemId} large /><div><h2>{selected.label}</h2><small>{selected.gear ? selected.gear.slot : `${number(selected.count)} owned`}</small></div></div>
            {selected.gear ? <GearDetails {...props} gear={selected.gear} inCombat={inCombat} /> : <>
              <p className="muted">{ITEM_DEFINITIONS[selected.itemId]?.description}</p>
              {selected.itemId in FOOD_DURATION && <button className="primary" disabled={disabled || state.foodUntil > now} onClick={() => void run({ type: 'eat', itemId: selected.itemId })}>Eat {selected.label}</button>}
              {selected.itemId in CAPTURE_ITEMS && <a href="#combat">Set capture rules</a>}
              {selected.itemId === 'brood-tonic' && <a href="#nursery">Use in nursery</a>}
              <a href="#market">Trade in market</a>
            </>}
          </> : <div className="empty-inspector"><span aria-hidden="true">▣</span><p>Select an item to inspect it.</p></div>}
        </section>
        <section className="surface stack" aria-label="Equipped gear"><div className="spread"><h2>Equipment</h2><a href="#formation">Formation</a></div>
          {(['weapon', 'armor'] as GearSlot[]).map((slot) => {
            const gear = state.equipment.find((entry) => entry.id === state.loadout[slot])
            return <button className="equipped-slot" key={slot} disabled={!gear} aria-label={gear ? `Inspect equipped ${GEAR_DEFINITIONS[gear.definitionId].name}` : `Empty ${slot} slot`} onClick={() => gear && inspect(gear.id)}>
              {gear ? <ItemMark id={gear.definitionId} /> : <span className="empty-gear" aria-hidden="true">+</span>}<span><small className="capitalize">{slot}</small><strong>{gear ? `${GEAR_DEFINITIONS[gear.definitionId].name} +${gear.bonus}` : 'Empty'}</strong></span>
            </button>
          })}
          <small>Equipped gear uses no inventory slots.</small>
        </section>
      </aside>
    </div>
    {Boolean(state.pendingRefundCoins) && <p className="banner">{number(state.pendingRefundCoins!)} refunded coins are waiting for wallet space. They will be added automatically.</p>}
    {Object.entries(state.pendingRewards).length > 0 && <section className="surface stack" aria-label="Waiting rewards"><div className="spread"><h2>Waiting for space</h2><small>Collected automatically</small></div>
      {Object.entries(state.pendingRewards).map(([lane, reward]) => <div className="stack tight" key={lane}><strong>{lane === TENDER_ID ? 'Tender' : lane}</strong><Amounts items={reward.items} />{reward.gear.map((gear) => <p key={gear.id}>{GEAR_DEFINITIONS[gear.definitionId].name} +{gear.bonus}</p>)}</div>)}
    </section>}
    <details className="surface" aria-label="Permanent upgrades"><summary>Permanent upgrades · {workerCapacity(state)} Bud work slots</summary>
      <div className="grid">{(Object.entries(UPGRADES) as [Upgrade, typeof UPGRADES[Upgrade]][]).map(([id, upgrade]) => {
        if (id === 'remote') return null
        const rank = state.upgrades[id]
        const multiplier = rank + 1
        const items = Object.fromEntries(Object.entries(upgrade.items).map(([itemId, amount]) => [itemId, amount * multiplier]))
        const coins = upgrade.coins * multiplier
        const requiredLevel = upgrade.level + rank
        const earned = id !== 'worker' || state.stats.catches > 0
        const available = earned && levelForXp(state.xp[upgrade.skill]) >= requiredLevel && state.coins >= coins && Object.entries(items).every(([itemId, amount]) => (state.inventory[itemId] ?? 0) >= amount)
        return <article key={id} className="surface stack">
          <div className="spread"><h3>{upgrade.name}</h3><span className="tag">{rank}/{upgrade.maxLevel}</span></div>
          <p className="muted">{upgrade.description}</p>
          {rank >= upgrade.maxLevel ? <span className="tag live">Fully upgraded</span> : <>
            <p>Requires {upgrade.skill} level {requiredLevel} · {number(coins)} coins{!earned && ' · First wild catch'}</p>
            <Amounts items={items} inventory={state.inventory} />
            <button className="primary" disabled={disabled || !available} onClick={() => void run({ type: 'buyUpgrade', upgrade: id })}>Upgrade {upgrade.name}</button>
          </>}
        </article>
      })}</div>
    </details>
  </div>
}

function GearDetails({ gear, state, disabled, run, inCombat }: GamePanelProps & { gear: Gear; inCombat: boolean }) {
  const definition = GEAR_DEFINITIONS[gear.definitionId]
  const skill = definition.skill ?? 'Vitality'
  const eligible = levelForXp(state.xp[skill]) >= definition.level
  const equipped = state.loadout[gear.slot] === gear.id
  const full = equipped && !canReceiveGear(state)
  return <>
    <dl className="stat-line"><div><dt>{gear.slot === 'weapon' ? 'Attack' : 'Health'}</dt><dd>+{gear.bonus}</dd></div>{gear.technique && <div><dt>Technique</dt><dd>{gear.technique}</dd></div>}</dl>
    {gear.maker && <small>Made by {gear.maker}</small>}
    {!eligible && <small className="attention">Requires {skill} Lv {definition.level}</small>}
    {inCombat && <small className="attention">Stop your patrol to change equipment.</small>}
    {full && <small className="attention">Free one inventory slot to unequip.</small>}
    <button className="primary" disabled={disabled || inCombat || !eligible || full} onClick={() => void run({ type: 'equip', slot: gear.slot, gearId: equipped ? null : gear.id })}>{equipped ? 'Unequip' : 'Equip'}</button>
    {!equipped && <a href="#market">Trade in market</a>}
  </>
}
