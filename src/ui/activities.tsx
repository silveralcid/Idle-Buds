import { useState } from 'react'
import { SPECIES } from '../data/index.ts'
import { levelForXp, workerCapacity } from '../game/progression.ts'
import { activityAssigned } from '../game/breeding.ts'
import { activityDuration, orderSkill } from '../game/activities.ts'
import { MAX_ORDER_COUNT, TENDER_ID } from '../game/limits.ts'
import type { Activity, ActivityOrder, Bud, PlayerView, ProductionSkill } from '../game/types.ts'
import { Amounts, BudMark, Empty } from './shared.tsx'
import { activityName, budName, budOptionLabel, duration, itemName, number } from './view-model.ts'
import { ItemMark } from './production-elements.tsx'
import { productionOptions, sameOrder } from './production-model.ts'
import type { ProductionOption } from './production-model.ts'
import type { GamePanelProps } from './shared.tsx'
import './production.css'

export function ActivityMonitor(props: GamePanelProps) {
  const activities = Object.values(props.state.activities).filter(activityAssigned)
  return <section className="stack" aria-label="Active assignments">
    <div className="spread"><h2>Activities</h2><small>{activities.filter((activity) => activity.nextAt !== null).length} running</small></div>
    {activities.length === 0 ? <Empty>No active assignments.</Empty> : activities.map((activity) => <Assignment key={activity.workerId} {...props} activity={activity} />)}
  </section>
}

export function Assignment({ activity, state, now, disabled, run }: GamePanelProps & { activity: Activity }) {
  const running = activity.nextAt !== null
  const assigned = activityAssigned(activity)
  const remaining = running ? Math.max(0, activity.nextAt! - now) : activity.remainingMs
  const elapsed = Math.max(0, Math.min(activity.durationMs, activity.durationMs - remaining))
  return <div className="assignment-strip stack tight">
    <div className="spread"><strong>{activityName(activity.order)}</strong><small>{budName(state, activity.workerId)}</small></div>
    <progress max={activity.durationMs} value={elapsed} aria-label={`${activityName(activity.order)} cycle progress`} />
    <div className="spread"><small className={running ? 'cycle' : 'attention'}>{running ? remaining ? duration(remaining) : 'Resolving…' : activity.stopReason ?? 'Paused'}{running && activity.remainingCount !== null && ` · ${number(activity.remainingCount)} left`}</small>
      {assigned && <div className="row">
        {(running || activity.status === 'blocked') && <button className="small quiet" disabled={disabled} onClick={() => void run({ type: 'pauseActivity', workerId: activity.workerId })}>Pause</button>}
        {!running && activity.status === 'paused' && <button className="small quiet" disabled={disabled} onClick={() => void run({ type: 'resumeActivity', workerId: activity.workerId })}>Resume</button>}
        <button className="small quiet" disabled={disabled} onClick={() => void run({ type: 'stopActivity', workerId: activity.workerId })}>Stop</button>
      </div>}
    </div>
    {activity.queue.length > 0 && <details className="assignment-queue"><summary>{activity.queue.length} queued</summary><ol className="clean-list">{activity.queue.map((order, index) => <li key={index}>{activityName(order)} × {number(order.count ?? 1)}</li>)}</ol></details>}
    {activity.status === 'blocked' && activity.stopReason?.includes('Inventory full') && <a className="assignment-storage" href="#inventory">Manage inventory</a>}
  </div>
}

function CraftQuantity({ continuous, setContinuous, count, setCount }: {
  continuous: boolean; setContinuous: (value: boolean) => void; count: number; setCount: (value: number) => void
}) {
  return <div className="craft-quantity">
    <label>Make<select value={continuous ? 'continuous' : 'quantity'} onChange={(event) => setContinuous(event.target.value === 'continuous')}><option value="quantity">Quantity</option><option value="continuous">Continuously</option></select></label>
    {!continuous && <label>Quantity<input type="number" min={1} max={MAX_ORDER_COUNT} value={count} onChange={(event) => setCount(Math.max(1, Math.min(MAX_ORDER_COUNT, Number(event.target.value) || 1)))} /></label>}
  </div>
}

export function OrderControls({ state, disabled, run, order, startLabel, locked, startBlocked, workers, maker }: GamePanelProps & {
  order: ActivityOrder; startLabel: string; locked?: string; startBlocked?: string; workers?: PlayerView['buds']; maker?: boolean
}) {
  const [worker, setWorker] = useState(TENDER_ID)
  const [count, setCount] = useState(1)
  const [continuous, setContinuous] = useState(false)
  const [markMaker, setMarkMaker] = useState(false)
  const workerId = worker === TENDER_ID || workers?.some((bud) => bud.id === worker) ? worker : TENDER_ID
  const current = state.activities[workerId]
  const active = current?.nextAt !== null && sameOrder(current?.order, order)
  const namedAction: ActivityOrder = order.kind === 'craft' ? { ...order, count: continuous ? null : count, ...(maker ? { markMaker } : {}) } : order
  return <div className="action-area stack tight">
    {workers && workers.length > 0 && <label>Worker<select value={workerId} onChange={(event) => setWorker(event.target.value)}><option value={TENDER_ID}>Tender</option>{workers.map((bud) => <option key={bud.id} value={bud.id}>{budOptionLabel(state, bud)}</option>)}</select></label>}
    {order.kind === 'craft' && <CraftQuantity {...{ continuous, setContinuous, count, setCount }} />}
    {maker && <label className="check"><input type="checkbox" checked={markMaker} onChange={(event) => setMarkMaker(event.target.checked)} /> Maker signature</label>}
    <button className="primary" aria-label={startLabel} disabled={disabled || Boolean(locked) || (active && order.kind !== 'craft')} onClick={() => void run({ type: 'startActivity', order: namedAction, workerId })}>{active && order.kind !== 'craft' ? 'Active' : startLabel}</button>
    {(locked || startBlocked) && <small className="attention">{locked ?? startBlocked}</small>}
  </div>
}

