import type {
  Affinity, CombatSkill, GearSlot, ProductionSkill, Rarity, Skill, Species, Technique, Tier, Upgrade, ZoneId,
} from '../game/types.ts'

export const PRODUCTION_SKILLS: readonly ProductionSkill[] = [
  'Mining', 'Woodcutting', 'Fishing', 'Farming', 'Cooking', 'Crafting', 'Synthesis',
]
export const COMBAT_SKILLS: readonly CombatSkill[] = ['Melee', 'Ranged', 'Resonance', 'Vitality']
export const SKILLS: readonly Skill[] = [...PRODUCTION_SKILLS, ...COMBAT_SKILLS]
export const AFFINITIES: readonly Affinity[] = ['Core', 'Surge', 'Bloom', 'Echo']

export interface ItemDefinition {
  name: string
  tier: Tier
  description: string
}

export const ITEM_DEFINITIONS: Readonly<Record<string, ItemDefinition>> = {
  scrap: { name: 'Iron Scrap', tier: 1, description: 'Reclaimed alloy for capture kits and equipment.' },
  fiber: { name: 'Bramble Fiber', tier: 1, description: 'Tough binding fiber from Earth.' },
  minnow: { name: 'Copperfin', tier: 1, description: 'A small silver fish with a copper stripe.' },
  greens: { name: 'Sun Greens', tier: 1, description: 'Hardy greenhouse greens used in food and compounds.' },
  'portal-dust': { name: 'Portal Dust', tier: 1, description: 'A signature residue left by portal activity.' },
  quartz: { name: 'Prismatic Quartz', tier: 2, description: 'A clear mineral that holds a focused charge.' },
  resin: { name: 'Mirror Resin', tier: 2, description: 'A light-reactive resin from Glassreach.' },
  skater: { name: 'Glass Skater', tier: 2, description: 'A transparent fish from the Glassreach pools.' },
  'mirror-bloom': { name: 'Mirror Bloom', tier: 2, description: 'A reflective flower for tinctures and advanced food.' },
  basalt: { name: 'Tide Basalt', tier: 3, description: 'A dense mineral exposed at low tide.' },
  driftwood: { name: 'Hollow Wood', tier: 3, description: 'Flexible wood washed up from Hollowtide.' },
  eel: { name: 'Lantern Eel', tier: 3, description: 'A deepwater fish with an ember-colored tail.' },
  'tide-kelp': { name: 'Tide Kelp', tier: 3, description: 'A resilient crop from Hollowtide.' },
  'capture-kit': { name: 'Capture Kit', tier: 1, description: 'A basic single-use capture device.' },
  'prism-kit': { name: 'Prism Capture Kit', tier: 2, description: 'An improved single-use capture device.' },
  'tide-kit': { name: 'Tide Capture Kit', tier: 3, description: 'A strong single-use device for difficult encounters.' },
  'trail-stew': { name: 'Trail Stew', tier: 1, description: 'Increases output for Tender gathering for 5 minutes.' },
  'mirror-stew': { name: 'Mirror Stew', tier: 2, description: 'Increases output for Tender gathering for 10 minutes.' },
  'tide-stew': { name: 'Tide Stew', tier: 3, description: 'Increases output for Tender gathering for 15 minutes.' },
  'portal-compound': { name: 'Portal Compound', tier: 1, description: 'Stabilizes equipment and capture devices.' },
  'prism-compound': { name: 'Prism Compound', tier: 2, description: 'A reagent for high-tier portal technology.' },
  'tide-compound': { name: 'Tide Compound', tier: 3, description: 'A refined reagent for the final capture tier.' },
  'brood-tonic': { name: 'Brood Tonic', tier: 1, description: 'Optional tonic that increases odds of parent IV inheritance.' },
}

export const CAPTURE_ITEMS: Readonly<Record<string, number>> = {
  'capture-kit': 0,
  'prism-kit': 22,
  'tide-kit': 40,
}

export interface NodeDefinition {
  name: string
  zoneId: ZoneId
  skill: ProductionSkill
  itemId: string
  level: number
  durationMs: number
  xp: number
}

