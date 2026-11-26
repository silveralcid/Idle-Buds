import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { SPECIES } from '../data/index.ts'
import type { Affinity, PlayerView } from '../game/types.ts'
import { itemName, number } from './view-model.ts'
import type { RunCommand } from './api.ts'

export interface GamePanelProps {
  state: PlayerView
  now: number
  disabled: boolean
  run: RunCommand
}

export function Amounts({ items, inventory }: { items: Record<string, number>; inventory?: Record<string, number> }) {
  return <ul className="amounts">{Object.entries(items).map(([id, amount]) => {
    const owned = inventory?.[id] ?? 0
    return <li className={inventory && owned < amount ? 'shortfall' : ''} key={id}>
      <span>{itemName(id)}</span><strong>{number(amount)}</strong>{inventory && <small>{number(owned)} owned</small>}
    </li>
  })}</ul>
}

const affinityIcons: Record<Affinity, string> = { Core: '◆', Surge: 'ϟ', Bloom: '✿', Echo: '◒' }

export function BudMark({ speciesId, large = false }: { speciesId: string; large?: boolean }) {
  const species = SPECIES[speciesId]
  return <div className={`bud-mark ${large ? 'bud-mark-large' : ''}`} data-affinity={species.affinity} aria-hidden="true">
    <span>{affinityIcons[species.affinity]}</span>
  </div>
}

export function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialog.current?.showModal() }, [])
  return <dialog ref={dialog} aria-labelledby="dialog-title" onCancel={close} onClose={close}>
    <h2 id="dialog-title">{title}</h2>
    {children}
  </dialog>
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>
}
