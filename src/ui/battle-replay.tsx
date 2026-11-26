import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { battleFrame } from '../game/battle-playback.ts'
import type { PlaybackUnit } from '../game/battle-playback.ts'
import type { BattleEvent, BattleResult, BattleUnit } from '../game/types.ts'
import './battle-replay.css'

export function BattleLog({ result }: { result: BattleResult }) {
  return <details className="battle-log"><summary>Battle log · {result.rounds} rounds</summary>
    <ol className="event-log">{result.events.map((event, index) => <li key={index}>{event.text}</li>)}</ol>
  </details>
}

const colors = { Core: '#eeb46a', Surge: '#8ba6ff', Bloom: '#7fe2af', Echo: '#d9a0f5' }

/** Original geometric portraits, drawn for this interface rather than borrowed game art. */
export function BattlePortrait({ unit }: { unit: BattleUnit }) {
  const tender = !unit.affinity
  const variant = (unit.speciesId ?? unit.id).split('').reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 3
  return <svg className="battle-portrait" viewBox="0 0 120 120" aria-hidden="true" style={{ '--creature-color': unit.affinity ? colors[unit.affinity] : '#a8e2ef' } as CSSProperties}>
    <ellipse className="portrait-shadow" cx="60" cy="107" rx="37" ry="7" />
    {tender ? <>
      <path className="portrait-body" d="M24 100 32 78 48 72 72 72 88 78 96 100Z" />
      <path className="portrait-body" d="M35 29 44 18 76 18 85 29 85 61 73 76 47 76 35 61Z" />
      <path className="portrait-glass" d="M40 37 80 37 78 57 42 57Z" />
      <path className="portrait-highlight" d="M49 42 61 42 52 51 44 51Z" />
      <path className="portrait-detail" d="M53 65H67M60 81V98" />
    </> : <>
      {variant === 0 && <path className="portrait-body" d="M31 47 20 15 46 36M74 36 100 15 89 47" />}
      {variant === 1 && <path className="portrait-body" d="M28 48 15 30 41 32M79 32 105 30 92 48" />}
      {variant === 2 && <path className="portrait-body" d="M40 36 47 12 59 30 75 12 81 39" />}
      <path className="portrait-body" d={variant === 1 ? 'M60 30 90 40 102 69 90 93 72 101 40 98 20 82 20 56 36 37Z' : 'M60 29C31 29 18 48 22 77Q25 100 60 102Q95 100 98 77C102 48 89 29 60 29Z'} />
      <ellipse className="portrait-eye" cx="44" cy="62" rx="5" ry="8" />
      <ellipse className="portrait-eye" cx="76" cy="62" rx="5" ry="8" />
      <circle className="portrait-highlight" cx="45" cy="59" r="2" />
      <circle className="portrait-highlight" cx="77" cy="59" r="2" />
      <path className="portrait-detail" d="M53 78Q60 84 67 78M35 99 31 105M85 99 89 105" />
      {unit.affinity === 'Bloom' && <path className="portrait-accent" d="M57 30Q35 11 49 12Q65 14 61 30Q78 8 81 20Q77 33 61 33" />}
      {unit.affinity === 'Core' && <path className="portrait-accent" d="M60 35 70 45 60 53 50 45Z" />}
      {unit.affinity === 'Surge' && <path className="portrait-accent" d="M64 32 55 45 63 45 57 55 74 40 65 40Z" />}
      {unit.affinity === 'Echo' && <path className="portrait-accent" d="M64 33A12 12 0 1 0 70 50A10 10 0 0 1 64 33Z" />}
    </>}
  </svg>
}

function UnitCard({ unit, event, side, compact = false, step }: {
  unit: PlaybackUnit; event: BattleEvent | null; side: 'left' | 'right'; compact?: boolean; step: number
}) {
  const hit = event?.type === 'hit' && event.target === unit.id
  const attacking = event?.type === 'hit' && event.actor === unit.id
  const healing = event?.effect === 'Mend' && event.target === unit.id
  const ability = event?.type === 'ability' && event.actor === unit.id
  return <div className={`fighter ${compact ? 'fighter-compact' : ''} ${unit.defeated ? 'fighter-defeated' : ''}`} data-side={side} data-affinity={unit.affinity}>
    <div key={step} className={`fighter-image ${hit ? 'fighter-hit' : ''} ${attacking ? 'fighter-attack' : ''} ${healing ? 'fighter-heal' : ''}`}>
      <BattlePortrait unit={unit} />
      {!compact && (hit || healing) && <span className={`battle-float ${healing ? 'battle-float-heal' : ''}`}>{healing ? '+' : '−'}{event?.amount}</span>}
      {!compact && ability && <span className="battle-ability">{event.effect}</span>}
      {!compact && unit.defeated && <span className="battle-defeat">Defeated</span>}
    </div>
    <strong className="fighter-name">{unit.name}</strong>
    {!compact && <small>{unit.commander ? 'Commander' : unit.affinity}{unit.ability ? ` · ${unit.ability}` : ''}{unit.technique ? ` · ${unit.technique}` : ''}</small>}
    <div className="fighter-stats"><span aria-label={`${unit.attack} attack`}>⚔ {unit.attack}</span><span aria-label={`${unit.hp} of ${unit.health} health`}>♥ {unit.hp}<small>/{unit.health}</small></span>{unit.shield > 0 && <span title="Guard">◇ {unit.shield}</span>}</div>
    <meter className="fighter-health" aria-label={`${unit.name} health`} min={0} max={unit.health} value={unit.hp} />
  </div>
}

