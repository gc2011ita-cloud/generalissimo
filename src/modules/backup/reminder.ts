import { daysBetween } from '../../lib/dates'

export const BACKUP_REMINDER_DAYS = 7

/** Giorni dall'ultimo backup manuale, null se non è mai stato fatto. */
export function daysSinceBackup(lastBackupAt: string | null, now: Date): number | null {
  return lastBackupAt ? daysBetween(new Date(lastBackupAt), now) : null
}

/** Banner in Oggi: backup più vecchio di 7 giorni, o mai fatto quando ci sono già dati. */
export function shouldRemindBackup(lastBackupAt: string | null, now: Date, hasData: boolean) {
  const days = daysSinceBackup(lastBackupAt, now)
  return days === null ? hasData : days > BACKUP_REMINDER_DAYS
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}
