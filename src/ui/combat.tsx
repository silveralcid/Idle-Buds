import { useState } from 'react'
import { AFFINITIES, CAPTURE_ITEMS, COMBAT_SKILLS, GEAR_DEFINITIONS, SPECIES, ZONES } from '../data/index.ts'
import { buildFormation, isBudCommitted, levelForXp, MAX_CAPTURE_RULES, TENDER_ID } from '../game/index.ts'
import { activityAssigned } from '../game/breeding.ts'
import type { BattleResult, CaptureFilter, GearSlot, ZoneId } from '../game/types.ts'
import { OrderControls } from './activities.tsx'
import { Empty } from './shared.tsx'
import { budName, duration, itemName, number, speciesName, zoneEligibility } from './view-model.ts'
import type { GamePanelProps } from './shared.tsx'

export function BattleLog({ result }: { result: BattleResult }) {
  return <details><summary>Battle log · {number(result.rounds)} rounds</summary>
    <ol className="event-log">{result.events.map((event, index) => <li key={index}>{event.text}</li>)}</ol>
  </details>
}

export function CombatPanel(props: GamePanelProps) {
  const { state, disabled, run } = props
  const encounter = state.lastEncounter
  return <div className="stack">
    <header className="section-heading"><h1 tabIndex={-1}>Combat</h1><p>Send your Tender and formation on automatic patrols.</p></header>
    <section className="surface"><dl className="stat-line">{COMBAT_SKILLS.map((skill) => <div key={skill}><dt>{skill}</dt><dd>Lv {levelForXp(state.xp[skill])} · {number(state.xp[skill])} XP</dd></div>)}</dl></section>
    {encounter && <article className="surface line stack tight" aria-label="Latest encounter">
      <div className="spread"><h2>{encounter.battle.winner === 'left' ? 'Victory' : encounter.battle.winner === 'draw' ? 'Draw' : 'Defeat'} · {speciesName(encounter.speciesId)}</h2><span className="tag">{ZONES[encounter.zoneId].name}</span></div>
      <p>{encounter.capture.reason}{encounter.capture.chance !== undefined && ` · ${Math.round(encounter.capture.chance)}% capture chance`}</p>
      <BattleLog result={encounter.battle} />
    </article>}
    <h2>Patrols</h2>
    <div className="grid">{(Object.entries(ZONES) as [ZoneId, typeof ZONES[ZoneId]][]).map(([zoneId, zone]) => {
      const access = zoneEligibility(state, zoneId)
      const weight = Object.values(zone.encounters).reduce((sum, value) => sum + value, 0)
      return <article className="surface stack" key={zoneId} aria-label={`${zone.name} patrol`}>
        <div className="spread"><h3>{zone.name}</h3><span className="tag">Tier {zone.tier}</span></div>
        <p className="muted">{zone.description}</p>
        <small>{duration(zone.durationMs)} per battle · {state.stats.zoneWins[zoneId]} wins</small>
        <details><summary>Encounter pool</summary><ul className="list">{Object.entries(zone.encounters).map(([id, odds]) => <li className="spread" key={id}>{speciesName(id)} <small>{Math.round(100 * odds / weight)}%</small></li>)}</ul></details>
        {!access.unlocked && access.eligible && <button onClick={() => void run({ type: 'unlockZone', zoneId })} disabled={disabled}>Unlock {zone.name}</button>}
        <OrderControls {...props} order={{ kind: 'battle', zoneId }} startLabel={`Patrol ${zone.name}`} locked={access.unlocked ? undefined : access.requirement} />
      </article>
    })}</div>
    <CapturePanel {...props} />
  </div>
}

const filterConditions: { value: CaptureFilter['condition']; label: string }[] = [
  { value: 'new', label: 'New species' }, { value: 'rarity', label: 'Rarity' }, { value: 'species', label: 'Species' },
  { value: 'affinity', label: 'Affinity' }, { value: 'any', label: 'All encounters' },
]
const filterValues = {
  rarity: ['Common', 'Uncommon', 'Rare'].map((value) => [value, value]),
  species: Object.values(SPECIES).map((species) => [species.id, species.name]),
  affinity: AFFINITIES.map((value) => [value, value]),
}