export function ProductionPanel({ skill, ...props }: GamePanelProps & { skill: ProductionSkill }) {
  const { state, disabled, run, now } = props
  const options = productionOptions(state, skill)
  const tender = state.activities[TENDER_ID]
  const tenderHere = tender && orderSkill(tender.order) === skill
  const [selection, setSelection] = useState('')
  const selected = options.find((option) => option.key === selection) ?? options.find((option) => sameOrder(tender?.order, option.order)) ?? options[0]
  const level = levelForXp(state.xp[skill])
  const gather = selected?.order.kind === 'gather'
  const output = gather ? 1 + state.upgrades.tool + Number(state.foodUntil > now) : selected?.quantity ?? 1
  return <div className="production-page stack">
    <header className="section-heading production-heading"><h1 tabIndex={-1}>{skill}</h1><div className="row"><span className="tag live">Lv {level}</span><small>{number(state.xp[skill])} XP</small></div></header>
    <div className="production-layout">
      <div className="production-detail stack">
        <section className="surface stack" aria-label="Tender activity">
          <div className="spread"><h2>Tender</h2><span className="status-light" data-running={Boolean(tenderHere && tender.nextAt !== null)}>{tenderHere && activityAssigned(tender) ? 'Assigned' : 'Ready'}</span></div>
          {tenderHere ? <Assignment {...props} activity={tender} /> : <p className="muted">{tender && activityAssigned(tender) ? `Working on ${activityName(tender.order)}` : 'Choose an activity.'}</p>}
        </section>
        {selected && <section className="surface production-focus stack" aria-label={`${selected.label} details`}>
          <div className="production-specimen"><ItemMark id={selected.itemId} large /><div><h2>{selected.label}</h2><small>{number(state.inventory[selected.itemId] ?? state.equipment.filter((gear) => gear.definitionId === selected.itemId).length)} owned</small></div></div>
          <div className="production-rewards"><div><small>Output</small><strong>×{output}</strong></div><div><small>Cycle</small><strong>{duration(selected.durationMs)}</strong></div><div><small>XP</small><strong>+{selected.xp}</strong></div></div>
          {selected.inputs && <div className="stack tight"><h3>Ingredients</h3><Amounts items={selected.inputs} inventory={state.inventory} /></div>}
          {gather ? <div className="bonus-drop"><ItemMark id="portal-dust" /><span>{itemName('portal-dust')}<small>7.5% chance · +1</small></span></div>
            : <OrderControls {...props} key={selected.key} order={selected.order} startLabel={`Make ${selected.label}`} locked={selected.requirement} maker={selected.gear} />}
        </section>}
        <SkillBudPanel {...props} skill={skill} options={options} />
      </div>
      <section className="surface resource-list stack tight" aria-label={`${skill} activities`}>
        <div className="spread"><h2>{gather ? 'Resources' : 'Recipes'}</h2><small>{options.filter((option) => !option.requirement).length}/{options.length}</small></div>
        <div className="resource-options">{options.map((option) => {
          const running = tender?.nextAt !== null && sameOrder(tender?.order, option.order)
          return <button key={option.key} className="resource-option" data-selected={selected?.key === option.key} data-active={running} aria-label={`${option.order.kind === 'gather' ? 'Gather' : 'Select'} ${option.label}`} aria-pressed={running} disabled={disabled || Boolean(option.requirement)} onClick={() => {
            setSelection(option.key)
            if (option.order.kind === 'gather' && !running) void run({ type: 'startActivity', workerId: TENDER_ID, order: option.order })
          }}>
            <ItemMark id={option.itemId} /><span className="resource-copy"><strong>{option.label}</strong><small>{duration(option.durationMs)} <span>·</span> +{option.xp} XP</small></span>
            <span className="resource-end"><small className="resource-requirement">{option.requirement ?? ''}</small><span className="numeric">{number(state.inventory[option.itemId] ?? state.equipment.filter((gear) => gear.definitionId === option.itemId).length)}</span></span>
          </button>
        })}</div>
      </section>
    </div>
  </div>
}

