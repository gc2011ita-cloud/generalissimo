import { useEffect } from 'react'
import type { ThemePreference } from '../db/schema'

export const THEME_STORAGE_KEY = 'guidodelbue.theme'
const COLORS = { light: '#F7F3EA', dark: '#141C19' }

function apply(pref: ThemePreference) {
  const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? COLORS.dark : COLORS.light)
}

/** Applica il tema e lo segue quando cambia quello di sistema. */
export function useTheme(pref: ThemePreference) {
  useEffect(() => {
    apply(pref)
    // Copia in localStorage letta da index.html prima del primo disegno, contro il lampo di tema.
    try {
      localStorage.setItem(THEME_STORAGE_KEY, pref)
    } catch {
      // localStorage può non essere disponibile: il tema arriva comunque da Dexie.
    }
    if (pref !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref])
}
