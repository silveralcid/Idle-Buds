import { useState } from 'react'
import { PRODUCTION_SKILLS } from '../data/index.ts'
import type { Destination } from './view-model.ts'

export const navigationGroups = ['account', 'community', 'activities'] as const
export type NavigationGroup = typeof navigationGroups[number]
export const groupLabels = { account: 'Account', community: 'Community', activities: 'Activities' }
export const defaultEntries: Record<NavigationGroup, Destination[]> = {
  account: ['overview', 'inventory', 'buds', 'formation', 'nursery'],
  community: ['market', 'community', 'ranked'],
  activities: ['combat', ...PRODUCTION_SKILLS],
}
export interface Preferences {
  collapsed: boolean
  activityIcons: boolean
  groups: NavigationGroup[]
  entries: Record<NavigationGroup, Destination[]>
  reducedMotion: boolean
  guide: boolean
}

export function defaultPreferences(): Preferences {
  return { collapsed: false, activityIcons: false, groups: [...navigationGroups], entries: structuredClone(defaultEntries), reducedMotion: false, guide: true }
}

function order<T extends string>(value: unknown, defaults: readonly T[]): T[] {
  const known = Array.isArray(value) ? value.filter((item): item is T => defaults.includes(item)) : []
  return [...new Set([...known, ...defaults])]
}

function readPreferences(key: string): Preferences {
  const defaults = defaultPreferences()
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null') as Partial<Preferences> | null
    if (!saved || typeof saved !== 'object') return defaults
    return {
      collapsed: saved.collapsed === true, activityIcons: saved.activityIcons === true,
      reducedMotion: saved.reducedMotion === true, guide: saved.guide !== false,
      groups: order(saved.groups, navigationGroups),
      entries: Object.fromEntries(navigationGroups.map((group) => [group, order(saved.entries?.[group], defaultEntries[group])])) as Preferences['entries'],
    }
  } catch { return defaults }
}

// Browser preferences contain presentation only. Accounts/progression are always server saved.
export function usePreferences(username: string) {
  const key = `idle-buds:ui:v1:${username.toLowerCase()}`
  const [preferences, setPreferences] = useState(() => readPreferences(key))
  const [stored, setStored] = useState(true)
  function update(change: Partial<Preferences>) {
    setPreferences((current) => {
      const next = { ...current, ...change }
      try { localStorage.setItem(key, JSON.stringify(next)); setStored(true) }
      catch { setStored(false) }
      return next
    })
  }
  return { preferences, update, stored }
}

export function move<T>(items: readonly T[], index: number, direction: number): T[] {
  const next = [...items]
  const target = index + direction
  if (target >= 0 && target < next.length) [next[index], next[target]] = [next[target], next[index]]
  return next
}
