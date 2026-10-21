import type { EntityTable } from 'dexie'
import type { BaseRecord, NewRecord } from './schema'

export const nowISO = () => new Date().toISOString()
export const newId = () => crypto.randomUUID()

export async function createRecord<T extends BaseRecord>(
  table: EntityTable<T, 'id'>,
  data: NewRecord<T>,
): Promise<T> {
  const now = nowISO()
  const record = {
    ...data,
    id: data.id ?? newId(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  } as T
  await table.add(record)
  return record
}

export async function updateRecord<T extends BaseRecord>(
  table: EntityTable<T, 'id'>,
  id: string,
  changes: Partial<Omit<T, keyof BaseRecord>>,
): Promise<void> {
  // Dexie tipizza update() con percorsi annidati: qui basta un oggetto piatto.
  await table.update(id as never, { ...changes, updatedAt: nowISO() } as never)
}

/** Cancellazione logica: il record resta, con deletedAt valorizzato. */
export async function softDelete<T extends BaseRecord>(table: EntityTable<T, 'id'>, id: string) {
  const now = nowISO()
  await table.update(id as never, { deletedAt: now, updatedAt: now } as never)
}

/** Annulla una cancellazione logica ("Annulla" dopo l'eliminazione). */
export async function undoDelete<T extends BaseRecord>(table: EntityTable<T, 'id'>, id: string) {
  await table.update(id as never, { deletedAt: null, updatedAt: nowISO() } as never)
}

export const isAlive = (r: BaseRecord) => r.deletedAt === null
