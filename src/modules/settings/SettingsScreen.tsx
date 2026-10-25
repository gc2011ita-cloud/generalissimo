import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState, type ReactNode } from 'react'
import { Banner, Button, Card, Screen } from '../../components/ui'
import { db } from '../../db/db'
import { getSettings, saveSettings } from '../../db/settings'
import type { ThemePreference } from '../../db/schema'
import { BackLink } from '../more/MoreScreen'
import { buildBackupFile, importBackup, readBackupFile, shareBackupFile } from '../backup/exportImport'
import type { ValidationResult } from '../backup/format'
import { daysSinceBackup, formatBytes } from '../backup/reminder'
import { totalSize } from '../backup/rotation'
import { restoreSnapshot } from '../backup/snapshots'
import { AccountsEditor, CategoriesEditor, CheckInQuestionsEditor, GymSettings } from './ConfigSections'
import { LockSection } from './LockSection'

const TABLE_LABELS: Record<string, string> = {
  dayLogs: 'giornate', goals: 'obiettivi', goalUpdates: 'aggiornamenti obiettivi', goalSteps: 'sotto-passi',
  habits: 'abitudini', habitLogs: 'spunte abitudini', tasks: 'task', studyItems: 'note di studio',
  studySessions: 'sessioni di studio', transactions: 'movimenti', categories: 'categorie', accounts: 'conti',
  holdings: 'posizioni', holdingMoves: 'operazioni', prices: 'prezzi', exercises: 'esercizi',
  workouts: 'allenamenti', workoutSets: 'serie', bodyMetrics: 'misure', holdingGroups: 'gruppi',
  workoutTemplates: 'schede', recurring: 'ricorrenti', settings: 'impostazioni',
}

const KIND_LABELS = { daily: 'Giornaliera', weekly: 'Settimanale', preRestore: 'Prima di un ripristino' }

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </Card>
  )
}

