import { useEffect, useRef, useState } from 'react'

type Direction = 'up' | 'down' | 'left' | 'right'
const focusable = 'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]'

function candidates() {
  const root = [...document.querySelectorAll('dialog[open]')].at(-1) ?? document
  return [...root.querySelectorAll<HTMLElement>(focusable)].filter((element) => {
    const rect = element.getBoundingClientRect()
    const hiddenDetails = element.closest('details:not([open])')
    const inSummary = hiddenDetails?.querySelector(':scope > summary')?.contains(element)
    return rect.width > 0 && rect.height > 0 && (!hiddenDetails || inSummary)
      && !element.closest('[hidden],[inert]') && getComputedStyle(element).visibility !== 'hidden'
      && (typeof element.checkVisibility !== 'function' || element.checkVisibility())
  })
}

function navigate(direction: Direction) {
  const all = candidates()
  const active = document.activeElement as HTMLElement | null
  if (!active || !all.includes(active)) { all[0]?.focus(); return }
  const origin = active.getBoundingClientRect()
  const x = origin.x + origin.width / 2, y = origin.y + origin.height / 2
  const horizontal = direction === 'left' || direction === 'right'
  const sign = direction === 'left' || direction === 'up' ? -1 : 1
  const ranked = all.filter((element) => element !== active).map((element) => {
    const rect = element.getBoundingClientRect()
    const dx = rect.x + rect.width / 2 - x, dy = rect.y + rect.height / 2 - y
    const forward = (horizontal ? dx : dy) * sign
    const across = Math.abs(horizontal ? dy : dx)
    return { element, forward, score: forward + across * 2.5 }
  }).filter((entry) => entry.forward > 3).sort((a, b) => a.score - b.score)
  const next = ranked[0]?.element
  if (next) { next.focus({ preventScroll: true }); next.scrollIntoView({ block: 'nearest', inline: 'nearest' }) }
}

function commitSelect(select: HTMLSelectElement, index: number) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
  setter?.call(select, select.options[index].value)
  select.dispatchEvent(new Event('change', { bubbles: true }))
}

export function useController(onMenu: () => void, onBack: () => void) {
  const callbacks = useRef({ onMenu, onBack })
  const [connected, setConnected] = useState(false)
  const [selection, setSelection] = useState<{ label: string; text: string; position: number; total: number } | null>(null)
  useEffect(() => { callbacks.current = { onMenu, onBack } }, [onMenu, onBack])
  useEffect(() => {
    let frame = 0, previous = '', nextRepeat = 0, wasConnected = false
    let editing: { element: HTMLSelectElement; index: number } | null = null
    const clearEditing = () => { editing?.element.removeAttribute('data-controller-edit'); editing = null; setSelection(null) }
    function showSelection() {
      if (!editing) return
      const { element, index } = editing
      setSelection({ label: element.getAttribute('aria-label') ?? element.labels?.[0]?.firstChild?.textContent?.trim() ?? 'Choose', text: element.options[index]?.text ?? '', position: index + 1, total: element.options.length })
    }
    function action(key: string) {
      document.documentElement.dataset.input = 'controller'
      if (key === 'menu') {
        clearEditing()
        const dialog = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].at(-1)
        if (dialog) dialog.close()
        else callbacks.current.onMenu()
        return
      }
      if (key === 'back') {
        if (editing) { clearEditing(); return }
        const dialog = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].at(-1)
        if (dialog) dialog.close()
        else callbacks.current.onBack()
        return
      }
      if (editing && document.activeElement !== editing.element) clearEditing()
      if (key === 'confirm') {
        if (editing) {
          const { element, index } = editing
          if (element.isConnected && !element.disabled && !element.options[index]?.disabled) commitSelect(element, index)
          clearEditing()
          return
        }
        const active = document.activeElement as HTMLElement | null
        if (active instanceof HTMLSelectElement) {
          editing = { element: active, index: active.selectedIndex }
          active.dataset.controllerEdit = 'true'
          showSelection()
        } else if (active instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit'].includes(active.type)) active.focus()
        else active?.click()
        return
      }
      if (editing) {
        const direction = ['up', 'left'].includes(key) ? -1 : 1
        let index = editing.index + direction
        while (index >= 0 && index < editing.element.options.length && editing.element.options[index].disabled) index += direction
        if (index >= 0 && index < editing.element.options.length) { editing.index = index; showSelection() }
      } else navigate(key as Direction)
    }
    function poll(time: number) {
      if (editing && !editing.element.isConnected) clearEditing()
      let pads: (Gamepad | null)[] = []
      try { pads = typeof navigator.getGamepads === 'function' ? [...navigator.getGamepads()] : [] }
      catch { /* Browsers may deny gamepads on HTTP; pointer/keyboard remain available. */ }
      const pad = pads.find((entry) => entry?.connected)
      if (Boolean(pad) !== wasConnected) { wasConnected = Boolean(pad); setConnected(wasConnected) }
      if (pad && !document.hidden) {
        const pressed = (index: number) => pad.buttons[index]?.pressed
        const key = pressed(9) ? 'menu' : pressed(1) ? 'back' : pressed(0) ? 'confirm'
          : pressed(12) || pad.axes[1] < -.55 ? 'up' : pressed(13) || pad.axes[1] > .55 ? 'down'
            : pressed(14) || pad.axes[0] < -.55 ? 'left' : pressed(15) || pad.axes[0] > .55 ? 'right' : ''
        const repeatable = ['up', 'down', 'left', 'right'].includes(key)
        if (key && (key !== previous || repeatable && time >= nextRepeat)) {
          action(key); nextRepeat = time + (key === previous ? 170 : 380)
        }
        previous = key
      } else previous = ''
      frame = requestAnimationFrame(poll)
    }
    function keyboard(event: KeyboardEvent) {
      document.documentElement.dataset.input = 'keyboard'
      const target = event.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || event.altKey || event.ctrlKey || event.metaKey) return
      const direction = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[event.key] as Direction | undefined
      if (direction) { event.preventDefault(); navigate(direction) }
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) callbacks.current.onBack()
    }
    function pointer() { document.documentElement.dataset.input = 'pointer'; clearEditing() }
    window.addEventListener('keydown', keyboard)
    window.addEventListener('pointerdown', pointer)
    frame = requestAnimationFrame(poll)
    return () => { cancelAnimationFrame(frame); clearEditing(); window.removeEventListener('keydown', keyboard); window.removeEventListener('pointerdown', pointer) }
  }, [])
  return { connected, selection }
}
