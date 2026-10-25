import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { Category, TransactionType } from '../../db/schema'

const byOrder = (a: Category, b: Category) => a.order - b.order || a.name.localeCompare(b.name)

export function useCategories(type?: TransactionType) {
  return useLiveQuery(async () => {
    const all = (await db.categories.toArray()).filter((c) => c.deletedAt === null)
    return all.filter((c) => !type || c.type === type).sort(byOrder)
  }, [type])
}

export function useCategoryMap() {
  return useLiveQuery(async () => new Map((await db.categories.toArray()).map((c) => [c.id, c])))
}

export function useAccounts() {
  return useLiveQuery(async () => (await db.accounts.toArray()).filter((a) => a.deletedAt === null))
}

export function useTransactions(from?: string, to?: string) {
  return useLiveQuery(async () => {
    const q = from && to ? db.transactions.where('date').between(from, to, true, true) : db.transactions.toCollection()
    return (await q.toArray()).filter((t) => t.deletedAt === null)
  }, [from, to])
}

/** Ultimi movimenti di un tipo, per ordinare le categorie per uso recente. */
export function useRecentTransactions(type: TransactionType, limit = 60) {
  return useLiveQuery(
    async () =>
      (await db.transactions.orderBy('date').reverse().filter((t) => t.deletedAt === null && t.type === type).limit(limit).toArray()),
    [type, limit],
  )
}
