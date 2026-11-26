export type Affinity = 'Core' | 'Surge' | 'Bloom' | 'Echo'

export type ProductionSkill = 'Mining' | 'Woodcutting' | 'Fishing' | 'Farming' | 'Crafting' | 'Cooking' | 'Synthesis'
export type CombatSkill = 'Melee' | 'Ranged' | 'Resonance' | 'Vitality'
export type Skill = ProductionSkill | CombatSkill
export type ZoneId = 'earth' | 'glassreach' | 'hollowtide'
export type Tier = 1 | 2 | 3
export type IVs = Record<'attack' | 'health' | 'gather' | 'craft', number>
export type Trait = 'Stalwart' | 'Keen' | 'Diligent' | 'Precise'
export type Technique = 'Guard' | 'Strike' | 'Mend'
export type Sex = 'Female' | 'Male' | 'Asexual'
export type Upgrade = 'tool' | 'worker' | 'storage' | 'remote'
export type GearSlot = 'weapon' | 'armor'
export type Rarity = 'Common' | 'Uncommon' | 'Rare'

export interface Species {
  id: string
  name: string
  affinity: Affinity
  tier: Tier
  rarity: Rarity
  attack: number
  health: number
  aptitudes: readonly ProductionSkill[]
  ability: Technique
  techniques: readonly Technique[]
  breedingGroup: string
  asexual?: boolean
  capturePenalty: number
}

export interface Bud {
  id: string
  speciesId: string
  sex: Sex
  ivs: IVs
  trait: Trait
  xp: number
  protected: boolean
  technique?: Technique
  bond: number
}

export interface Gear {
  id: string
  definitionId: string
  slot: GearSlot
  bonus: number
  technique?: Technique
  maker?: string
}

export interface Egg {
  id: string
  speciesId: string
  readyAt: number
  source: 'wild' | 'bred'
}

export interface EggGenetics {
  ivs: IVs
  trait: Trait
  sex: Sex
}

export interface CaptureFilter {
  condition: 'new' | 'rarity' | 'species' | 'affinity' | 'any'
  value?: string
  itemId: string | 'skip'
}

export type ActivityOrder =
  | { kind: 'gather'; nodeId: string; count?: number }
  | { kind: 'craft'; recipeId: string; count?: number | null; markMaker?: boolean }
  | { kind: 'battle'; zoneId: ZoneId; count?: number }

export interface Activity {
  workerId: string
  status: 'running' | 'paused' | 'blocked' | 'complete'
  order: ActivityOrder
  durationMs: number
  nextAt: number | null
  remainingMs: number
  remainingCount: number | null
  queue: ActivityOrder[]
  stopReason?: string
}

export interface BattleUnit {
  id: string
  name: string
  speciesId?: string
  attack: number
  health: number
  affinity?: Affinity
  ability?: Technique
  technique?: Technique
}

export interface BattleTeam {
  buds: BattleUnit[]
  commander: BattleUnit
}

export interface BattleEvent {
  type: 'enter' | 'hit' | 'ability' | 'defeat' | 'end'
  round: number
  actor?: string
  target?: string
  amount?: number
  /** Authoritative resulting target HP for hits and healing. */
  health?: number
  effect?: Technique
  text: string
}

export interface BattleResult {
  version: number
  winner: 'left' | 'right' | 'draw'
  rounds: number
  events: BattleEvent[]
  /** Absent only on saved battles created before visual playback. */
  initial?: { left: BattleTeam; right: BattleTeam }
}

export interface EncounterResult {
  id?: string
  completedAt?: number
  zoneId: ZoneId
  speciesId: string
  battle: BattleResult
  capture: { outcome: 'caught' | 'failed' | 'skipped' | 'unavailable'; reason: string; itemId?: string; chance?: number }
}

export interface Breeding {
  primaryId: string
  secondaryId: string
  speciesId: string
  readyAt: number
  enhanced: boolean
}

export interface GameStats {
  catches: number
  battles: number
  wins: number
  zoneWins: Record<ZoneId, number>
  gathered: number
  crafted: number
  hatched: number
  coinsEarned: number
  coinsSpent: number
}

export interface PendingReward {
  items: Record<string, number>
  gear: Gear[]
}

export type StorageReservation = { kind: 'item'; itemId: string } | { kind: 'gear' } | { kind: 'bud' }

export interface PlayerView {
  version: number
  name: string
  lastAt: number
  zoneId: ZoneId
  unlockedZones: ZoneId[]
  discoveries: string[]
  inventory: Record<string, number>
  pendingRewards: Record<string, PendingReward>
  storageReservations: Record<string, StorageReservation>
  pendingRefundCoins?: number
  coins: number
  xp: Record<Skill, number>
  buds: Bud[]
  equipment: Gear[]
  eggs: Egg[]
  formation: string[]
  loadout: Partial<Record<GearSlot, string>>
  activities: Record<string, Activity>
  upgrades: Record<Upgrade, number>
  captureFilters: CaptureFilter[]
  breeding: Breeding | null
  lastEncounter: EncounterResult | null
  stats: GameStats
  foodUntil: number
}

export interface GameState extends PlayerView {
  seed: string
  rngCounter: number
  nextId: number
  eggGenetics: Record<string, EggGenetics>
}

export interface AdvanceSummary {
  from: number
  to: number
  simulatedMs: number
  discardedMs: number
  cycles: number
  items: Record<string, number>
  xp: Partial<Record<Skill, number>>
  budXp: Record<string, number>
  coins: number
  catches: number
  eggs: number
  stopped: { workerId: string; reason: string }[]
}

export type GameCommand =
  | { type: 'startActivity'; order: ActivityOrder; workerId?: string }
  | { type: 'queueActivity'; order: ActivityOrder; workerId?: string }
  | { type: 'pauseActivity' | 'resumeActivity' | 'stopActivity'; workerId?: string }
  | { type: 'travel' | 'unlockZone'; zoneId: ZoneId }
  | { type: 'buyUpgrade'; upgrade: Upgrade }
  | { type: 'setFormation'; budIds: string[] }
  | { type: 'equip'; slot: GearSlot; gearId: string | null }
  | { type: 'setCaptureFilters'; filters: CaptureFilter[] }
  | { type: 'protectBud'; budId: string; protected: boolean }
  | { type: 'releaseBud'; budId: string; confirm: true }
  | { type: 'condenseBud'; budId: string; donorId: string; confirm: true }
  | { type: 'teachBud'; budId: string; technique: Technique }
  | { type: 'breed'; primaryId: string; secondaryId: string; enhanced?: boolean }
  | { type: 'hatch'; eggId: string }
  | { type: 'eat'; itemId: string }
