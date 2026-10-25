// Lettura e ripristino dell'intero database (I/O su Dexie).

import { DATA_TABLES, SCHEMA_VERSION, db } from '../../db/db'
import { migrateRows } from '../../db/migrations'
import { nowISO } from '../../db/repo'
import { ensureSeedData } from '../../db/seed'
import { SETTINGS_ID, withDefaults } from '../../db/settings'
import type { Settings } from '../../db/schema'
import { whenIdle } from '../../lib/idle'
import { BACKUP_APP, BACKUP_FORMAT, backupChunks, type Backup, type BackupHeader } from './format'

export function backupHeader(): BackupHeader {
  return { app: BACKUP_APP, format: BACKUP_FORMAT, schemaVersion: SCHEMA_VERSION, exportedAt: nowISO() }
}

/** JSON del backup a pezzi; con `idle` legge una tabella per volta nei momenti di inattività. */
export function databaseChunks({ idle = false } = {}) {
  return backupChunks(backupHeader(), DATA_TABLES, async (name) => {
    if (idle) await whenIdle()
    return db.table(name).toArray()
  })
}

/** Ultima modifica ai dati (massimo updatedAt su tutte le tabelle), null se vuoto. */
export async function latestDataUpdatedAt({ includeSettings = true } = {}): Promise<string | null> {
  let latest: string | null = null
  for (const name of DATA_TABLES) {
    if (!includeSettings && name === 'settings') continue
    const row = await db.table(name).orderBy('updatedAt').last()
    const value: string | undefined = row?.updatedAt
    if (value && (!latest || value > latest)) latest = value
  }
  return latest
}

/**
 * Sostituisce tutti i dati con quelli del backup, in un'unica transazione:
 * o va a buon fine tutto o non cambia nulla. Le tabelle assenti nel backup restano vuote.
 */
export async function restoreBackup(backup: Backup): Promise<void> {
  const tables = DATA_TABLES.map((name) => db.table(name))
  await db.transaction('rw', tables, async () => {
    const current = await db.settings.get(SETTINGS_ID)
    for (const name of DATA_TABLES) {
      const table = db.table(name)
      await table.clear()
      // Un backup di una versione precedente passa per le stesse migrazioni di Dexie.
      const rows = migrateRows(name, backup.tables[name] ?? [], backup.schemaVersion, SCHEMA_VERSION)
      if (rows.length) await table.bulkPut(rows)
    }
    // Le impostazioni del backup si completano con i default; la data dell'ultimo
    // backup resta la più recente tra quella del telefono e quella del file.
    const restored = withDefaults(backup.tables.settings?.find((r) => r.id === SETTINGS_ID) as Partial<Settings>)
    const lastBackupAt = [current?.lastBackupAt, restored.lastBackupAt]
      .filter((d): d is string => !!d)
      .sort()
      .at(-1) ?? null
    await db.settings.put({ ...restored, lastBackupAt })
  })
  // Un backup senza esercizi o categorie (es. l'import dello storico) riceve quelli di base.
  await ensureSeedData()
}
