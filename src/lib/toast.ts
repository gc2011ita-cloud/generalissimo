// Avvisi brevi in basso, con "Annulla" al posto delle finestre di conferma.

import { useSyncExternalStore } from 'react'

export interface Toast {
  id: number
  message: string
  undo?: () => void | Promise<void>
}

let current: Toast | null = null
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function showToast(message: string, undo?: Toast['undo'], ms = 5000) {
  clearTimeout(timer)
  current = { id: Date.now(), message, undo }
  emit()
  timer = setTimeout(dismissToast, ms)
}

export function dismissToast() {
  current = null
  emit()
}

export function useToast() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
}
