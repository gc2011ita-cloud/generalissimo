// Formato del backup JSON e sua validazione (funzioni pure).

export const BACKUP_APP = 'guidodelbue'
export const BACKUP_FORMAT = 1

export interface BackupHeader {
  app: typeof BACKUP_APP
  format: number
  schemaVersion: number
  exportedAt: string
}

export interface Backup extends BackupHeader {
  tables: Record<string, Record<string, unknown>[]>
}

/**
 * Pezzi di testo che compongono il JSON del backup, una tabella alla volta,
 * così export e copie interne non costruiscono mai una stringa unica enorme.
 */
export async function* backupChunks(
  header: BackupHeader,
  tables: readonly string[],
  readTable: (name: string) => Promise<unknown[]>,
): AsyncGenerator<string> {
  const head = JSON.stringify(header)
  yield `${head.slice(0, -1)},"tables":{`
  for (let i = 0; i < tables.length; i++) {
    const rows = await readTable(tables[i])
    yield `${i ? ',' : ''}${JSON.stringify(tables[i])}:${JSON.stringify(rows)}`
  }
  yield '}}'
}

export type ValidationResult =
  | { ok: true; backup: Backup; counts: Record<string, number>; ignoredTables: string[] }
  | { ok: false; error: string }

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

export function validateBackup(
  value: unknown,
  knownTables: readonly string[],
  currentSchemaVersion: number,
): ValidationResult {
  if (!isObject(value) || value.app !== BACKUP_APP) {
    return { ok: false, error: 'Il file non è un backup di guidodelbue.' }
  }
  if (value.format !== BACKUP_FORMAT) {
    return { ok: false, error: `Formato di backup non supportato (${String(value.format)}).` }
  }
  const schemaVersion = value.schemaVersion
  if (typeof schemaVersion !== 'number' || schemaVersion < 1) {
    return { ok: false, error: 'Versione del database mancante nel backup.' }
  }
  if (schemaVersion > currentSchemaVersion) {
    return {
      ok: false,
      error: 'Il backup viene da una versione più recente dell’app: aggiorna l’app e riprova.',
    }
  }
  if (typeof value.exportedAt !== 'string' || !isObject(value.tables)) {
    return { ok: false, error: 'Il backup è incompleto.' }
  }

  const counts: Record<string, number> = {}
  const ignoredTables: string[] = []
  for (const [name, rows] of Object.entries(value.tables)) {
    if (!knownTables.includes(name)) {
      ignoredTables.push(name)
      continue
    }
    if (!Array.isArray(rows)) {
      return { ok: false, error: `Tabella "${name}" non valida.` }
    }
    const bad = rows.findIndex((r) => !isObject(r) || typeof r.id !== 'string' || !r.id)
    if (bad !== -1) {
      return { ok: false, error: `Record ${bad + 1} della tabella "${name}" senza id.` }
    }
    counts[name] = rows.length
  }

  return { ok: true, backup: value as unknown as Backup, counts, ignoredTables }
}

export function parseBackupText(
  text: string,
  knownTables: readonly string[],
  currentSchemaVersion: number,
): ValidationResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Il file non è un JSON valido.' }
  }
  return validateBackup(parsed, knownTables, currentSchemaVersion)
}

export function backupFileName(date: string) {
  return `guidodelbue-backup-${date}.json`
}