export const NODES: Readonly<Record<string, NodeDefinition>> = {
  'earth-scrap': { name: 'Salvage Verge', zoneId: 'earth', skill: 'Mining', itemId: 'scrap', level: 1, durationMs: 4_000, xp: 8 },
  'earth-fiber': { name: 'City Brambles', zoneId: 'earth', skill: 'Woodcutting', itemId: 'fiber', level: 1, durationMs: 5_000, xp: 8 },
  'earth-minnow': { name: 'Copper Creek', zoneId: 'earth', skill: 'Fishing', itemId: 'minnow', level: 1, durationMs: 5_000, xp: 8 },
  'earth-greens': { name: 'Sun Gardens', zoneId: 'earth', skill: 'Farming', itemId: 'greens', level: 1, durationMs: 5_000, xp: 8 },
  'glass-quartz': { name: 'Prism Ledges', zoneId: 'glassreach', skill: 'Mining', itemId: 'quartz', level: 3, durationMs: 6_000, xp: 14 },
  'glass-resin': { name: 'Mirror Grove', zoneId: 'glassreach', skill: 'Woodcutting', itemId: 'resin', level: 3, durationMs: 6_000, xp: 14 },
  'glass-skater': { name: 'Shallow Mirrors', zoneId: 'glassreach', skill: 'Fishing', itemId: 'skater', level: 3, durationMs: 6_000, xp: 14 },
  'glass-bloom': { name: 'Refraction Beds', zoneId: 'glassreach', skill: 'Farming', itemId: 'mirror-bloom', level: 3, durationMs: 6_000, xp: 14 },
  'glass-scrap': { name: 'Broken Transit', zoneId: 'glassreach', skill: 'Mining', itemId: 'scrap', level: 1, durationMs: 5_000, xp: 8 },
  'tide-basalt': { name: 'Storm Cliffs', zoneId: 'hollowtide', skill: 'Mining', itemId: 'basalt', level: 5, durationMs: 8_000, xp: 22 },
  'tide-wood': { name: 'Drift Banks', zoneId: 'hollowtide', skill: 'Woodcutting', itemId: 'driftwood', level: 5, durationMs: 8_000, xp: 22 },
  'tide-eel': { name: 'Lantern Shoal', zoneId: 'hollowtide', skill: 'Fishing', itemId: 'eel', level: 5, durationMs: 8_000, xp: 22 },
  'tide-kelp': { name: 'Kelp Gardens', zoneId: 'hollowtide', skill: 'Farming', itemId: 'tide-kelp', level: 5, durationMs: 8_000, xp: 22 },
  'tide-greens': { name: 'Ferry Planters', zoneId: 'hollowtide', skill: 'Farming', itemId: 'greens', level: 1, durationMs: 6_000, xp: 8 },
}

export interface Recipe {
  name: string
  skill: 'Crafting' | 'Cooking' | 'Synthesis'
  level: number
  durationMs: number
  xp: number
  inputs: Readonly<Record<string, number>>
  output: { itemId: string; quantity: number } | { gearId: string }
  discovery?: string
}

export const RECIPES: Readonly<Record<string, Recipe>> = {
  'capture-kit': { name: 'Capture Kit', skill: 'Crafting', level: 1, durationMs: 5_000, xp: 12, inputs: { scrap: 3 }, output: { itemId: 'capture-kit', quantity: 1 } },
  'prism-kit': { name: 'Prism Capture Kit', skill: 'Crafting', level: 3, durationMs: 6_000, xp: 17, inputs: { 'capture-kit': 1, quartz: 1, 'portal-compound': 1 }, output: { itemId: 'prism-kit', quantity: 1 } },
  'tide-kit': { name: 'Tide Capture Kit', skill: 'Crafting', level: 5, durationMs: 8_000, xp: 26, inputs: { 'prism-kit': 1, basalt: 1, 'tide-compound': 1 }, output: { itemId: 'tide-kit', quantity: 1 } },
  'trail-stew': { name: 'Trail Stew', skill: 'Cooking', level: 1, durationMs: 5_000, xp: 12, inputs: { minnow: 1, greens: 1 }, output: { itemId: 'trail-stew', quantity: 1 } },
  'mirror-stew': { name: 'Mirror Stew', skill: 'Cooking', level: 3, durationMs: 6_000, xp: 17, inputs: { 'trail-stew': 1, skater: 1, 'mirror-bloom': 1 }, output: { itemId: 'mirror-stew', quantity: 1 } },
  'tide-stew': { name: 'Tide Stew', skill: 'Cooking', level: 5, durationMs: 8_000, xp: 26, inputs: { 'mirror-stew': 1, eel: 1, 'tide-kelp': 1 }, output: { itemId: 'tide-stew', quantity: 1 } },
  'portal-compound': { name: 'Portal Compound', skill: 'Synthesis', level: 1, durationMs: 5_000, xp: 12, inputs: { 'portal-dust': 1, greens: 1 }, output: { itemId: 'portal-compound', quantity: 1 } },
  'prism-compound': { name: 'Prism Compound', skill: 'Synthesis', level: 3, durationMs: 6_000, xp: 17, inputs: { 'portal-compound': 1, resin: 1, 'mirror-bloom': 1 }, output: { itemId: 'prism-compound', quantity: 1 } },
  'tide-compound': { name: 'Tide Compound', skill: 'Synthesis', level: 5, durationMs: 8_000, xp: 26, inputs: { 'prism-compound': 1, driftwood: 1, eel: 1 }, output: { itemId: 'tide-compound', quantity: 1 } },
  'brood-tonic': { name: 'Brood Tonic', skill: 'Synthesis', level: 2, durationMs: 7_000, xp: 15, inputs: { 'portal-compound': 1, greens: 2 }, output: { itemId: 'brood-tonic', quantity: 1 } },
  'scrap-blade': { name: 'Scrap Blade', skill: 'Crafting', level: 1, durationMs: 7_000, xp: 14, inputs: { scrap: 4, fiber: 1 }, output: { gearId: 'scrap-blade' } },
  'bolt-slinger': { name: 'Bolt Slinger', skill: 'Crafting', level: 1, durationMs: 7_000, xp: 14, inputs: { scrap: 3, fiber: 2 }, output: { gearId: 'bolt-slinger' } },
  'portal-tuner': { name: 'Portal Tuner', skill: 'Crafting', level: 2, durationMs: 7_000, xp: 15, inputs: { scrap: 2, fiber: 2, 'portal-compound': 1 }, output: { gearId: 'portal-tuner' } },
  'fiber-vest': { name: 'Fiber Vest', skill: 'Crafting', level: 1, durationMs: 7_000, xp: 14, inputs: { fiber: 3, scrap: 1 }, output: { gearId: 'fiber-vest' } },
  'prism-vest': { name: 'Prism Vest', skill: 'Crafting', level: 3, durationMs: 7_000, xp: 19, inputs: { quartz: 2, fiber: 3, 'portal-compound': 1 }, output: { gearId: 'prism-vest' } },
  'tide-resonator': { name: 'Tide Resonator', skill: 'Crafting', level: 5, durationMs: 9_000, xp: 28, inputs: { basalt: 2, driftwood: 2, 'tide-compound': 1, scrap: 3 }, output: { gearId: 'tide-resonator' }, discovery: 'tide-resonator' },
}

