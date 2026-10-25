import { beforeEach, describe, expect, it } from 'vitest'
import { DATA_TABLES, SCHEMA_VERSION, db } from '../../db/db'
import { createRecord, softDelete } from '../../db/repo'
import { getSettings, saveSettings } from '../../db/settings'
import type { DayLog } from '../../db/schema'
import { gunzipToText } from '../../lib/gzip'
import { databaseChunks, restoreBackup } from './data'
import { parseBackupText } from './format'
import { listSnapshots, restoreSnapshot, rotateSnapshots, runAutoSnapshot } from './snapshots'

const dayLog = (date: string, note = ''): Omit<DayLog, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> => ({
  date, overallScore: 7, satisfaction: 4, tiredness: 2, answers: { trained: true },
  bedtime: '23:15', wakeTime: '07:00', improve: '', note,
})

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('database', () => {
  it('ha tutte le tabelle del modello dati', () => {
    expect(DATA_TABLES).toHaveLength(24) // 19 del modello dati + holdingGroups, workoutTemplates, recurring, settings, holdingValues
    expect(db.tables.map((t) => t.name)).toContain('snapshotBlobs')
  })

  it('crea record con UUID e cancella solo logicamente', async () => {
    const r = await createRecord(db.dayLogs, dayLog('2026-10-21'))
    expect(r.id).toMatch(/^[0-9a-f-]{36}$/)
    await softDelete(db.dayLogs, r.id)
    const stored = await db.dayLogs.get(r.id)
    expect(stored?.deletedAt).not.toBeNull()
  })
})

describe('backup e ripristino', () => {
  it('export → import riporta gli stessi dati', async () => {
    await createRecord(db.dayLogs, dayLog('2026-10-20', 'prima'))
    await saveSettings({ theme: 'dark' })
    let text = ''
    for await (const c of databaseChunks()) text += c
    const r = parseBackupText(text, DATA_TABLES, SCHEMA_VERSION)
    expect(r.ok).toBe(true)

    await db.dayLogs.clear()
    await createRecord(db.dayLogs, dayLog('2026-10-21', 'dopo'))
    if (r.ok) await restoreBackup(r.backup)

    const logs = await db.dayLogs.toArray()
    expect(logs.map((l) => l.note)).toEqual(['prima'])
    expect((await getSettings()).theme).toBe('dark')
  })
})

describe('copie interne', () => {
  it('niente copia con il database vuoto', async () => {
    expect(await runAutoSnapshot(new Date(2026, 9, 21))).toBeNull()
  })

  it('una copia al giorno, compressa, solo se qualcosa è cambiato', async () => {
    await createRecord(db.dayLogs, dayLog('2026-10-21', 'x'.repeat(5000)))
    const first = await runAutoSnapshot(new Date(2026, 9, 21))
    expect(first?.kind).toBe('weekly')
    expect(first!.size).toBeLessThan(2000) // 5 KB di testo ripetitivo compressi

    expect(await runAutoSnapshot(new Date(2026, 9, 21, 20))).toBeNull() // stesso giorno
    expect(await runAutoSnapshot(new Date(2026, 9, 22))).toBeNull() // nessuna modifica

    await createRecord(db.dayLogs, dayLog('2026-10-22'))
    expect((await runAutoSnapshot(new Date(2026, 9, 22)))?.kind).toBe('daily')

    const blob = await db.snapshotBlobs.get(first!.id)
    const content = JSON.parse(await gunzipToText(blob!.data))
    expect(content.tables.dayLogs).toHaveLength(1)
  })

  it('ripristino di una copia con copia preventiva dello stato attuale', async () => {
    await createRecord(db.dayLogs, dayLog('2026-10-21', 'buono'))
    const good = await runAutoSnapshot(new Date(2026, 9, 21))
    await db.dayLogs.clear() // "aggiornamento difettoso"
    await createRecord(db.dayLogs, dayLog('2026-10-22', 'rotto'))

    await restoreSnapshot(good!.id)

    expect((await db.dayLogs.toArray()).map((l) => l.note)).toEqual(['buono'])
    const kinds = (await listSnapshots()).map((s) => s.kind)
    expect(kinds).toContain('preRestore')
  })

  it('la rotazione elimina anche il contenuto delle copie', async () => {
    await createRecord(db.dayLogs, dayLog('2026-09-01'))
    for (let d = 1; d <= 12; d++) {
      await createRecord(db.dayLogs, dayLog(`2026-08-${String(d).padStart(2, '0')}`))
      await runAutoSnapshot(new Date(2026, 9, d))
    }
    const list = await listSnapshots()
    expect(list.filter((s) => s.kind !== 'weekly').length).toBeLessThanOrEqual(7)
    expect(list.filter((s) => s.kind === 'weekly').length).toBeLessThanOrEqual(4)
    expect(await db.snapshotBlobs.count()).toBe(list.length)

    await saveSettings({ snapshotMaxBytes: 1 })
    await rotateSnapshots()
    expect(await db.snapshots.count()).toBe(1)
    expect(await db.snapshotBlobs.count()).toBe(1)
  }, 30_000) // 12 copie, ognuna con una pausa di inattività per tabella
})
