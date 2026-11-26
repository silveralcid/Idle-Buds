import { useState } from 'react'
import { GEAR_DEFINITIONS, NODES, RECIPES, SPECIES, ZONES } from '../data/index.ts'
import { isBudCommitted, levelForXp, workerCapacity } from '../game/index.ts'
import { activityAssigned } from '../game/breeding.ts'
import { MAX_QUEUE, TENDER_ID } from '../game/limits.ts'
import { itemCapacity } from '../game/progression.ts'
import type { Activity, ActivityOrder, PlayerView, ProductionSkill } from '../game/types.ts'
import { Amounts, Empty } from './shared.tsx'
import { activityName, budName, duration, itemName, number, zoneEligibility } from './view-model.ts'
import type { GamePanelProps } from './shared.tsx'

export function ActivityMonitor({ state, now, disabled, run }: GamePanelProps) {
  const activities = Object.values(state.activities)
  return <section className="stack" aria-label="Active assignments">
    <div className="spread"><h2>Assignments</h2><small>{activities.filter((activity) => activity.nextAt !== null).length} running</small></div>
    {activities.length === 0 && <Empty>No assignments yet. Start a gathering job, recipe, or patrol.</Empty>}
    {activities.map((activity) => <Assignment key={activity.workerId} state={state} now={now} disabled={disabled} run={run} activity={activity} />)}
  </section>
}

function Assignment({ activity, state, now, disabled, run }: GamePanelProps & { activity: Activity }) {
  const { nextAt, durationMs, remainingCount, queue, workerId, stopReason } = activity
  const assigned = activityAssigned(activity)
  const running = nextAt !== null
  const remaining = running ? Math.max(0, nextAt - now) : activity.remainingMs
  const elapsed = Math.max(0, Math.min(durationMs, durationMs - remaining))
  return <article className="surface activity stack tight">
    <div className="spread">
      <div className="row"><h3>{activityName(activity.order)}</h3><span className="tag">{budName(state, workerId)}</span></div>
      <span className={running ? 'cycle' : 'muted'}>{running ? remaining ? `Next cycle in ${duration(remaining)}` : 'Resolving cycle…' : stopReason ?? 'Paused'}</span>
    </div>
    <progress max={durationMs} value={elapsed} aria-label={`${activityName(activity.order)} cycle progress`} />
    <div className="spread">
      <small>{remainingCount === null ? 'Repeat until stopped' : `${number(remainingCount)} ${remainingCount === 1 ? 'cycle' : 'cycles'} left`}{queue.length > 0 && ` · ${queue.length} queued`}</small>
      <div className="row">
        {running && <button className="small quiet" disabled={disabled} onClick={() => void run({ type: 'pauseActivity', workerId })}>Pause</button>}
        {!running && assigned && <button className="small quiet" disabled={disabled} onClick={() => void run({ type: 'resumeActivity', workerId })}>Resume</button>}
        {assigned && <button className="small quiet" disabled={disabled} onClick={() => void run({ type: 'stopActivity', workerId })}>Stop assignment</button>}
      </div>
    </div>
    {queue.length > 0 && <details><summary>View queue</summary><ol className="clean-list">{queue.map((order, index) => <li key={`${activityName(order)}-${index}`}>{activityName(order)}{order.count && ` × ${number(order.count)}`}</li>)}</ol></details>}
  </article>
}

