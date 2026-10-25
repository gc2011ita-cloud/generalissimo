import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'

/** Posizioni non eliminate e tutti i loro aggiornamenti. */
export function usePortfolio() {
  return useLiveQuery(async () => {
    const [holdings, values] = await Promise.all([db.holdings.toArray(), db.holdingValues.toArray()])
    const alive = holdings.filter((h) => h.deletedAt === null)
    return { holdings: alive, ids: alive.map((h) => h.id), values: values.filter((v) => v.deletedAt === null) }
  })
}
