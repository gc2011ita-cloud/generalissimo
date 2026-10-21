import { describe, expect, it } from 'vitest'
import { decideSnapshot, selectSnapshotsToDelete, type SnapshotInfo } from './rotation'

let n = 0
function snap(date: string, kind: SnapshotInfo['kind'] = 'daily', size = 100, dataUpdatedAt: string | null = 'x'): SnapshotInfo {
  n++
  return { id: `s${n}`, date, kind, size, createdAt: `${date}T10:00:${String(n % 60).padStart(2, '0')}Z`, dataUpdatedAt }
}

describe('decideSnapshot', () => {
  it('nessuna copia se il database è vuoto', () => {
    expect(decideSnapshot('2026-10-21', null, [])).toBeNull()
  })

  it('la prima copia della settimana è settimanale, le altre giornaliere', () => {
    expect(decideSnapshot('2026-10-21', 'a', [])).toBe('weekly')
    expect(decideSnapshot('2026-10-22', 'b', [snap('2026-10-21', 'weekly', 100, 'a')])).toBe('daily')
    expect(decideSnapshot('2026-10-26', 'b', [snap('2026-10-21', 'weekly', 100, 'a')])).toBe('weekly')
  })

  it('al massimo una copia automatica al giorno', () => {
    expect(decideSnapshot('2026-10-21', 'b', [snap('2026-10-21', 'daily', 100, 'a')])).toBeNull()
  })

  it('una copia pre-ripristino non conta come copia del giorno', () => {
    expect(decideSnapshot('2026-10-21', 'b', [snap('2026-10-21', 'preRestore', 100, 'a')])).toBe('weekly')
  })

  it('nessuna copia se non è cambiato nulla', () => {
    expect(decideSnapshot('2026-10-22', 'a', [snap('2026-10-21', 'weekly', 100, 'a')])).toBeNull()
  })

  it('copia anche se i dati tornano più vecchi dopo un ripristino', () => {
    const s = [snap('2026-10-20', 'weekly', 100, '2026-10-20T00:00:00Z')]
    expect(decideSnapshot('2026-10-21', '2026-01-01T00:00:00Z', s)).toBe('daily')
  })
})

describe('selectSnapshotsToDelete', () => {
  const days = (count: number, kind: SnapshotInfo['kind'], size = 100) =>
    Array.from({ length: count }, (_, i) => snap(`2026-09-${String(i + 1).padStart(2, '0')}`, kind, size))

  it('tiene le ultime 7 giornaliere e 4 settimanali', () => {
    const daily = days(10, 'daily')
    const weekly = days(6, 'weekly')
    const del = selectSnapshotsToDelete([...daily, ...weekly], Infinity)
    expect(del.sort()).toEqual([...daily.slice(0, 3), ...weekly.slice(0, 2)].map((s) => s.id).sort())
  })

  it('le copie pre-ripristino contano tra le giornaliere', () => {
    const daily = days(7, 'daily')
    const pre = snap('2026-09-30', 'preRestore')
    expect(selectSnapshotsToDelete([...daily, pre], Infinity)).toEqual([daily[0].id])
  })

  it('oltre il tetto elimina le più vecchie', () => {
    const daily = days(5, 'daily', 300)
    const del = selectSnapshotsToDelete(daily, 1000)
    expect(del).toEqual([daily[0].id, daily[1].id])
  })

  it('tiene sempre la copia più recente, anche se supera il tetto', () => {
    const big = days(2, 'daily', 5000)
    expect(selectSnapshotsToDelete(big, 1000)).toEqual([big[0].id])
  })
})
