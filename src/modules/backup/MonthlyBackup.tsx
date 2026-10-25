import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Button } from '../../components/ui'
import { getSettings } from '../../db/settings'
import { latestDataUpdatedAt } from './data'
import { buildBackupFile, shareBackupFile } from './exportImport'
import { shouldRemindBackup } from './reminder'

/**
 * Backup mensile: quando sono passati 30 giorni il file è pronto e basta un tocco.
 * iOS non permette a una web app di salvare file su iCloud senza un gesto dell'utente.
 */
export function MonthlyBackup() {
  const due = useLiveQuery(async () => {
    const [{ lastBackupAt }, last] = await Promise.all([getSettings(), latestDataUpdatedAt({ includeSettings: false })])
    return shouldRemindBackup(lastBackupAt, new Date(), last !== null)
  })
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!due) return null

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      const f = file ?? (await buildBackupFile())
      const outcome = await shareBackupFile(f)
      setFile(outcome === 'needsTap' || outcome === 'cancelled' ? f : null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-ochre/20 px-4 py-3 dark:bg-ochre/15">
      <div className="min-w-0 text-sm">
        <p className="font-semibold">Backup del mese</p>
        <p className="opacity-75">{error ?? (file ? 'Pronto: tocca di nuovo per salvarlo' : 'Salvalo su File o iCloud')}</p>
      </div>
      <Button variant="primary" onClick={save} disabled={busy}>
        {file ? 'Salva file' : 'Salva'}
      </Button>
    </div>
  )
}
