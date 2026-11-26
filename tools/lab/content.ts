import {
  AFFINITIES, CAPTURE_ITEMS, FOOD_DURATION, GEAR_DEFINITIONS, ITEM_DEFINITIONS,
  NODES, PRODUCTION_SKILLS, RECIPES, SKILLS, SPECIES, UPGRADES, ZONES,
} from '../../src/data/catalog.ts'

export const currentCatalog = {
  items: ITEM_DEFINITIONS, nodes: NODES, recipes: RECIPES, gear: GEAR_DEFINITIONS,
  species: SPECIES, zones: ZONES, upgrades: UPGRADES,
  captureItems: CAPTURE_ITEMS, food: FOOD_DURATION,
}
export type Catalog = typeof currentCatalog
export interface ContentFinding { code: string; path: string; message: string }

/** Static references and material graph only. This is not a combat or pacing proof. */
export function validateContent(catalog: Catalog = currentCatalog) {
  const errors: ContentFinding[] = []
  const warnings: ContentFinding[] = []
  const check = (condition: unknown, code: string, path: string, message: string) => {
    if (!condition) errors.push({ code, path, message })
  }
  const exists = (table: object, key: string) => Object.hasOwn(table, key)
  const positive = (value: number) => Number.isSafeInteger(value) && value > 0
  const item = (id: string, path: string) => check(exists(catalog.items, id), 'unknown_item', path, `Unknown item: ${id}`)
  const consumed = new Set<string>()
  const obtainable = new Set<string>()

  // These two non-catalog grants are implemented in activities.ts and encounters.ts.
  // Keep explicit so a new hard-coded reward requires a deliberate validator update.
  item('portal-dust', 'implicit_rewards.portal-dust')
  if (exists(catalog.items, 'portal-dust')) obtainable.add('portal-dust')
  const discoveries = new Set(['tide-resonator'])

  for (const [id, node] of Object.entries(catalog.nodes)) {
    const path = `nodes.${id}`
    item(node.itemId, `${path}.itemId`)
    if (exists(catalog.items, node.itemId)) obtainable.add(node.itemId)
    check(exists(catalog.zones, node.zoneId), 'unknown_zone', path, `Unknown zone: ${node.zoneId}`)
    check(PRODUCTION_SKILLS.includes(node.skill), 'unknown_skill', path, `Unknown production skill: ${node.skill}`)
    check(positive(node.durationMs) && positive(node.xp) && positive(node.level), 'invalid_node_values', path, 'Duration, XP and level must be positive integers.')
  }
  for (const [id, recipe] of Object.entries(catalog.recipes)) {
    const path = `recipes.${id}`
    check(['Crafting', 'Cooking', 'Synthesis'].includes(recipe.skill), 'invalid_recipe_skill', path, `Invalid recipe skill: ${recipe.skill}`)
    check(positive(recipe.durationMs) && positive(recipe.xp) && positive(recipe.level), 'invalid_recipe_values', path, 'Duration, XP and level must be positive integers.')
    check(Object.keys(recipe.inputs).length > 0, 'empty_recipe_inputs', path, 'A recipe must consume at least one material.')
    for (const [input, quantity] of Object.entries(recipe.inputs)) {
      item(input, `${path}.inputs.${input}`)
      consumed.add(input)
      check(positive(quantity), 'invalid_quantity', `${path}.inputs.${input}`, 'Input quantity must be a positive integer.')
    }
    if ('itemId' in recipe.output) {
      item(recipe.output.itemId, `${path}.output`)
      check(positive(recipe.output.quantity), 'invalid_quantity', `${path}.output`, 'Output quantity must be a positive integer.')
    } else check(exists(catalog.gear, recipe.output.gearId), 'unknown_gear', `${path}.output`, `Unknown gear: ${recipe.output.gearId}`)
    if (recipe.discovery) check(discoveries.has(recipe.discovery), 'unknown_discovery', path, `No registered discovery grant: ${recipe.discovery}`)
  }
  for (const [id, gear] of Object.entries(catalog.gear)) {
    check(['weapon', 'armor'].includes(gear.slot), 'invalid_slot', `gear.${id}`, `Invalid gear slot: ${gear.slot}`)
    check(positive(gear.level) && Number.isSafeInteger(gear.minBonus) && gear.minBonus >= 0
      && Number.isSafeInteger(gear.maxBonus) && gear.maxBonus >= gear.minBonus,
    'invalid_gear_values', `gear.${id}`, 'Gear level and bonus range are invalid.')
    if (gear.skill) check(SKILLS.includes(gear.skill), 'unknown_skill', `gear.${id}`, `Unknown gear skill: ${gear.skill}`)
    check(gear.techniques.length > 0 && gear.techniques.every(t => ['Strike', 'Guard', 'Mend'].includes(t)),
      'unknown_technique', `gear.${id}`, 'Gear has an empty or unknown technique list.')
  }
  for (const [id, species] of Object.entries(catalog.species)) {
    check(species.id === id, 'species_id_mismatch', `species.${id}`, 'Species key must match its ID.')
    check(AFFINITIES.includes(species.affinity), 'unknown_affinity', `species.${id}`, `Unknown affinity: ${species.affinity}`)
    check(positive(species.attack) && positive(species.health), 'invalid_species_stats', `species.${id}`, 'Base attack and health must be positive integers.')
    check(species.aptitudes.every(skill => PRODUCTION_SKILLS.includes(skill)), 'unknown_skill', `species.${id}`, 'Unknown work aptitude.')
  }
  const reachableZones = new Set<string>()
  for (const [id, zone] of Object.entries(catalog.zones)) {
    if (!zone.access) reachableZones.add(id)
    else check(exists(catalog.zones, zone.access.previous), 'unknown_zone', `zones.${id}.access`, `Unknown prerequisite zone: ${zone.access.previous}`)
    check(positive(zone.durationMs), 'invalid_duration', `zones.${id}`, 'Encounter duration must be positive.')
    check(Object.keys(zone.encounters).length > 0, 'empty_encounters', `zones.${id}`, 'Zone must have an encounter.')
    for (const [speciesId, weight] of Object.entries(zone.encounters)) {
      check(exists(catalog.species, speciesId), 'unknown_species', `zones.${id}.encounters`, `Unknown species: ${speciesId}`)
      check(positive(weight), 'invalid_weight', `zones.${id}.encounters.${speciesId}`, 'Encounter weight must be a positive integer.')
    }
  }
  for (let pass = 0; pass < Object.keys(catalog.zones).length; pass += 1) {
    for (const [id, zone] of Object.entries(catalog.zones)) if (zone.access && reachableZones.has(zone.access.previous)) reachableZones.add(id)
  }
  for (const id of Object.keys(catalog.zones)) check(reachableZones.has(id), 'unreachable_zone', `zones.${id}`, 'No prerequisite chain reaches an initially available zone.')
  for (const [id, upgrade] of Object.entries(catalog.upgrades)) {
    if (id === 'remote') continue // Retired definition retained for legacy-save compatibility.
    check(positive(upgrade.maxLevel) && positive(upgrade.level) && positive(upgrade.coins), 'invalid_upgrade', `upgrades.${id}`, 'Upgrade values must be positive integers.')
    for (const [input, quantity] of Object.entries(upgrade.items)) {
      item(input, `upgrades.${id}.items`)
      consumed.add(input)
      check(positive(quantity), 'invalid_quantity', `upgrades.${id}.items.${input}`, 'Upgrade quantity must be positive.')
    }
  }
  for (const [kind, table] of [['captureItems', catalog.captureItems], ['food', catalog.food]] as const) {
    for (const id of Object.keys(table)) { item(id, `${kind}.${id}`); consumed.add(id) }
  }
  item('brood-tonic', 'breeding.enhanced')
  consumed.add('brood-tonic')

  // Fixed-point material reachability permits a cycle with an externally obtainable input.
  // It intentionally ignores XP gates, inventory management and combat feasibility.
  for (let pass = 0; pass < Object.keys(catalog.recipes).length; pass += 1) {
    for (const recipe of Object.values(catalog.recipes)) {
      if ('itemId' in recipe.output && Object.keys(recipe.inputs).every(input => obtainable.has(input))) obtainable.add(recipe.output.itemId)
    }
  }
  for (const [id, recipe] of Object.entries(catalog.recipes)) {
    for (const input of Object.keys(recipe.inputs)) check(obtainable.has(input), 'unreachable_material', `recipes.${id}.inputs.${input}`, `No registered material source reaches ${input}.`)
  }
  for (const id of Object.keys(catalog.items)) {
    check(obtainable.has(id), 'unobtainable_item', `items.${id}`, `No registered material source reaches ${id}.`)
    if (!consumed.has(id)) warnings.push({ code: 'no_registered_consumer', path: `items.${id}`, message: 'No recipe, upgrade, food, capture or breeding consumer is registered; trading is not counted.' })
  }
  return {
    status: errors.length ? 'failed' as const : 'passed' as const,
    scope: 'Static catalog references, values and material/prerequisite graphs. Does not prove playable unlocks, acquisition costs, balance, or fun.',
    counts: { items: Object.keys(catalog.items).length, nodes: Object.keys(catalog.nodes).length, recipes: Object.keys(catalog.recipes).length, species: Object.keys(catalog.species).length },
    errors, warnings, reachableItems: [...obtainable].sort(), reachableZones: [...reachableZones].sort(),
  }
}
