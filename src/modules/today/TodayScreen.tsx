import { useLiveQuery } from 'dexie-react-hooks'
import { Banner, Button, EmptyState, Screen } from '../../components/ui'
import { getSettings } from '../../db/settings'
import { navigate } from '../../lib/router'
import { latestDataUpdatedAt } from '../backup/data'
import { daysSinceBackup, shouldRemindBackup } from '../backup/reminder'

function BackupBanner() {
  const state = useLiveQuery(async () => {
    const [{ lastBackupAt }, lastData] = await Promise.all([
      getSettings(),
      latestDataUpdatedAt({ includeSettings: false }),
    ])
    return { lastBackupAt, hasData: lastData !== null }
  })
  if (!state) return null
  const now = new Date()
  if (!shouldRemindBackup(state.lastBackupAt, now, state.hasData)) return null
  const days = daysSinceBackup(state.lastBackupAt, now)
  return (
    <Banner>
      <p className="font-semibold">
        {days === null ? 'Non hai ancora fatto un backup' : `Ultimo backup ${days} giorni fa`}
      </p>
      <p className="mt-1 text-sm">I dati sono solo su questo iPhone: salvane una copia su File o iCloud.</p>
      <Button variant="primary" className="mt-3" onClick={() => navigate('/settings')}>
        Fai il backup
      </Button>
    </Banner>
  )
}

export function TodayScreen() {
  const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <Screen title="Oggi">
      <p className="-mt-2 text-ox-700 capitalize dark:text-cream/60">{today}</p>
      <BackupBanner />
      <EmptyState text="Qui compariranno obiettivi, abitudini, allenamento, spese e il check-in serale." />
    </Screen>
  )
}
