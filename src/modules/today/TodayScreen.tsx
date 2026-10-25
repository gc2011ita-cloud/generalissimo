import { useLiveQuery } from 'dexie-react-hooks'
import { Banner, Button, Card, Screen, Stat } from '../../components/ui'
import { db } from '../../db/db'
import { getSettings } from '../../db/settings'
import { toISODate } from '../../lib/dates'
import { dayLabel, formatEUR, formatNumber } from '../../lib/format'
import { navigate } from '../../lib/router'
import { latestDataUpdatedAt } from '../backup/data'
import { daysSinceBackup, shouldRemindBackup } from '../backup/reminder'
import { checkInDate } from '../diary/calc'
import { sumBetween } from '../finance/calc'
import { ACTIVITY_LABELS } from '../gym/ActivityForm'

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
  const today = toISODate(new Date())
  const ciDate = checkInDate(new Date())
  const month = today.slice(0, 7)
  const data = useLiveQuery(async () => {
    const [log, monthTxs, workouts, lastMetric] = await Promise.all([
      db.dayLogs.where('date').equals(ciDate).first(),
      db.transactions.where('date').between(`${month}-01`, `${month}-31`, true, true).toArray(),
      db.workouts.where('date').equals(today).toArray(),
      db.bodyMetrics.orderBy('date').reverse().filter((m) => m.deletedAt === null && m.weight != null).first(),
    ])
    const active = await db.workouts.filter((w) => w.deletedAt === null && w.type === 'gym' && w.endedAt === null).first()
    return {
      log: log?.deletedAt === null ? log : undefined,
      monthTxs,
      workouts: workouts.filter((w) => w.deletedAt === null),
      active,
      lastMetric,
    }
  }, [today, ciDate, month])

  const label = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  const spentToday = data ? sumBetween(data.monthTxs, 'expense', today, today) : 0
  const spentMonth = data ? sumBetween(data.monthTxs, 'expense', `${month}-01`, `${month}-31`) : 0
  const incomeMonth = data ? sumBetween(data.monthTxs, 'income', `${month}-01`, `${month}-31`) : 0

  return (
    <Screen title="Oggi">
      <p className="-mt-2 text-ox-700 capitalize dark:text-cream/60">{label}</p>
      <BackupBanner />

      {data && (
        <>
          <Card>
            {data.log ? (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Giornata chiusa</p>
                  <p className="text-sm opacity-65">Voto {data.log.overallScore ?? '–'} · {dayLabel(ciDate)}</p>
                </div>
                <Button onClick={() => navigate(`/checkin?date=${ciDate}`)}>Modifica</Button>
              </div>
            ) : (
              <Button variant="primary" className="w-full" onClick={() => navigate('/checkin')}>
                Chiudi la giornata
              </Button>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Spese</h2>
              <button type="button" className="min-h-11 text-sm text-ochre-700 dark:text-ochre" onClick={() => navigate(`/finance?m=${month}`)}>
                Dettagli ›
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Oggi" value={formatEUR(spentToday)} />
              <Stat label="Questo mese" value={formatEUR(spentMonth)} />
              <Stat label="Risparmio mese" value={formatEUR(incomeMonth - spentMonth)} tone={incomeMonth - spentMonth >= 0 ? 'pos' : 'neg'} />
            </div>
            <Button className="mt-3 w-full" onClick={() => navigate('/add?tipo=spesa')}>
              + Spesa
            </Button>
          </Card>

          <Card>
            <h2 className="mb-2 font-semibold">Allenamento</h2>
            {data.active ? (
              <Button variant="primary" className="w-full" onClick={() => navigate(`/gym/session?id=${data.active!.id}`)}>
                Riprendi l'allenamento in corso
              </Button>
            ) : data.workouts.length ? (
              <p>
                {data.workouts
                  .map((w) => `${ACTIVITY_LABELS[w.type]}${w.duration ? ` ${w.duration} min` : ''}`)
                  .join(' · ')}{' '}
                ✓
              </p>
            ) : (
              <Button className="w-full" onClick={() => navigate('/gym')}>
                Inizia un allenamento
              </Button>
            )}
            {data.lastMetric?.weight && (
              <p className="mt-2 text-sm opacity-65">
                Ultimo peso: {formatNumber(data.lastMetric.weight)} kg ({dayLabel(data.lastMetric.date)})
              </p>
            )}
          </Card>
        </>
      )}
    </Screen>
  )
}