function ThemeSection({ theme }: { theme: ThemePreference }) {
  const options: [ThemePreference, string][] = [['system', 'Automatico'], ['light', 'Chiaro'], ['dark', 'Scuro']]
  return (
    <Section title="Tema">
      <div className="flex rounded-xl bg-ox-900/8 p-1 dark:bg-cream/10">
        {options.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => saveSettings({ theme: value })}
            className={`min-h-10 flex-1 rounded-lg text-sm font-semibold ${
              theme === value ? 'bg-white shadow-sm dark:bg-ox-700' : 'opacity-60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </Section>
  )
}

function BackupSection({ lastBackupAt }: { lastBackupAt: string | null }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [candidate, setCandidate] = useState<Extract<ValidationResult, { ok: true }> | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const share = async (file: File) => {
    const outcome = await shareBackupFile(file)
    setPendingFile(outcome === 'needsTap' ? file : null)
    setMessage(
      { shared: 'Backup salvato.', downloaded: 'Backup scaricato.', cancelled: null, needsTap: null }[outcome],
    )
  }

  const onExport = async () => {
    setBusy(true)
    setMessage(null)
    try {
      await share(await buildBackupFile())
    } catch (e) {
      setMessage(`Backup non riuscito: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const onFileChosen = async (file: File | undefined) => {
    if (!file) return
    setMessage(null)
    const result = await readBackupFile(file)
    if (result.ok) setCandidate(result)
    else setMessage(result.error)
    if (fileInput.current) fileInput.current.value = ''
  }

  const onRestore = async () => {
    if (!candidate) return
    setBusy(true)
    try {
      await importBackup(candidate)
      setMessage('Dati ripristinati. Lo stato precedente è tra le copie interne.')
    } catch (e) {
      setMessage(`Ripristino non riuscito: ${(e as Error).message}`)
    } finally {
      setCandidate(null)
      setBusy(false)
    }
  }

  const days = daysSinceBackup(lastBackupAt, new Date())
  const records = candidate ? Object.entries(candidate.counts).filter(([, n]) => n > 0) : []

  return (
    <Section title="Backup">
      <p className="text-sm text-ox-700 dark:text-cream/70">
        {lastBackupAt
          ? `Ultimo backup: ${fmtDateTime(lastBackupAt)}${days ? ` (${days} giorni fa)` : ''}.`
          : 'Nessun backup fatto finora.'}{' '}
        Una volta al mese la Home ti propone di salvarlo con un tocco su File o iCloud Drive: se elimini l’app dalla Home i dati si perdono.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={onExport} disabled={busy}>
          Esporta backup
        </Button>
        <Button onClick={() => fileInput.current?.click()} disabled={busy}>
          Ripristina da file
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => onFileChosen(e.target.files?.[0])}
        />
      </div>
      {pendingFile && (
        <Banner tone="info">
          <p className="text-sm">Il backup è pronto.</p>
          <Button variant="primary" className="mt-2" onClick={() => share(pendingFile)}>
            Salva il file
          </Button>
        </Banner>
      )}
      {candidate && (
        <Banner>
          <p className="font-semibold">Ripristinare il backup del {fmtDateTime(candidate.backup.exportedAt)}?</p>
          <p className="mt-1 text-sm">
            {records.length
              ? records.map(([t, n]) => `${n} ${TABLE_LABELS[t] ?? t}`).join(' · ')
              : 'Il backup non contiene dati.'}
          </p>
          <p className="mt-1 text-sm">I dati attuali verranno sostituiti; prima ne salvo una copia interna.</p>
          <div className="mt-3 flex gap-2">
            <Button variant="danger" onClick={onRestore} disabled={busy}>
              Ripristina
            </Button>
            <Button onClick={() => setCandidate(null)} disabled={busy}>
              Annulla
            </Button>
          </div>
        </Banner>
      )}
      {message && <p className="text-sm font-medium">{message}</p>}
    </Section>
  )
}

function SnapshotsSection({ maxBytes }: { maxBytes: number }) {
  const snapshots = useLiveQuery(() => db.snapshots.orderBy('createdAt').reverse().toArray(), [])
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [maxMb, setMaxMb] = useState(String(maxBytes / 1024 / 1024).replace('.', ','))

  const onRestore = async (id: string) => {
    setBusy(true)
    setMessage(null)
    try {
      await restoreSnapshot(id)
      setMessage('Copia ripristinata. Lo stato precedente è stato salvato come nuova copia.')
    } catch (e) {
      setMessage(`Ripristino non riuscito: ${(e as Error).message}`)
    } finally {
      setConfirmId(null)
      setBusy(false)
    }
  }

  const saveMax = () => {
    const mb = Number(maxMb.replace(',', '.'))
    if (Number.isFinite(mb) && mb >= 1) saveSettings({ snapshotMaxBytes: Math.round(mb * 1024 * 1024) })
    else setMaxMb(String(maxBytes / 1024 / 1024).replace('.', ','))
  }

  return (
    <Section title="Copie di sicurezza interne">
      <p className="text-sm text-ox-700 dark:text-cream/70">
        Una al giorno, solo se hai modificato qualcosa: ultime 7 giornaliere e 4 settimanali. Proteggono da errori,
        non dalla perdita del telefono.
      </p>
      <p className="text-sm">
        Spazio occupato: <strong>{formatBytes(totalSize(snapshots ?? []))}</strong>
      </p>
      <label className="flex items-center justify-between gap-3 text-sm">
        Limite di spazio (MB)
        <input
          inputMode="decimal"
          value={maxMb}
          onChange={(e) => setMaxMb(e.target.value)}
          onBlur={saveMax}
          className="w-24 rounded-lg bg-ox-900/8 px-3 py-2 text-right dark:bg-cream/10"
        />
      </label>
      {snapshots?.length === 0 && <p className="text-sm opacity-70">Ancora nessuna copia.</p>}
      <ul className="divide-y divide-ox-900/8 dark:divide-cream/10">
        {snapshots?.map((s) => (
          <li key={s.id} className="py-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{fmtDateTime(s.createdAt)}</p>
                <p className="text-sm opacity-70">
                  {KIND_LABELS[s.kind]} · {formatBytes(s.size)}
                </p>
              </div>
              {confirmId !== s.id && (
                <Button onClick={() => setConfirmId(s.id)} disabled={busy}>
                  Ripristina
                </Button>
              )}
            </div>
            {confirmId === s.id && (
              <div className="mt-2 rounded-xl bg-ochre/20 p-3 text-sm dark:bg-ochre/15">
                I dati attuali verranno sostituiti con questa copia (prima ne salvo una dello stato attuale).
                <div className="mt-2 flex gap-2">
                  <Button variant="danger" onClick={() => onRestore(s.id)} disabled={busy}>
                    Conferma
                  </Button>
                  <Button onClick={() => setConfirmId(null)} disabled={busy}>
                    Annulla
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {message && <p className="text-sm font-medium">{message}</p>}
    </Section>
  )
}

export function SettingsScreen() {
  const settings = useLiveQuery(() => getSettings())
  return (
    <Screen title="Impostazioni" back={<BackLink />}>
      {settings && (
        <>
          <Section title="Blocco con Face ID">
            <LockSection enabled={settings.lockEnabled} credentialId={settings.lockCredentialId} />
          </Section>
          <ThemeSection theme={settings.theme} />
          <BackupSection lastBackupAt={settings.lastBackupAt} />
          <Section title="Domande del check-in">
            <CheckInQuestionsEditor questions={settings.checkInQuestions} />
          </Section>
          <Section title="Categorie">
            <CategoriesEditor />
          </Section>
          <Section title="Conti e carte">
            <AccountsEditor />
          </Section>
          <Section title="Palestra">
            <GymSettings progressionKg={settings.progressionKg} defaultRestSeconds={settings.defaultRestSeconds} />
          </Section>
          <SnapshotsSection key={settings.snapshotMaxBytes} maxBytes={settings.snapshotMaxBytes} />
        </>
      )}
      <p className="text-center text-xs opacity-50">guidodelbue · versione {__APP_VERSION__}</p>
    </Screen>
  )
}
