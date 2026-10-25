import { useEffect } from 'react'

/** Tiene lo schermo acceso finché il componente è montato (Screen Wake Lock, iOS ≥ 16.4). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
        if (cancelled) await lock.release()
      } catch {
        // Non disponibile o negato: lo schermo segue le impostazioni del telefono.
      }
    }
    const onVisible = () => document.visibilityState === 'visible' && acquire()
    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => {})
    }
  }, [active])
}