function SkillBudPanel({ skill, options, ...props }: GamePanelProps & { skill: ProductionSkill; options: ProductionOption[] }) {
  const { state, disabled, run } = props
  const assigned = Object.values(state.activities).find((activity) => activity.workerId !== TENDER_ID && orderSkill(activity.order) === skill && activityAssigned(activity))
  const candidates = state.buds.filter((bud) => SPECIES[bud.speciesId].aptitudes.includes(skill) && !state.formation.includes(bud.id) && state.breeding?.primaryId !== bud.id && state.breeding?.secondaryId !== bud.id)
  const [selectedBud, setSelectedBud] = useState('')
  const budId = candidates.some((bud) => bud.id === selectedBud) ? selectedBud : assigned?.workerId ?? candidates[0]?.id ?? ''
  const bud = state.buds.find((candidate) => candidate.id === budId)
  return <section className="surface skill-bud stack" aria-label={`${skill} Bud`}>
    <div className="spread"><h2>{skill} Bud</h2><small>{assigned ? '1 / 1' : '0 / 1'}</small></div>
    {candidates.length ? <>
      <div className="bud-slot"><BudMark speciesId={bud!.speciesId} large /><label>Bud<select value={budId} disabled={disabled} onChange={(event) => setSelectedBud(event.target.value)}>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{budOptionLabel(state, candidate)}</option>)}</select></label></div>
      <BudWorkPicker {...props} bud={bud!} options={options} compact />
      {assigned && <Assignment {...props} activity={assigned} />}
      {assigned && assigned.workerId !== budId && <small>Replaces {budName(state, assigned.workerId)}.</small>}
      {!assigned && workerCapacity(state) === 0 && <small>Catch a Bud to unlock your first work slot.</small>}
    </> : <div className="empty-bud"><span aria-hidden="true">+</span><p>{state.buds.length ? `No available Bud with ${skill} aptitude.` : 'Your first helper is waiting.'}</p><a href={state.buds.length ? '#buds' : '#combat'}>{state.buds.length ? 'View collection' : 'Find a Bud'}</a></div>}
    {assigned && candidates.length === 0 && <button disabled={disabled} onClick={() => void run({ type: 'stopActivity', workerId: assigned.workerId })}>Unassign Bud</button>}
  </section>
}

export function BudWorkPicker({ bud, options, compact = false, ...props }: GamePanelProps & { bud: Bud; options?: ProductionOption[]; compact?: boolean }) {
  const { state, disabled, run } = props
  const choices = options ?? SPECIES[bud.speciesId].aptitudes.flatMap((skill) => productionOptions(state, skill))
  const available = choices.filter((option) => !option.requirement)
  const current = state.activities[bud.id]
  const [choice, setChoice] = useState('')
  const [continuous, setContinuous] = useState(true)
  const [count, setCount] = useState(1)
  const selected = available.find((option) => option.key === choice) ?? available.find((option) => sameOrder(current?.order, option.order)) ?? available[0]
  const sameQuantity = selected?.order.kind !== 'craft' || current?.order.kind === 'craft'
    && (current.order.count === undefined ? 1 : current.order.count) === (continuous ? null : count)
  const active = current?.nextAt !== null && selected && sameOrder(current?.order, selected.order) && sameQuantity
  const occupied = state.formation.includes(bud.id) || state.breeding?.primaryId === bud.id || state.breeding?.secondaryId === bud.id
  const otherWorker = selected && Object.values(state.activities).find((activity) => activity.workerId !== TENDER_ID && activity.workerId !== bud.id && activityAssigned(activity) && orderSkill(activity.order) === selected.skill)
  const workCount = Object.values(state.activities).filter((activity) => activity.workerId !== TENDER_ID && activityAssigned(activity)).length
  const noSlot = !activityAssigned(current) && !otherWorker && workCount >= workerCapacity(state)
  const order: ActivityOrder | undefined = selected?.order.kind === 'craft' ? { ...selected.order, count: continuous ? null : count } : selected?.order
  if (!available.length) return <small>No unlocked work for this Bud yet.</small>
  return <div className="stack tight bud-work-picker">
    <label>{compact ? 'Activity' : 'Work assignment'}<select value={selected!.key} disabled={disabled || occupied} onChange={(event) => setChoice(event.target.value)}>{available.map((option) => <option value={option.key} key={option.key}>{compact ? '' : `${option.skill} · `}{option.label}</option>)}</select></label>
    {selected?.order.kind === 'craft' && <CraftQuantity {...{ continuous, setContinuous, count, setCount }} />}
    {selected && <small className="bud-efficiency">{duration(activityDuration(state, bud.id, selected.order))} per cycle · +{selected.xp} Bud XP</small>}
    <button className="primary" disabled={disabled || occupied || noSlot || Boolean(active)} onClick={() => { if (order) void run({ type: 'startActivity', workerId: bud.id, order }) }}>{active ? 'Assigned' : `Assign ${budName(state, bud.id)}`}</button>
    {occupied && <small>In {state.formation.includes(bud.id) ? 'formation' : 'breeding'}.</small>}
    {noSlot && <small>All {workerCapacity(state)} Bud work slots are used. <a href="#inventory">Upgrade capacity</a></small>}
    {otherWorker && !compact && <small>Replaces {budName(state, otherWorker.workerId)} in {selected!.skill}.</small>}
  </div>
}