export function OrderControls({ state, disabled, run, order, startLabel, locked, startBlocked, workers, maker }: GamePanelProps & {
  order: ActivityOrder
  startLabel: string
  locked?: string
  startBlocked?: string
  workers?: PlayerView['buds']
  maker?: boolean
}) {
  const [worker, setWorker] = useState(TENDER_ID)
  const [cycles, setCycles] = useState(order.kind === 'gather' ? 'repeat' : '1')
  const [markMaker, setMarkMaker] = useState(false)
  const workerId = worker === TENDER_ID || workers?.some((bud) => bud.id === worker) ? worker : TENDER_ID
  const current = state.activities[workerId]
  const assigned = activityAssigned(current)
  const namedAction = { ...order, ...(cycles === 'repeat' ? {} : { count: Number(cycles) }), ...(order.kind === 'craft' && maker ? { markMaker } : {}) }
  const zone = order.kind === 'gather' ? NODES[order.nodeId].zoneId : order.kind === 'battle' ? order.zoneId : null
  const travel = zone && state.zoneId !== zone && (workerId === TENDER_ID || !state.upgrades.remote)
  const location = order.kind === 'gather' ? order.nodeId : order.kind === 'craft' ? RECIPES[order.recipeId].skill : null
  const occupied = location && Object.values(state.activities).some((activity) => {
    if (activity.workerId === workerId || !activityAssigned(activity)) return false
    return (activity.order.kind === 'gather' && activity.order.nodeId === location)
      || (activity.order.kind === 'craft' && RECIPES[activity.order.recipeId].skill === location)
  })
  const unavailable = locked ?? (travel ? `Travel to ${ZONES[zone].name} first.` : undefined)
  const startReason = unavailable ?? startBlocked ?? (occupied ? 'Another worker is assigned here.' : undefined)
  return <div className="action-area stack tight">
    <div className="form-grid">
      {workers && workers.length > 0 && <label>Worker<select value={workerId} onChange={(event) => setWorker(event.target.value)}>
        <option value={TENDER_ID}>Tender</option>
        {workers.map((bud) => <option key={bud.id} value={bud.id}>{budName(state, bud.id)} · {bud.id}</option>)}
      </select></label>}
      <label>{order.kind === 'battle' ? 'Patrol length' : 'Cycles'}<select value={cycles} onChange={(event) => setCycles(event.target.value)}>
        {order.kind === 'gather' && <option value="repeat">Repeat until stopped</option>}
        <option value="1">1 cycle</option><option value="3">3 cycles</option><option value="10">10 cycles</option><option value="1000">1,000 cycles</option>
      </select></label>
      {maker && <label className="check"><input type="checkbox" checked={markMaker} onChange={(event) => setMarkMaker(event.target.checked)} /> Mark gear with maker name</label>}
    </div>
    <div className="row">
      <button className="primary" disabled={disabled || Boolean(startReason) || assigned} onClick={() => void run({ type: 'startActivity', order: namedAction, workerId })}>{startLabel}</button>
      {assigned && current.remainingCount !== null && cycles !== 'repeat' && <button disabled={disabled || Boolean(unavailable) || current.queue.length >= MAX_QUEUE} onClick={() => void run({ type: 'queueActivity', order: namedAction, workerId })}>Add to queue</button>}
    </div>
    {travel && !locked && <button disabled={disabled} onClick={() => void run({ type: 'travel', zoneId: zone })}>Travel to {ZONES[zone].name}</button>}
    {startReason && <small className="attention">{startReason}</small>}
    {!unavailable && assigned && <small>{current.queue.length >= MAX_QUEUE ? 'The queue is full. ' : ''}Stop {activityName(current.order)} to begin immediately{current.remainingCount !== null && current.queue.length < MAX_QUEUE ? ', or choose a finite order and add it to the queue' : ''}.</small>}
  </div>
}

