// Migrazioni dei record tra versioni dello schema (funzioni pure).
// Usate sia dall'upgrade di Dexie sia dal ripristino di backup fatti con versioni precedenti.

type Row = Record<string, unknown>
type RowMigration = (row: Row) => Row

/** Per ogni versione, le trasformazioni da applicare ai record della versione precedente. */
export const MIGRATIONS: Record<number, Record<string, RowMigration>> = {
  2: {
    transactions: (r) => ({ ...r, tags: Array.isArray(r.tags) ? r.tags : [] }),
    categories: (r) => ({ ...r, order: typeof r.order === 'number' ? r.order : 0, hidden: r.hidden === true }),
    // Gli allenamenti esistenti sono già conclusi.
    workouts: (r) => ({ ...r, endedAt: r.endedAt ?? r.createdAt ?? null }),
    workoutTemplates: (r) => ({
      ...r,
      items: Array.isArray(r.items)
        ? (r.items as Row[]).map((i) => ({ ...i, restSeconds: typeof i.restSeconds === 'number' ? i.restSeconds : 120 }))
        : [],
    }),
  },
}

export function migrateRow(table: string, row: Row, fromVersion: number, toVersion: number): Row {
  let out = row
  for (let v = fromVersion + 1; v <= toVersion; v++) {
    const fn = MIGRATIONS[v]?.[table]
    if (fn) out = fn(out)
  }
  return out
}

export function migrateRows(table: string, rows: Row[], fromVersion: number, toVersion: number): Row[] {
  return fromVersion >= toVersion ? rows : rows.map((r) => migrateRow(table, r, fromVersion, toVersion))
}
