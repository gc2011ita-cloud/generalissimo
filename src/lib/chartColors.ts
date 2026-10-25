import { useSyncExternalStore } from 'react'

// Palette di riferimento validata (skill dataviz): slot 1 blu, slot 2 arancio; passi distinti per il tema scuro.
const LIGHT = { s1: '#2a78d6', s2: '#eb6834', grid: '#e4e1d8', text: '#52514e', surface: '#ffffff' }
const DARK = { s1: '#3987e5', s2: '#d95926', grid: '#2e3a35', text: '#c3c2b7', surface: '#1e2a26' }

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb)
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => obs.disconnect()
}

export function useChartColors() {
  const dark = useSyncExternalStore(subscribe, () => document.documentElement.classList.contains('dark'))
  return dark ? DARK : LIGHT
}