export function ProductionPanel({ skill, ...props }: GamePanelProps & { skill: ProductionSkill }) {
  const { state, disabled, run } = props
  const level = levelForXp(state.xp[skill])
  const nodes = Object.entries(NODES).filter(([, node]) => node.skill === skill)
  const recipes = Object.entries(RECIPES).filter(([, recipe]) => recipe.skill === skill)
  const activeWorkers = Object.values(state.activities).filter((activity) => activity.workerId !== TENDER_ID && activityAssigned(activity)).length
  const eligibleWorkers = state.buds.filter((bud) => SPECIES[bud.speciesId].aptitudes.includes(skill) &&
    ((!isBudCommitted(state, bud.id) && activeWorkers < workerCapacity(state)) || activityAssigned(state.activities[bud.id])))

  return <div className="stack">
    <header className="section-heading"><h1 tabIndex={-1}>{skill}</h1><p>Level {level} · {number(state.xp[skill])} XP{nodes.length > 0 && ` · ${activeWorkers}/${workerCapacity(state)} Bud work slots used`}</p></header>
    {nodes.length > 0 && <div className="grid">{nodes.map(([id, node]) => {
      const zone = zoneEligibility(state, node.zoneId)
      const locked = !zone.unlocked ? zone.requirement : level < node.level ? `Requires ${skill} level ${node.level}.` : undefined
      const full = (state.inventory[node.itemId] ?? 0) >= itemCapacity(state)
      const workers = state.zoneId === node.zoneId || state.upgrades.remote ? eligibleWorkers : []
      return <article className="surface skill-card stack" key={id} aria-label={node.name}>
        <div className="spread"><h2>{node.name}</h2><span className="tag">{ZONES[node.zoneId].name} · Tier {ZONES[node.zoneId].tier}</span></div>
        <dl className="stat-line"><div><dt>Primary resource</dt><dd>{itemName(node.itemId)}</dd></div><div><dt>Cycle</dt><dd>{duration(node.durationMs)}</dd></div><div><dt>Tender XP</dt><dd>+{node.xp}</dd></div></dl>
        <small>{number(state.inventory[node.itemId] ?? 0)} in inventory</small>
        {!!eligibleWorkers.length && !workers.length && zone.unlocked && <small>Bud deployment requires the team's current zone or a Remote Relay.</small>}
        {!zone.unlocked && zone.eligible && <button onClick={() => void run({ type: 'unlockZone', zoneId: node.zoneId })} disabled={disabled}>Unlock {ZONES[node.zoneId].name}</button>}
        <OrderControls {...props} order={{ kind: 'gather', nodeId: id }} startLabel="Start gathering" workers={workers} locked={locked} startBlocked={full ? 'Storage is full for this resource.' : undefined} />
      </article>
    })}</div>}
    {recipes.length > 0 && <div className="grid">{recipes.map(([id, recipe]) => {
      const undiscovered = recipe.discovery && !state.discoveries.includes(recipe.discovery)
      const locked = level < recipe.level ? `Requires ${skill} level ${recipe.level}.`
        : undiscovered ? 'Discover this blueprint by winning a Hollowtide patrol.' : undefined
      const needsMaterials = !Object.entries(recipe.inputs).every(([item, cost]) => (state.inventory[item] ?? 0) >= cost)
      const { output } = recipe
      const gear = 'gearId' in output ? GEAR_DEFINITIONS[output.gearId] : undefined
      return <article className="surface skill-card stack" key={id} aria-label={recipe.name}>
        <div className="spread"><h2>{recipe.name}</h2><span className="tag">Level {recipe.level}</span></div>
        <dl className="stat-line"><div><dt>Output per cycle</dt><dd>{gear ? `+${gear.minBonus}–${gear.maxBonus} ${gear.slot === 'weapon' ? 'Attack' : 'Health'}` : 'quantity' in output ? `×${output.quantity}` : '1 gear'}</dd></div><div><dt>Cycle</dt><dd>{duration(recipe.durationMs)}</dd></div><div><dt>Tender XP</dt><dd>+{recipe.xp}</dd></div></dl>
        {'itemId' in output && <small>{number(state.inventory[output.itemId] ?? 0)} in inventory</small>}
        <div className="stack tight"><h3>Ingredients per cycle</h3><Amounts items={recipe.inputs} inventory={state.inventory} /></div>
        <OrderControls {...props} order={{ kind: 'craft', recipeId: id }} startLabel={`Make ${recipe.name}`} maker={Boolean(gear)} locked={locked} startBlocked={needsMaterials ? 'Gather the listed materials first.' : undefined} workers={eligibleWorkers} />
      </article>
    })}</div>}
  </div>
}
