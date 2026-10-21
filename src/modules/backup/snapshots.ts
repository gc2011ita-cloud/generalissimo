// Copie di sicurezza interne: compresse, al massimo una al giorno, in tabelle separate.

import { DATA_TABLES, SCHEMA_VERSION, db } from '../../db/db'
import { newId, nowISO } from '../../db/repo'
import { getSettings } from '../../db/settings'
import type { Snapshot, SnapshotKind } from '../../db/schema'
import { toISODate } from '../../lib/dates'
import { gunzipToText, gzipChunks } from '../../lib/gzip'
import { parseBackupText } from './format'
import { databaseChunks, latestDataUpdatedAt, restoreBackup } from './data'
import { decideSnapshot, selectSnapshotsToDelete } from './rotation'

/** Ritardo dopo che la schermata è pronta: mai all'avvio. */
export const SNAPSHOT_DELAY_MS = 5000

export async function listSnapshots(): Promise<Snapshot[]> {
  return db.snapshots.orderBy('createdAt').reverse().toArray()
}

export async function createSnapshot(kind: SnapshotKind, now = new Date()): Promise<Snapshot> {
  const dataUpdatedAt = await latestDataUpdatedAt()
  const data = await gzipChunks(databaseChunks({ idle: true }))
  const createdAt = nowISO()
  const snapshot: Snapshot = {
    id: newId(),
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    date: toISODate(now),
    kind,
    size: data.byteLength,
    dataUpdatedAt,
    schemaVersion: SCHEMA_VERSION,
  }
  await db.transaction('rw', db.snapshots, db.snapshotBlobs, async () => {
    await db.snapshots.add(snapshot)
    await db.snapshotBlobs.add({ id: snapshot.id, createdAt, updatedAt: createdAt, deletedAt: null, data })
  })
  return snapshot
}

/**
 * Rotazione e tetto di spazio. Unica eccezione alla regola "nessuna cancellazione fisica":
 * le copie servono a non perdere dati, non sono dati, e devono liberare spazio.
 */
export async function rotateSnapshots(): Promise<number> {
  const { snapshotMaxBytes } = await getSettings()
  const ids = selectSnapshotsToDelete(await listSnapshots(), snapshotMaxBytes)
  if (ids.length) {
    await db.transaction('rw', db.snapshots, db.snapshotBlobs, async () => {
      await db.snapshots.bulkDelete(ids)
      await db.snapshotBlobs.bulkDelete(ids)
    })
  }
  return ids.length
}

let running = false

/** Copia automatica, se serve. Ritorna la copia creata o null. */
export async function runAutoSnapshot(now = new Date()): Promise<Snapshot | null> {
  if (running) return null
  running = true
  try {
    const kind = decideSnapshot(toISODate(now), await latestDataUpdatedAt(), await listSnapshots())
    const created = kind ? await createSnapshot(kind, now) : null
    await rotateSnapshots()
    return created
  } finally {
    running = false
  }
}

/** Avvia la copia qualche secondo dopo l'avvio e a ogni ritorno in primo piano. */
export function scheduleAutoSnapshots(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      runAutoSnapshot().catch((e) => console.error('Copia interna non riuscita', e))
    }, SNAPSHOT_DELAY_MS)
  }
  const onVisibility = () => {
    if (document.visibilityState === 'visible') schedule()
    else clearTimeout(timer)
  }
  schedule()
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}

/** Ripristina una copia: prima salva lo stato attuale come copia 'preRestore'. */
export async function restoreSnapshot(id: string): Promise<void> {
  const blob = await db.snapshotBlobs.get(id)
  if (!blob) throw new Error('Copia non trovata.')
  const result = parseBackupText(await gunzipToText(blob.data), DATA_TABLES, SCHEMA_VERSION)
  if (!result.ok) throw new Error(result.error)
  await createSnapshot('preRestore')
  await restoreBackup(result.backup)
}
