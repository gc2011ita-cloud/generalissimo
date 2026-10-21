import { db } from './db'
import { nowISO } from './repo'
import type { Settings } from './schema'

export const SETTINGS_ID = 'app'
export const DEFAULT_SNAPSHOT_MAX_BYTES = 20 * 1024 * 1024

export function defaultSettings(): Settings {
  const now = nowISO()
  return {
    id: SETTINGS_ID,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    theme: 'system',
    goalThresholds: { onTrack: 0.9, behind: 0.7, staleDays: 7 },
    notificationTime: '21:30',
    lastBackupAt: null,
    lastPriceUpdateAt: null,
    snapshotMaxBytes: DEFAULT_SNAPSHOT_MAX_BYTES,
  }
}

/** Unisce ai default: un backup di una versione precedente può non avere campi nuovi. */
export function withDefaults(stored: Partial<Settings> | undefined): Settings {
  return { ...defaultSettings(), ...stored }
}

export async function getSettings(): Promise<Settings> {
  return withDefaults(await db.settings.get(SETTINGS_ID))
}

export async function saveSettings(changes: Partial<Omit<Settings, 'id' | 'createdAt'>>) {
  const current = await getSettings()
  await db.settings.put({ ...current, ...changes, updatedAt: nowISO() })
}
