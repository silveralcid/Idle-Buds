import { describe, expect, it } from 'vitest'
import { currentCatalog, validateContent } from '../../tools/lab/content.ts'

describe('catalog qualification', () => {
  it('qualifies current material references and labels its limits', () => {
    const report = validateContent()
    expect(report.errors).toEqual([])
    expect(report.status).toBe('passed')
    expect(report.reachableItems).toContain('tide-kit')
    expect(report.reachableZones).toEqual(['earth', 'glassreach', 'hollowtide'])
    expect(report.scope).toContain('Does not prove playable unlocks')
  })

  it('detects an unknown ingredient and a closed material dependency', () => {
    const broken = structuredClone(currentCatalog)
    broken.recipes['capture-kit'].inputs = { missing: 1 }
    broken.recipes['portal-compound'].inputs = { 'prism-compound': 1 }
    const report = validateContent(broken)
    expect(report.status).toBe('failed')
    expect(report.errors).toContainEqual(expect.objectContaining({ code: 'unknown_item', path: 'recipes.capture-kit.inputs.missing' }))
    expect(report.errors).toContainEqual(expect.objectContaining({ code: 'unreachable_material', path: 'recipes.portal-compound.inputs.prism-compound' }))
  })

  it('detects an unreachable zone cycle and invalid timing', () => {
    const broken = structuredClone(currentCatalog)
    broken.zones.glassreach.access!.previous = 'hollowtide'
    broken.nodes['earth-scrap'].durationMs = 0
    const report = validateContent(broken)
    expect(report.errors.filter(error => error.code === 'unreachable_zone')).toHaveLength(2)
    expect(report.errors).toContainEqual(expect.objectContaining({ code: 'invalid_node_values' }))
  })
})
