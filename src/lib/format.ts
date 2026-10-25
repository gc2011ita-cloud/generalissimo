const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
const eur0 = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const num = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 })

export const formatEUR = (n: number) => eur.format(n)
export const formatEURShort = (n: number) => eur0.format(n)
export const formatNumber = (n: number) => num.format(n)

/** Numero scritto all'italiana ("1.234,5" o "12.5") → 1234.5; null se non valido. */
export function parseDecimal(input: string): number | null {
  const s = input.trim().replace(/\s|€/g, '')
  if (!s) return null
  let normalized = s
  if (s.includes(',')) normalized = s.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) normalized = s.replace(/\./g, '')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

export const round2 = (n: number) => Math.round(n * 100) / 100

const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

/** '2026-10' → 'ottobre 2026' */
export function monthLabel(month: string, short = false) {
  const [y, m] = month.split('-').map(Number)
  const name = MONTHS[m - 1]
  return short ? `${name.slice(0, 3)} ${String(y).slice(2)}` : `${name} ${y}`
}

/** '2026-10-21' → 'mer 21 ott' */
export function dayLabel(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function addMonths(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
