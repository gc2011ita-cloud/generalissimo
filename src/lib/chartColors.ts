import { useSyncExternalStore } from 'react'

// Palette di riferimento validata (skill dataviz), passi distinti per il tema scuro.
// Categorie: 8 slot in ordine fisso; ruoli dei grafici a colonne: entrate, spese, guadagni, perdite.
const LIGHT = {
  s1: '#2a78d6',
  s2: '#eb6834',
  slots: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6'],
  other: '#b9b6ac',
  income: '#1baf7a',
  expense: '#eda100',
  gain: '#2a78d6',
  loss: '#eb6834',
  grid: '#e4e1d8',
  text: '#52514e',
  surface: '#ffffff',
}
const DARK: typeof LIGHT = {
  s1: '#3987e5',
  s2: '#d95926',
  slots: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9'],
  other: '#5c5b55',
  income: '#199e70',
  expense: '#c98500',
  gain: '#3987e5',
  loss: '#d95926',
  grid: '#2e3a35',
  text: '#c3c2b7',
  surface: '#1e2a26',
}

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb)
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => obs.disconnect()
}

export function useChartColors() {
  const dark = useSyncExternalStore(subscribe, () => document.documentElement.classList.contains('dark'))
  return dark ? DARK : LIGHT
}
