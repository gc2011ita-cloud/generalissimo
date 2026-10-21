import { describe, expect, it } from 'vitest'
import { BACKUP_APP, BACKUP_FORMAT, backupChunks, parseBackupText, validateBackup } from './format'

const tables = ['dayLogs', 'settings']
const header = { app: BACKUP_APP, format: BACKUP_FORMAT, schemaVersion: 1, exportedAt: '2026-10-21T20:00:00Z' } as const

async function collect(gen: AsyncIterable<string>) {
  let s = ''
  for await (const c of gen) s += c
  return s
}

describe('backup JSON', () => {
  it('i pezzi formano un JSON valido e completo', async () => {
    const data: Record<string, unknown[]> = { dayLogs: [{ id: 'a', note: 'ciao "x"' }], settings: [] }
    const text = await collect(backupChunks(header, tables, async (t) => data[t]))
    expect(JSON.parse(text)).toEqual({ ...header, tables: data })
    const r = parseBackupText(text, tables, 1)
    expect(r.ok && r.counts).toEqual({ dayLogs: 1, settings: 0 })
  })

  it('rifiuta file non validi', () => {
    expect(parseBackupText('{', tables, 1).ok).toBe(false)
    expect(validateBackup({ app: 'altro' }, tables, 1).ok).toBe(false)
    expect(validateBackup({ ...header, format: 99, tables: {} }, tables, 1).ok).toBe(false)
    expect(validateBackup({ ...header, tables: { dayLogs: {} } }, tables, 1).ok).toBe(false)
    expect(validateBackup({ ...header, tables: { dayLogs: [{ note: 'senza id' }] } }, tables, 1).ok).toBe(false)
  })

  it('rifiuta backup di una versione più recente del database', () => {
    const r = validateBackup({ ...header, schemaVersion: 2, tables: {} }, tables, 1)
    expect(r.ok).toBe(false)
  })

  it('accetta versioni precedenti e ignora tabelle sconosciute', () => {
    const r = validateBackup({ ...header, tables: { dayLogs: [], vecchia: [{ id: 'z' }] } }, tables, 2)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.ignoredTables).toEqual(['vecchia'])
  })
})