function CapturePanel({ state, disabled, run }: GamePanelProps) {
  const [draft, setDraft] = useState<CaptureFilter[] | null>(null)
  const filters = draft ?? state.captureFilters
  function update(index: number, filter: CaptureFilter) {
    setDraft(filters.map((entry, position) => position === index ? filter : entry))
  }
  function move(index: number, step: number) {
    const reordered = [...filters]
    const [entry] = reordered.splice(index, 1)
    reordered.splice(index + step, 0, entry)
    setDraft(reordered)
  }
  return <section className="surface stack" aria-label="Automatic capture">
    <div className="spread"><h2>Automatic capture</h2><a href="#crafting">Craft capture devices</a></div>
    <p className="muted">After a victory the first matching rule decides whether to use one device or skip. A failed attempt still uses its device.</p>
    <ul className="amounts">{Object.keys(CAPTURE_ITEMS).map((id) => <li key={id}>{itemName(id)} <strong>{number(state.inventory[id] ?? 0)}</strong></li>)}</ul>
    {filters.length === 0 && <Empty>No capture rules set. Add a rule to catch Buds.</Empty>}
    <ol className="clean-list stack">{filters.map((rule, index) => <li key={index} className="stack tight">
      <div className="form-grid">
        <label>Match<select value={rule.condition} onChange={(event) => {
          const condition = event.target.value as CaptureFilter['condition']
          const value = condition in filterValues ? filterValues[condition as keyof typeof filterValues][0][0] : undefined
          update(index, { itemId: rule.itemId, condition, ...(value && { value }) })
        }}>{filterConditions.map(({ value, label }) => <option value={value} key={value}>{label}</option>)}</select></label>
        {rule.condition in filterValues && <label>Value<select value={rule.value} onChange={(event) => update(index, { ...rule, value: event.target.value })}>
          {filterValues[rule.condition as keyof typeof filterValues].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>}
        <label>Action<select value={rule.itemId} onChange={(event) => update(index, { ...rule, itemId: event.target.value })}>
          <option value="skip">Skip capture</option>{Object.keys(CAPTURE_ITEMS).map((id) => <option key={id} value={id}>{itemName(id)}</option>)}
        </select></label>
      </div>
      <div className="row">
        <button type="button" className="small quiet" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move rule ${index + 1} up`}>Move up</button>
        <button type="button" className="small quiet" disabled={index === filters.length - 1} onClick={() => move(index, 1)} aria-label={`Move rule ${index + 1} down`}>Move down</button>
        <button type="button" className="small quiet" onClick={() => setDraft(filters.filter((_, position) => position !== index))} aria-label={`Remove rule ${index + 1}`}>Remove</button>
      </div>
    </li>)}</ol>
    <div className="row">
      <button disabled={filters.length >= MAX_CAPTURE_RULES} onClick={() => setDraft([...filters, { condition: 'any', itemId: 'capture-kit' }])}>Add capture rule</button>
      {draft && <><button className="primary" disabled={disabled} onClick={async () => { if (await run({ type: 'setCaptureFilters', filters })) setDraft(null) }}>Save capture rules</button><button onClick={() => setDraft(null)}>Discard changes</button></>}
    </div>
    {filters.length >= MAX_CAPTURE_RULES && <small>Maximum {MAX_CAPTURE_RULES} rules.</small>}
  </section>
}

export function FormationPanel({ state, disabled, run }: GamePanelProps) {
  const order = state.activities[TENDER_ID]
  const inCombat = order?.order.kind === 'battle' && activityAssigned(order)
  const editingDisabled = disabled || inCombat
  const team = buildFormation(state)
  const active = state.formation
  const available = state.buds.filter((bud) => !active.includes(bud.id) && !isBudCommitted(state, bud.id))
  function move(index: number, step: number) {
    const reordered = [...active]
    const [budId] = reordered.splice(index, 1)
    reordered.splice(index + step, 0, budId)
    void run({ type: 'setFormation', budIds: reordered })
  }

  return <div className="stack">
    <header className="section-heading"><h1 tabIndex={-1}>Formation</h1><p>Order up to five Buds from the frontline back. The Tender joins the fight once the frontline Buds fall.</p></header>
    {inCombat && <p className="banner">Stop the active patrol before changing your formation or gear.</p>}
    <section className="surface stack" aria-label="Lineup">
      <div className="spread"><h2>Lineup</h2><span className="tag">{active.length}/5 Buds</span></div>
      {active.length === 0 && <Empty>Your Tender is fighting solo.</Empty>}
      {active.length > 0 && <ol className="clean-list stack">{team.buds.map((unit, index) => <li key={unit.id}>
        <div className="spread"><div><h3>{unit.name}</h3><small>{unit.attack} Attack · {unit.health} Health · {unit.ability}{unit.technique && ` · ${unit.technique}`}</small></div>
          <div className="row">
            <button className="small quiet" disabled={editingDisabled || index === 0} onClick={() => move(index, -1)} aria-label={`Move ${unit.name} forward`}>Forward</button>
            <button className="small quiet" disabled={editingDisabled || index === active.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${unit.name} back`}>Back</button>
            <button className="small" disabled={editingDisabled} onClick={() => void run({ type: 'setFormation', budIds: active.filter((id) => id !== unit.id) })} aria-label={`Remove ${unit.name} from formation`}>Remove</button>
          </div>
        </div>
      </li>)}</ol>}
      <div className="surface subtle spread"><h3>Tender</h3><small>{team.commander.attack} Attack · {team.commander.health} Health{team.commander.technique && ` · ${team.commander.technique}`}</small></div>
      {available.length > 0 && active.length < 5 && <div className="row">{available.map((bud) => <button key={bud.id} disabled={editingDisabled} onClick={() => void run({ type: 'setFormation', budIds: [...active, bud.id] })}>Add {budName(state, bud.id)} · {bud.id}</button>)}</div>}
      {state.buds.length === 0 && <a href="#combat">Go to patrols to catch your first Bud</a>}
    </section>
    <section className="surface stack" aria-label="Tender equipment">
      <h2>Tender equipment</h2>
      {(['weapon', 'armor'] as GearSlot[]).map((slot) => <div className="stack tight" key={slot}>
        <label>{slot === 'weapon' ? 'Weapon' : 'Armor'}<select value={state.loadout[slot] ?? ''} disabled={editingDisabled} onChange={(event) => void run({ type: 'equip', slot, gearId: event.target.value || null })}>
          <option value="">Unequipped</option>{state.equipment.filter((gear) => gear.slot === slot).map((gear) => {
            const definition = GEAR_DEFINITIONS[gear.definitionId]
            const skill = definition.skill ?? 'Vitality'
            const eligible = levelForXp(state.xp[skill]) >= definition.level
            return <option key={gear.id} value={gear.id} disabled={!eligible}>{definition.name} +{gear.bonus}{gear.technique && ` · ${gear.technique}`}{gear.maker && ` · Made by ${gear.maker}`}{!eligible && ` · Requires ${skill} level ${definition.level}`}</option>
          })}
        </select></label>
      </div>)}
      <a href="#crafting">See equipment recipes</a>
    </section>
  </div>
}