export interface GearDefinition {
  name: string
  slot: GearSlot
  skill?: Exclude<CombatSkill, 'Vitality'>
  level: number
  minBonus: number
  maxBonus: number
  techniques: readonly Technique[]
}

export const GEAR_DEFINITIONS: Readonly<Record<string, GearDefinition>> = {
  'scrap-blade': { name: 'Scrap Blade', slot: 'weapon', skill: 'Melee', level: 1, minBonus: 1, maxBonus: 3, techniques: ['Strike', 'Guard'] },
  'bolt-slinger': { name: 'Bolt Slinger', slot: 'weapon', skill: 'Ranged', level: 1, minBonus: 1, maxBonus: 3, techniques: ['Strike', 'Guard'] },
  'portal-tuner': { name: 'Portal Tuner', slot: 'weapon', skill: 'Resonance', level: 1, minBonus: 1, maxBonus: 3, techniques: ['Strike', 'Mend'] },
  'fiber-vest': { name: 'Fiber Vest', slot: 'armor', level: 1, minBonus: 2, maxBonus: 5, techniques: ['Guard'] },
  'prism-vest': { name: 'Prism Vest', slot: 'armor', skill: 'Resonance', level: 1, minBonus: 1, maxBonus: 4, techniques: ['Mend', 'Guard'] },
  'tide-resonator': { name: 'Tide Resonator', slot: 'weapon', skill: 'Resonance', level: 3, minBonus: 3, maxBonus: 5, techniques: ['Strike', 'Mend'] },
}

function species(
  id: string, name: string, affinity: Affinity, tier: Tier, rarity: Rarity, attack: number, health: number,
  aptitudes: readonly ProductionSkill[], ability: Technique, breedingGroup: string, capturePenalty: number,
  asexual = false,
): Species {
  const techniques: readonly Technique[] = ability === 'Guard' ? ['Strike', 'Mend'] : ['Guard', ability]
  return { id, name, affinity, tier, rarity, attack, health, aptitudes, ability, techniques, breedingGroup, capturePenalty, asexual }
}

