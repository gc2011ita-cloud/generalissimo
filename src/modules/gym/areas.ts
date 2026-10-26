// Aree del corpo per raggruppare gli esercizi (dal gruppo muscolare dell'esercizio).

export const AREAS = ['Pettorali', 'Schiena', 'Spalle', 'Braccia', 'Gambe', 'Core', 'Altro'] as const
export type Area = (typeof AREAS)[number]

const BY_MUSCLE: Record<string, Area> = {
  Petto: 'Pettorali',
  Dorso: 'Schiena',
  Spalle: 'Spalle',
  Bicipiti: 'Braccia',
  Tricipiti: 'Braccia',
  Quadricipiti: 'Gambe',
  Femorali: 'Gambe',
  Glutei: 'Gambe',
  Polpacci: 'Gambe',
  Core: 'Core',
}

export const areaOf = (muscleGroup: string): Area => BY_MUSCLE[muscleGroup] ?? 'Altro'

/** Raggruppa per area nell'ordine fisso di AREAS, saltando le aree vuote. */
export function groupByArea<T>(items: readonly T[], muscleOf: (item: T) => string): [Area, T[]][] {
  return AREAS.map((a) => [a, items.filter((i) => areaOf(muscleOf(i)) === a)] as [Area, T[]]).filter(([, l]) => l.length > 0)
}
