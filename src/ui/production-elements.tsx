import { GEAR_DEFINITIONS } from '../data/index.ts'

// Source-authored interface glyphs, shared by production and storage.
export function ItemMark({ id, large = false }: { id: string; large?: boolean }) {
  const plant = ['fiber', 'resin', 'greens', 'mirror-bloom', 'driftwood', 'tide-kelp'].includes(id)
  const fish = ['minnow', 'skater', 'eel'].includes(id)
  const crystal = ['quartz', 'basalt', 'portal-dust'].includes(id)
  const gear = GEAR_DEFINITIONS[id]
  const dish = id.endsWith('stew')
  return <span className={`item-mark${large ? ' item-mark-large' : ''}`} data-kind={gear ? gear.slot : plant ? 'plant' : fish ? 'fish' : crystal ? 'crystal' : dish ? 'food' : 'material'} aria-hidden="true">
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {gear?.slot === 'armor' ? <><path d="m24 5 14 6v12c0 9-7 15-14 20-7-5-14-11-14-20V11Z" fill="currentColor" fillOpacity=".18" /><path d="M24 12v23m-8-17 8 8 8-8" /></>
        : gear?.slot === 'weapon' ? <><path d="m32 5 10 1-1 10-18 18-9-9Z" fill="currentColor" fillOpacity=".2" /><path d="m28 18 8-8M11 22l15 15M18 30 8 40m-2-5 7 7" /></>
          : plant ? <><path d="M13 36C4 18 18 9 37 8c2 18-6 31-24 28Z" fill="currentColor" fillOpacity=".2" /><path d="m9 41 22-24m-9 10-2-10m2 10 11-1" /></>
            : fish ? <><path d="M8 24c10-15 25-15 32 0-7 15-22 15-32 0Zm0 0-5-9v18Z" fill="currentColor" fillOpacity=".22" /><path d="M30 17c-3 5-3 9 0 14m-10-19 6-5 5 7" /><circle cx="34" cy="23" r="1.5" fill="currentColor" stroke="none" /></>
              : crystal ? <><path d="m24 4 14 13-4 22-10 5-13-9-1-19Z" fill="currentColor" fillOpacity=".18" /><path d="m24 4 4 17-4 23m4-23 10-4M10 16l18 5-17 14" /></>
                : dish ? <><path d="M6 23h36c-2 12-8 16-18 16S8 35 6 23Z" fill="currentColor" fillOpacity=".2" /><path d="M16 16c-5-4 5-5 0-9m9 9c-5-4 5-5 0-9m8 9c-5-4 5-5 0-9M15 42h18" /></>
                  : id.includes('kit') ? <><rect x="9" y="12" width="30" height="28" rx="6" fill="currentColor" fillOpacity=".16" /><path d="M17 12V7h14v5M9 23h30" /><circle cx="24" cy="25" r="6" fill="var(--surface, #0e1a22)" /><path d="M24 22v6m-3-3h6" /></>
                    : id.includes('compound') || id.includes('tonic') ? <><path d="M19 6h10v13l10 16c2 4 0 7-4 7H13c-4 0-6-3-4-7l10-16Z" fill="currentColor" fillOpacity=".15" /><path d="M17 6h14M14 29h20" /><circle cx="25" cy="34" r="2" /></>
                      : <><path d="m7 25 7-15h22l6 15-9 12H16Z" fill="currentColor" fillOpacity=".2" /><path d="M7 25h35m-28-15 6 15-4 12m20-27-7 15 4 12" /></>}
    </svg>
  </span>
}