export interface BattleReplayProps {
  result: BattleResult
  battleId: string
  leftLabel?: string
  rightLabel?: string
  viewerSide?: 'left' | 'right'
  autoPlay?: boolean
}

export function BattleReplay({ result, battleId, leftLabel = 'Your formation', rightLabel = 'Opposition', viewerSide = 'left', autoPlay = true }: BattleReplayProps) {
  const [recording, setRecording] = useState({ id: battleId, result, leftLabel, rightLabel })
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(autoPlay)
  const [speed, setSpeed] = useState(1)
  const newest = useRef({ id: battleId, result, leftLabel, rightLabel })
  const frame = battleFrame(recording.result, step)
  const hasFrame = frame !== null
  const completed = step >= recording.result.events.length
  const hasNewer = recording.id !== battleId

  useEffect(() => { newest.current = { id: battleId, result, leftLabel, rightLabel } }, [battleId, result, leftLabel, rightLabel])

  useEffect(() => {
    if (!playing || completed || !hasFrame) return
    const timeout = window.setTimeout(() => setStep((value) => Math.min(recording.result.events.length, value + 1)), 650 / speed)
    return () => window.clearTimeout(timeout)
  }, [playing, completed, recording.result, speed, step, hasFrame])

  // Keep only the current recording and the newest server result. Slow playback never builds a backlog.
  useEffect(() => {
    if (!hasNewer || !playing || (!completed && hasFrame)) return
    const timeout = window.setTimeout(() => {
      setRecording(newest.current)
      setStep(0)
    }, 1_200 / speed)
    return () => window.clearTimeout(timeout)
  }, [hasNewer, playing, completed, battleId, speed, hasFrame])

  function latest() {
    setRecording({ id: battleId, result, leftLabel, rightLabel })
    setStep(0)
    setPlaying(true)
  }

  if (!frame) return <section className="battle-replay stack" aria-label="Battle playback">
    <p className="muted">This earlier battle has a log only. New battles include visual playback.</p>
    {hasNewer && <button onClick={latest}>Watch latest battle</button>}
    <BattleLog result={recording.result} />
  </section>

  const frontline = (side: 'left' | 'right') => (frame.event?.type === 'defeat'
    ? frame[side].find((unit) => unit.id === frame.event?.actor) : undefined) ?? frame[side].find((unit) => !unit.defeated)
  const leftFront = frontline('left')
  const rightFront = frontline('right')
  const round = frame.event?.round ?? 1
  const outcome = recording.result.winner === 'draw' ? 'Draw' : recording.result.winner === viewerSide ? 'Victory' : 'Defeat'
  return <section className="battle-replay stack" aria-label="Battle playback" data-battle-id={recording.id}>
    <div className="battle-heading spread">
      <strong>{completed ? outcome : `Round ${round}`}</strong>
      <small>{playing && !completed ? 'Playing' : completed ? 'Complete' : 'Paused'} · {step}/{recording.result.events.length}</small>
      {hasNewer && <button className="small" onClick={latest}>Watch latest battle</button>}
    </div>
    <div className="battle-arena">
      <div className="battle-team-heading"><strong>{recording.leftLabel}</strong><span>VS</span><strong>{recording.rightLabel}</strong></div>
      <div className="battle-frontline">
        {leftFront ? <UnitCard unit={leftFront} event={frame.event} side="left" step={step} /> : <div className="fallen-team">Formation defeated</div>}
        <span className="battle-cross" aria-hidden="true">✦</span>
        {rightFront ? <UnitCard unit={rightFront} event={frame.event} side="right" step={step} /> : <div className="fallen-team">Formation defeated</div>}
      </div>
      <div className="battle-reserves">
        {(['left', 'right'] as const).map((side) => <div key={side} className="battle-lineup" aria-label={`${side === 'left' ? recording.leftLabel : recording.rightLabel} lineup`}>
          {frame[side].map((unit) => <UnitCard key={unit.id} unit={unit} event={null} side={side} compact step={0} />)}
        </div>)}
      </div>
    </div>
    <output className="battle-caption" aria-live={playing ? 'off' : 'polite'}>{frame.event?.text ?? 'Both formations are ready.'}</output>
    <div className="battle-controls" aria-label="Playback controls">
      <button className="primary" onClick={() => { if (completed) setStep(0); setPlaying(!playing || completed) }}>{completed ? 'Replay' : playing ? 'Pause playback' : 'Play'}</button>
      <button disabled={completed} onClick={() => { setPlaying(false); setStep((value) => Math.min(recording.result.events.length, value + 1)) }}>Step</button>
      <button disabled={completed} onClick={() => { setStep(recording.result.events.length); setPlaying(false) }}>Skip</button>
      <label>Speed<select aria-label="Playback speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>{[0.5, 1, 2, 4].map((value) => <option value={value} key={value}>{value}×</option>)}</select></label>
    </div>
    <small className="muted">{autoPlay ? 'Your patrol continues while playback is paused.' : 'Playback does not change the match result.'}</small>
    <BattleLog result={recording.result} />
  </section>
}
