import { useState } from 'react'
import { AFFINITIES, NODES, SPECIES, ZONES } from '../data/index.ts'
import { activityAssigned, BREEDING_MS, breedingPreview, isBudCommitted } from '../game/breeding.ts'
import { budCombatStats } from '../game/battle.ts'
import { budLevelForXp, levelForXp, workerCapacity } from '../game/progression.ts'
import { LEARN_MIN_LEVEL, MAX_BUDS, MAX_EGGS, TENDER_ID } from '../game/limits.ts'
import type { Bud } from '../game/types.ts'
import { BudMark, Empty, Modal } from './shared.tsx'
import { activityName, budName, duration, itemName, number, speciesName } from './view-model.ts'
import type { GamePanelProps } from './shared.tsx'

export function CollectionPanel(props: GamePanelProps) {
  const { state } = props
  const [filter, setFilter] = useState('')
  const [sort, setSort] = useState('recent')
  const [view, setView] = useState<'owned' | 'field'>('owned')
  const collection = state.buds.filter((bud) => !filter || SPECIES[bud.speciesId].affinity === filter)
  const fieldGuide = Object.values(SPECIES).filter((species) => !filter || species.affinity === filter)
  if (sort === 'level') collection.sort((x, y) => y.xp - x.xp)
  else if (sort === 'name') collection.sort((x, y) => speciesName(x.speciesId).localeCompare(speciesName(y.speciesId)))
  else collection.reverse()
  const ownedSpecies = new Set(state.buds.map((bud) => bud.speciesId))
  return <div className="stack">
    <header className="section-heading"><h1 tabIndex={-1}>Collection</h1><p>{state.buds.length}/{MAX_BUDS} specimens · {ownedSpecies.size}/{Object.keys(SPECIES).length} species owned</p></header>
    <div className="spread">
      <div className="segmented" aria-label="Collection view">
        <button aria-pressed={view === 'owned'} onClick={() => setView('owned')}>My Buds</button>
        <button aria-pressed={view === 'field'} onClick={() => setView('field')}>Species catalog</button>
      </div>
      <div className="row">
        <label>Affinity<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">All affinities</option>{AFFINITIES.map((affinity) => <option key={affinity}>{affinity}</option>)}</select></label>
        {view === 'owned' && <label>Sort Buds<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recent">Newest first</option><option value="level">Highest XP</option><option value="name">Species name</option></select></label>}
      </div>
    </div>
    {view === 'owned' ? <>
      {state.buds.length === 0 ? <Empty>Craft a Capture Kit and win an Earth patrol to earn your first Bud. <a href="#combat">Go to Combat</a></Empty> : collection.length === 0 && <Empty>No owned Buds match this affinity.</Empty>}
      <div className="grid">{collection.map((bud) => <BudCard key={bud.id} bud={bud} {...props} />)}</div>
    </> : <div className="grid">{fieldGuide.map((species) => <article key={species.id} className="surface stack tight">
      <div className="bud-heading"><BudMark speciesId={species.id} /><div><h2>{species.name}</h2><small>{species.affinity} · Tier {species.tier} · {species.rarity}</small></div></div>
      <div className="row"><span className={ownedSpecies.has(species.id) ? 'tag live' : 'tag'}>{ownedSpecies.has(species.id) ? 'Owned' : 'Uncollected'}</span><span className="tag">{species.breedingGroup} group</span></div>
      <p>{species.aptitudes.join(', ')}</p>
      <p className="muted">{species.ability} signature · {Object.values(ZONES).filter((zone) => Object.hasOwn(zone.encounters, species.id)).map((zone) => zone.name).join(', ')}</p>
    </article>)}</div>}
  </div>
}

function BudCard({ bud, state, disabled, run }: GamePanelProps & { bud: Bud }) {
  const species = SPECIES[bud.speciesId]
  const trainedLevel = budLevelForXp(bud.xp)
  const stats = budCombatStats(bud)
  const occupied = isBudCommitted(state, bud.id)
  const working = activityAssigned(state.activities[bud.id])
  const tenderOrder = state.activities[TENDER_ID]
  const inCombat = tenderOrder?.order.kind === 'battle' && activityAssigned(tenderOrder)
  const trainingLock = inCombat ? 'Stop the active patrol first.' : occupied && !state.formation.includes(bud.id) ? 'Remove this Bud from work or breeding first.'
    : trainedLevel < LEARN_MIN_LEVEL || levelForXp(state.xp.Vitality) < LEARN_MIN_LEVEL ? `Requires Bud level ${LEARN_MIN_LEVEL} and Vitality level ${LEARN_MIN_LEVEL}.` : null
  const workCount = Object.values(state.activities).filter((activity) => activity.workerId !== TENDER_ID && activityAssigned(activity)).length
  const [releaseOpen, setReleaseOpen] = useState(false)
  const [donor, setDonor] = useState('')
  const [condenseOpen, setCondenseOpen] = useState(false)
  const [technique, setTechnique] = useState(species.techniques[0])
  const workNodes = Object.entries(NODES).filter(([, node]) => species.aptitudes.includes(node.skill) &&
    state.unlockedZones.includes(node.zoneId) && (state.zoneId === node.zoneId || state.upgrades.remote > 0) && levelForXp(state.xp[node.skill]) >= node.level)
  const freeNodes = workNodes.filter(([id]) => !Object.values(state.activities).some((activity) => activityAssigned(activity) && activity.order.kind === 'gather' && activity.order.nodeId === id))
  const donors = state.buds.filter((candidate) => candidate.id !== bud.id && candidate.speciesId === bud.speciesId && !candidate.protected && !isBudCommitted(state, candidate.id))
  const donorId = donors.some((candidate) => candidate.id === donor) ? donor : donors[0]?.id ?? ''
  return <article className="surface stack" aria-label={`${species.name} ${bud.id}`}>
    <div className="bud-heading"><BudMark speciesId={bud.speciesId} large /><div><h2>{species.name}</h2><small>{species.affinity} · {species.rarity} · {bud.sex} · {bud.id}</small></div></div>
    <div className="row"><span className="tag">Lv {trainedLevel}</span><span className="tag">{bud.trait}</span>{bud.protected && <span className="tag live">Protected</span>}{occupied && <span className="tag live">{working ? 'Assigned' : state.formation.includes(bud.id) ? 'In formation' : 'Breeding'}</span>}</div>
    <dl className="stat-line bud-stats"><div><dt>Attack</dt><dd>{stats.attack}</dd></div><div><dt>Health</dt><dd>{stats.health}</dd></div><div><dt>Signature</dt><dd>{species.ability}</dd></div></dl>
    <small>Aptitudes · {species.aptitudes.join(', ')}</small>
    {working ? <p>Assigned to {activityName(state.activities[bud.id].order)}.</p> : !occupied && workCount < workerCapacity(state) && (
      <div className="stack tight">
        <h3>Gather with {species.name}</h3>
        {freeNodes.length ? <div className="row">{freeNodes.map(([id, node]) => <button key={id} className="primary" disabled={disabled} onClick={() => void run({ type: 'startActivity', workerId: bud.id, order: { kind: 'gather', nodeId: id } })}>Assign to {node.name}</button>)}</div> : <small>Free a compatible node or check the Bud’s aptitude skills for more assignments.</small>}
      </div>
    )}
    <details>
      <summary>Inspect {species.name}</summary>
      <div className="stack">
        <dl className="stat-line bud-stats">{Object.entries(bud.ivs).map(([stat, value]) => <div key={stat}><dt className="capitalize">{stat} IV</dt><dd>{value}/10</dd></div>)}</dl>
        <small>{number(bud.xp)} XP · Bond {bud.bond} · {species.breedingGroup} breeding group</small>
        <p>{bud.technique ? `Learned technique · ${bud.technique}` : 'No learned technique'}</p>
        <div className="form-grid">
          <label>Learnable technique<select value={technique} onChange={(event) => setTechnique(event.target.value as typeof technique)}>{species.techniques.map((entry) => <option key={entry}>{entry}</option>)}</select></label>
          <button disabled={disabled || Boolean(trainingLock) || technique === bud.technique} onClick={() => void run({ type: 'teachBud', budId: bud.id, technique })}>Teach technique</button>
        </div>
        {trainingLock && <small>{trainingLock}</small>}
        <div className="row">
          <button disabled={disabled} onClick={() => void run({ type: 'protectBud', budId: bud.id, protected: !bud.protected })}>{bud.protected ? 'Remove protection' : 'Protect Bud'}</button>
          {!occupied && !bud.protected && <button className="danger" disabled={disabled} onClick={() => setReleaseOpen(true)}>Release Bud</button>}
        </div>
        {!occupied && bud.bond < 3 && donors.length > 0 && <div className="form-grid">
          <label>Condensation donor<select value={donorId} onChange={(event) => setDonor(event.target.value)}>{donors.map((candidate) => <option key={candidate.id} value={candidate.id}>{species.name} · {candidate.id}</option>)}</select></label>
          <button disabled={disabled} onClick={() => setCondenseOpen(true)}>Condense duplicate</button>
        </div>}
      </div>
    </details>
    {releaseOpen && <Modal title={`Release ${species.name}?`} close={() => setReleaseOpen(false)}><div className="stack">
      <p>{species.name} ({bud.id}) will permanently leave your collection.</p>
      <div className="row"><button onClick={() => setReleaseOpen(false)}>Keep Bud</button><button className="danger" disabled={disabled} onClick={async () => { await run({ type: 'releaseBud', budId: bud.id, confirm: true }); setReleaseOpen(false) }}>Release permanently</button></div>
    </div></Modal>}
    {condenseOpen && <Modal title="Condense duplicate Bud?" close={() => setCondenseOpen(false)}><div className="stack">
      <p>The donor ({donorId}) will permanently leave your collection to improve the bond of {species.name} ({bud.id}).</p>
      <div className="row"><button onClick={() => setCondenseOpen(false)}>Keep both Buds</button><button className="danger" disabled={disabled} onClick={async () => { await run({ type: 'condenseBud', budId: bud.id, donorId, confirm: true }); setCondenseOpen(false) }}>Condense permanently</button></div>
    </div></Modal>}
  </article>
}

export function NurseryPanel({ state, now, disabled, run }: GamePanelProps) {
  const [primaryId, setPrimary] = useState('')
  const [secondaryId, setSecondary] = useState('')
  const [useTonic, setTonic] = useState(false)
  const readyParents = state.buds.filter((bud) => !isBudCommitted(state, bud.id))
  const preview = breedingPreview(state, primaryId, secondaryId)
  const tonic = state.inventory['brood-tonic'] ?? 0
  const { breeding, eggs } = state
  return <div className="stack">
    <header className="section-heading"><h1 tabIndex={-1}>Nursery</h1><p>Pair compatible Buds, incubate their eggs, and inspect each hatchling in your collection.</p></header>
    <section className="surface stack">
      <h2>Breeding pair</h2>
      {breeding ? <div className="surface subtle spread"><strong>{budName(state, breeding.primaryId)} × {budName(state, breeding.secondaryId)}</strong><span className="tag live">{breeding.readyAt > now ? `Egg in ${duration(breeding.readyAt - now)}` : 'Processing egg…'}</span></div> : readyParents.length < 2 ?
        <Empty>Breeding requires two compatible Buds free from work and formation. <a href="#buds">View your Buds</a></Empty> : <form className="stack" onSubmit={(event) => { event.preventDefault(); void run({ type: 'breed', primaryId, secondaryId, enhanced: useTonic && tonic > 0 }) }}>
          <div className="form-grid">{([['Primary parent', primaryId, setPrimary], ['Partner', secondaryId, setSecondary]] as const).map(([label, chosen, setChosen]) => <label key={label}>{label}<select value={chosen} required onChange={(event) => setChosen(event.target.value)}>
            <option value="">Choose Bud</option>{readyParents.map((bud) => <option key={bud.id} value={bud.id}>{budName(state, bud.id)} · {bud.sex} · {SPECIES[bud.speciesId].breedingGroup} · {bud.id}</option>)}
          </select></label>)}</div>
          {preview.speciesId && <p>Offspring species · <strong>{speciesName(preview.speciesId)}</strong></p>}
          {preview.reason && <p className="muted">{preview.reason}</p>}
          <label className="check"><input type="checkbox" checked={useTonic && tonic > 0} disabled={!tonic} onChange={(event) => setTonic(event.target.checked)} /> Use one Brood Tonic ({tonic} available)</label>
          <small>Each IV may come from either parent or be rolled anew. {itemName('brood-tonic')} increases the odds of inheriting an IV.</small>
          <div className="row"><button className="primary" disabled={disabled || Boolean(preview.reason)}>Begin breeding</button><small>{duration(BREEDING_MS)} · {useTonic && tonic > 0 ? '1 Brood Tonic' : 'No materials required'}</small></div>
        </form>}
    </section>
    <section className="surface stack">
      <div className="spread"><h2>Incubator</h2><span className="tag">{eggs.length}/{MAX_EGGS} eggs</span></div>
      {eggs.length === 0 && <Empty>No eggs incubating. Breed a pair or look for wild eggs on patrol after your first catch.</Empty>}
      <ul className="list">{eggs.map((egg) => <li className="surface subtle spread" key={egg.id}>
        <div><strong>{speciesName(egg.speciesId)} egg</strong><p className="muted">{egg.source === 'wild' ? 'Wild egg' : 'Bred egg'} · {egg.readyAt <= state.lastAt ? 'Ready to hatch' : egg.readyAt <= now ? 'Checking incubation…' : duration(egg.readyAt - now)}</p></div>
        <button disabled={disabled || egg.readyAt > state.lastAt || state.buds.length >= MAX_BUDS} onClick={() => void run({ type: 'hatch', eggId: egg.id })}>Hatch egg</button>
      </li>)}</ul>
      {state.buds.length >= MAX_BUDS && <small className="attention">Make space in your collection before hatching an egg.</small>}
    </section>
  </div>
}
