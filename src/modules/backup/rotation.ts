// Regole delle copie di sicurezza interne (funzioni pure).
// docs/SPEC.md, "Copie di sicurezza interne".

import { isoWeekKey } from '../../lib/dates'
import type { SnapshotKind } from '../../db/schema'

export const KEEP_DAILY = 7
export const KEEP_WEEKLY = 4

export interface SnapshotInfo {
  id: string
  date: string
  kind: SnapshotKind
  size: number
  createdAt: string
  dataUpdatedAt: string | null
}

/**
 * Decide se oggi serve una copia e di che tipo.
 * - niente dati → niente copia;
 * - al massimo una copia automatica al giorno;
 * - solo se i dati sono cambiati rispetto all'ultima copia (di qualunque tipo);
 * - la prima copia di ogni settimana ISO è "settimanale".
 */
export function decideSnapshot(
  today: string,
  currentDataUpdatedAt: string | null,
  snapshots: readonly SnapshotInfo[],
): Exclude<SnapshotKind, 'preRestore'> | null {
  if (!currentDataUpdatedAt) return null
  if (snapshots.some((s) => s.kind !== 'preRestore' && s.date === today)) return null

  const latest = [...snapshots].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  // Confronto per uguaglianza, non "maggiore di": dopo un ripristino i dati tornano
  // a un updatedAt più vecchio ma sono comunque diversi dall'ultima copia.
  if (latest && latest.dataUpdatedAt === currentDataUpdatedAt) return null

  const week = isoWeekKey(today)
  const hasWeekly = snapshots.some((s) => s.kind === 'weekly' && isoWeekKey(s.date) === week)
  return hasWeekly ? 'daily' : 'weekly'
}

/**
 * Copie da eliminare: si tengono le ultime 7 giornaliere (incluse quelle fatte prima
 * di un ripristino) e le ultime 4 settimanali; poi, se si supera il tetto di spazio,
 * si eliminano le più vecchie, tenendo sempre almeno la più recente.
 */
export function selectSnapshotsToDelete(
  snapshots: readonly SnapshotInfo[],
  maxBytes: number,
): string[] {
  const newestFirst = [...snapshots].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const weekly = newestFirst.filter((s) => s.kind === 'weekly')
  const daily = newestFirst.filter((s) => s.kind !== 'weekly')

  const kept = new Set([
    ...weekly.slice(0, KEEP_WEEKLY).map((s) => s.id),
    ...daily.slice(0, KEEP_DAILY).map((s) => s.id),
  ])
  const toDelete = newestFirst.filter((s) => !kept.has(s.id)).map((s) => s.id)

  const keptNewestFirst = newestFirst.filter((s) => kept.has(s.id))
  let total = keptNewestFirst.reduce((sum, s) => sum + s.size, 0)
  for (let i = keptNewestFirst.length - 1; i > 0 && total > maxBytes; i--) {
    toDelete.push(keptNewestFirst[i].id)
    total -= keptNewestFirst[i].size
  }
  return toDelete
}

export function totalSize(snapshots: readonly { size: number }[]) {
  return snapshots.reduce((sum, s) => sum + s.size, 0)
}
