// Backup manuale: export JSON su File/iCloud con il foglio di condivisione, import per il ripristino.

import { DATA_TABLES, SCHEMA_VERSION } from '../../db/db'
import { nowISO } from '../../db/repo'
import { saveSettings } from '../../db/settings'
import { toISODate } from '../../lib/dates'
import { backupFileName, parseBackupText, type ValidationResult } from './format'
import { databaseChunks, restoreBackup } from './data'
import { createSnapshot } from './snapshots'

export async function buildBackupFile(): Promise<File> {
  const parts: string[] = []
  for await (const chunk of databaseChunks()) parts.push(chunk)
  return new File(parts, backupFileName(toISODate(new Date())), { type: 'application/json' })
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled' | 'needsTap'

/**
 * Condivide il file (iOS: "Salva in File"). Se il foglio di condivisione non è disponibile
 * scarica il file. 'needsTap': Safari ha perso il gesto dell'utente mentre il file veniva
 * preparato, serve un secondo tocco su un pulsante che chiama di nuovo questa funzione.
 */
export async function shareBackupFile(file: File): Promise<ShareOutcome> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Backup guidodelbue' })
    } catch (e) {
      const name = (e as DOMException).name
      if (name === 'AbortError') return 'cancelled'
      if (name === 'NotAllowedError') return 'needsTap'
      throw e
    }
    await saveSettings({ lastBackupAt: nowISO() })
    return 'shared'
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  await saveSettings({ lastBackupAt: nowISO() })
  return 'downloaded'
}

export async function readBackupFile(file: File): Promise<ValidationResult> {
  return parseBackupText(await file.text(), DATA_TABLES, SCHEMA_VERSION)
}

/** Ripristino da file già validato: prima salva una copia interna dello stato attuale. */
export async function importBackup(result: Extract<ValidationResult, { ok: true }>) {
  await createSnapshot('preRestore')
  await restoreBackup(result.backup)
}
