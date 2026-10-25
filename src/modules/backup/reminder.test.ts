import { describe, expect, it } from 'vitest'
import { daysSinceBackup, formatBytes, shouldRemindBackup } from './reminder'

const now = new Date(2026, 9, 21, 12)

describe('promemoria backup', () => {
  it('conta i giorni dall’ultimo backup', () => {
    expect(daysSinceBackup(null, now)).toBeNull()
    expect(daysSinceBackup(new Date(2026, 9, 14, 23).toISOString(), now)).toBe(7)
  })

  it('avvisa una volta al mese (oltre 30 giorni)', () => {
    expect(shouldRemindBackup(new Date(2026, 8, 21).toISOString(), now, true)).toBe(false)
    expect(shouldRemindBackup(new Date(2026, 8, 20).toISOString(), now, true)).toBe(true)
  })

  it('se il backup non è mai stato fatto avvisa solo se ci sono dati', () => {
    expect(shouldRemindBackup(null, now, false)).toBe(false)
    expect(shouldRemindBackup(null, now, true)).toBe(true)
  })

  it('formatta le dimensioni', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536)).toBe('1,5 KB')
    expect(formatBytes(20 * 1024 * 1024)).toBe('20,0 MB')
  })
})
