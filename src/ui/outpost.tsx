import { FOOD_DURATION, ITEM_DEFINITIONS, UPGRADES, ZONES } from '../data/index.ts'
import { activityAssigned } from '../game/breeding.ts'
import { itemCapacity, levelForXp, workerCapacity } from '../game/progression.ts'
import { TENDER_ID } from '../game/limits.ts'
import type { AdvanceSummary, PlayerView, Upgrade } from '../game/types.ts'
import { Amounts, Empty } from './shared.tsx'
import { budName, duration, itemName, number } from './view-model.ts'
import type { GamePanelProps } from './shared.tsx'

export function OutpostHero({ state }: { state: PlayerView }) {
  const zone = ZONES[state.zoneId]
  return <header className="hero surface">
    <div className="portal-art" aria-hidden="true"><i /><b /><span /></div>
    <div className="stack tight">
      <small className="designation">{zone.name} · Tier {zone.tier}</small>
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
    { title: 'Gather Iron Scrap', detail: 'Run three cycles at Salvage Verge.', done: state.stats.gathered >= 3, href: '#mining', button: 'Go to Mining' },
    { title: 'Craft a Capture Kit', detail: 'Use 3 Iron Scrap to make one device.', done: state.stats.crafted > 0, href: '#crafting', button: 'Go to Crafting' },
    { title: 'Earn a Bud', detail: 'Win an Earth patrol with a device in inventory. Craft another if the Bud escapes.', done: state.stats.catches > 0, href: '#combat', button: 'Go to Combat' },
    { title: 'Assign your Bud to work', detail: 'Pick a gathering node that matches your Bud’s aptitude. Your work continues while you’re away.', done: hasAssignedBud, href: '#buds', button: 'Go to Collection' },
  ]
  if (steps.every((step) => step.done)) return null
  const recommended = steps.findIndex((step) => !step.done)
  return <section className="surface stack" aria-label="First expedition">
    <h2>First expedition</h2>
    <ol className="guide">{steps.map((step, index) => <li className="row" key={step.title} data-done={step.done}>
      <div className="guide-copy"><strong>{step.title}{step.done && <span className="tag live">Complete</span>}</strong><p className="muted">{step.detail}</p></div>
      {!step.done && <a className={index === recommended ? 'button primary' : 'button'} href={step.href}>{step.button}</a>}
    </li>)}</ol>
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

export function InventoryPanel({ state, now, disabled, run }: GamePanelProps) {
  const capacity = itemCapacity(state)
  const items = Object.entries(state.inventory).filter(([, amount]) => amount > 0).sort(([left], [right]) => itemName(left).localeCompare(itemName(right)))
  return <div className="stack">
    <header className="section-heading"><h1 tabIndex={-1}>Inventory</h1><p>{number(state.coins)} coins · {number(capacity)} units of each resource fit in storage</p></header>
    <section className="surface stack" aria-label="Stored supplies">
      <div className="spread"><h2>Supplies</h2>{state.foodUntil > now && <span className="tag live">Meal bonus · {duration(state.foodUntil - now)} left</span>}</div>
      {items.length === 0 && <Empty>Your storage is empty. <a href="#mining">Gather supplies at Salvage Verge</a>.</Empty>}
      <ul className="list">{items.map(([id, amount]) => <li className="inventory-row spread" key={id}>
        <div><h3>{itemName(id)}</h3><small>{ITEM_DEFINITIONS[id]?.description}</small></div>
        <div className="row"><strong className="numeric">{number(amount)} / {number(capacity)}</strong>{id in FOOD_DURATION && <button disabled={disabled || state.foodUntil > now || amount === 0} onClick={() => void run({ type: 'eat', itemId: id })}>Eat {itemName(id)}</button>}</div>
      </li>)}</ul>
    </section>
    <section className="stack" aria-label="Permanent upgrades"><h2>Permanent upgrades</h2>
      <p className="muted">{workerCapacity(state)} Bud work slots. Earn your first slot by catching a wild Bud.</p>
      <div className="grid">{(Object.entries(UPGRADES) as [Upgrade, typeof UPGRADES[Upgrade]][]).map(([id, upgrade]) => {
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
    </section>
  </div>
}