const roster = [
  species('pebbleback', 'Pebbleback', 'Core', 1, 'Common', 2, 8, ['Mining', 'Crafting'], 'Guard', 'Field', 2),
  species('coilbit', 'Coilbit', 'Surge', 1, 'Common', 3, 6, ['Mining', 'Woodcutting'], 'Strike', 'Field', 4),
  species('spriglet', 'Spriglet', 'Bloom', 1, 'Common', 2, 7, ['Woodcutting', 'Farming'], 'Mend', 'Field', 3),
  species('whispermoth', 'Whispermoth', 'Echo', 1, 'Uncommon', 2, 7, ['Woodcutting', 'Synthesis'], 'Guard', 'Field', 8),
  species('tinwhisker', 'Tinwhisker', 'Core', 1, 'Uncommon', 3, 7, ['Mining', 'Fishing', 'Cooking'], 'Strike', 'Field', 8),
  species('shardram', 'Shardram', 'Core', 2, 'Common', 3, 11, ['Mining', 'Crafting'], 'Guard', 'Prism', 18),
  species('sparkshrew', 'Sparkshrew', 'Surge', 2, 'Common', 4, 8, ['Mining', 'Synthesis'], 'Strike', 'Prism', 20),
  species('latticelark', 'Latticelark', 'Bloom', 2, 'Uncommon', 3, 10, ['Woodcutting', 'Farming', 'Cooking'], 'Mend', 'Prism', 24),
  species('mirrorgill', 'Mirrorgill', 'Echo', 2, 'Uncommon', 4, 8, ['Fishing', 'Synthesis'], 'Mend', 'Prism', 25),
  species('beaconorb', 'Beaconorb', 'Surge', 2, 'Rare', 4, 9, ['Crafting', 'Synthesis'], 'Strike', 'Orb', 35, true),
  species('breakwater', 'Breakwater', 'Core', 3, 'Common', 4, 14, ['Mining', 'Fishing'], 'Guard', 'Tidal', 34),
  species('voltrail', 'Voltrail', 'Surge', 3, 'Uncommon', 5, 10, ['Woodcutting', 'Crafting'], 'Strike', 'Tidal', 38),
  species('kelpkeeper', 'Kelpkeeper', 'Bloom', 3, 'Common', 4, 13, ['Farming', 'Fishing', 'Cooking'], 'Mend', 'Tidal', 36),
  species('chantfin', 'Chantfin', 'Echo', 3, 'Uncommon', 4, 12, ['Fishing', 'Synthesis'], 'Mend', 'Tidal', 42),
  species('roothalo', 'Roothalo', 'Bloom', 3, 'Rare', 5, 11, ['Woodcutting', 'Farming'], 'Guard', 'Orb', 50, true),
]
export const SPECIES: Readonly<Record<string, Species>> = Object.fromEntries(roster.map((entry) => [entry.id, entry]))

export interface Zone {
  name: string
  tier: Tier
  description: string
  durationMs: number
  encounters: Readonly<Record<string, number>>
  access?: { previous: ZoneId; wins: number; productionLevel: number }
}

export const ZONES: Readonly<Record<ZoneId, Zone>> = {
  earth: {
    name: 'Earth', tier: 1, description: 'Reclaimed city gardens surrounding the first portal.', durationMs: 12_000,
    encounters: { pebbleback: 25, coilbit: 25, spriglet: 25, whispermoth: 12, tinwhisker: 13 },
  },
  glassreach: {
    name: 'Glassreach', tier: 2, description: 'Bright pools and crystalline forests beyond the first portal.', durationMs: 16_000,
    encounters: { coilbit: 10, shardram: 28, sparkshrew: 24, latticelark: 17, mirrorgill: 17, beaconorb: 4 },
    access: { previous: 'earth', wins: 5, productionLevel: 3 },
  },
  hollowtide: {
    name: 'Hollowtide', tier: 3, description: 'Shifting coasts lit by the creatures beneath the waves.', durationMs: 20_000,
    encounters: { mirrorgill: 10, breakwater: 24, voltrail: 18, kelpkeeper: 27, chantfin: 17, roothalo: 4 },
    access: { previous: 'glassreach', wins: 10, productionLevel: 5 },
  },
}

export interface UpgradeDefinition {
  name: string
  description: string
  maxLevel: number
  coins: number
  items: Readonly<Record<string, number>>
  skill: ProductionSkill
  level: number
}

export const UPGRADES: Readonly<Record<Upgrade, UpgradeDefinition>> = {
  tool: { name: 'Gathering Tools', description: 'Adds +1 primary resource to Tender gathering per level.', maxLevel: 2, coins: 15, items: { scrap: 4, fiber: 2 }, skill: 'Mining', level: 2 },
  worker: { name: 'Coordination Rig', description: 'Adds a permanent Bud work slot per level.', maxLevel: 2, coins: 25, items: { scrap: 5, 'portal-compound': 1 }, skill: 'Crafting', level: 2 },
  storage: { name: 'Storage Racks', description: 'Adds eight shared inventory slots. Item stacks have no quantity cap.', maxLevel: 3, coins: 20, items: { fiber: 5, scrap: 3 }, skill: 'Woodcutting', level: 2 },
  remote: { name: 'Remote Relay', description: 'Lets Buds work at an unlocked node in another zone.', maxLevel: 1, coins: 45, items: { quartz: 2, 'portal-compound': 2 }, skill: 'Crafting', level: 3 },
}

export const FOOD_DURATION: Readonly<Record<string, number>> = {
  'trail-stew': 300_000, 'mirror-stew': 600_000, 'tide-stew': 900_000,
}

export const TRAITS = ['Stalwart', 'Keen', 'Diligent', 'Precise'] as const
