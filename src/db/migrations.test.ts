import { describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { migrateRows } from './migrations'

describe('migrazioni', () => {
  it('v1 → v2 aggiunge i campi nuovi senza toccare gli altri', () => {
    expect(migrateRows('transactions', [{ id: 't', amount: 5 }], 1, 2)).toEqual([{ id: 't', amount: 5, tags: [] }])
    expect(migrateRows('categories', [{ id: 'c', name: 'Casa' }], 1, 2)).toEqual([{ id: 'c', name: 'Casa', order: 0, hidden: false }])
    expect(migrateRows('workouts', [{ id: 'w', createdAt: 'x' }], 1, 2)[0].endedAt).toBe('x')
    expect(migrateRows('dayLogs', [{ id: 'd' }], 1, 2)).toEqual([{ id: 'd' }])
    expect(migrateRows('transactions', [{ id: 't' }], 2, 2)).toEqual([{ id: 't' }])
  })

  it('un database v1 esistente si aggiorna a v2 con i dati intatti', async () => {
    const { db, SCHEMA_V1 } = await import('./db')
    db.close()
    await Dexie.delete(db.name)
    const v1 = new Dexie(db.name)
    v1.version(1).stores(SCHEMA_V1)
    await v1.table('transactions').add({ id: 't1', date: '2026-10-01', amount: 12.5 })
    await v1.table('categories').add({ id: 'c1', name: 'Casa' })
    await v1.table('workouts').add({ id: 'w1', date: '2026-10-01', createdAt: '2026-10-01T10:00:00Z' })
    v1.close()

    await db.open() // esegue l'upgrade reale di db.ts
    expect(db.verno).toBe(4)
    expect(await db.transactions.get('t1')).toEqual({ id: 't1', date: '2026-10-01', amount: 12.5, tags: [] })
    expect(await db.categories.get('c1')).toEqual({ id: 'c1', name: 'Casa', order: 0, hidden: false })
    expect((await db.workouts.get('w1'))?.endedAt).toBe('2026-10-01T10:00:00Z')
    expect(await db.transactions.where('tags').equals('x').count()).toBe(0) // indice nuovo disponibile
  })
})
