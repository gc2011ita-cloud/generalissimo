// Genera i movimenti delle spese ricorrenti scadute, all'avvio e al ritorno in primo piano.

import { db } from '../../db/db'
import { createRecord, updateRecord } from '../../db/repo'
import { toISODate } from '../../lib/dates'
import { occurrences } from './recurring'

let running = false

export async function runRecurring(today = toISODate(new Date())): Promise<number> {
  if (running) return 0
  running = true
  let created = 0
  try {
    const list = (await db.recurring.toArray()).filter((r) => r.deletedAt === null && r.active)
    for (const r of list) {
      const dates = occurrences(r, r.lastGenerated, today)
      for (const date of dates) {
        // Mai due volte lo stesso movimento, anche se la generazione si interrompe a metà.
        const exists = await db.transactions.where('recurringId').equals(r.id).filter((t) => t.date === date).count()
        if (exists) continue
        await createRecord(db.transactions, {
          date, amount: r.amount, type: r.type, categoryId: r.categoryId, accountId: r.accountId,
          scope: r.scope, note: r.name, recurringId: r.id, tags: [],
        })
        created++
      }
      if (dates.length) await updateRecord(db.recurring, r.id, { lastGenerated: dates.at(-1)! })
    }
  } finally {
    running = false
  }
  return created
}

export function scheduleRecurring(): () => void {
  const run = () => void runRecurring().catch((e) => console.error('Ricorrenti non generate', e))
  const onVisible = () => document.visibilityState === 'visible' && run()
  run()
  document.addEventListener('visibilitychange', onVisible)
  return () => document.removeEventListener('visibilitychange', onVisible)
}
