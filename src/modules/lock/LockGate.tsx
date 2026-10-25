import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '../../components/ui'
import { getSettings } from '../../db/settings'
import { verifyPasskey } from './webauthn'

/** Dopo quanto tempo in background l'app chiede di nuovo Face ID. */
export const RELOCK_AFTER_MS = 60_000

/** Mostra l'app solo dopo Face ID, se il blocco è attivo. */
export function LockGate({ children }: { children: ReactNode }) {
  const settings = useLiveQuery(() => getSettings())
  const enabled = !!settings?.lockEnabled && !!settings.lockCredentialId
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const hiddenAt = useRef<number | null>(null)
  const autoTried = useRef(false)

  const unlock = useCallback(async () => {
    if (!settings?.lockCredentialId) return
    setBusy(true)
    setError(null)
    try {
      if (await verifyPasskey(settings.lockCredentialId)) setUnlocked(true)
      else setError('Verifica non riuscita.')
    } catch (e) {
      const name = (e as DOMException).name
      setError(name === 'NotAllowedError' ? null : `Sblocco non riuscito: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }, [settings?.lockCredentialId])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') hiddenAt.current = Date.now()
      else if (hiddenAt.current && Date.now() - hiddenAt.current > RELOCK_AFTER_MS) {
        setUnlocked(false)
        autoTried.current = false
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const locked = enabled && !unlocked

  // Primo tentativo automatico; se iOS lo blocca per mancanza di un tocco resta il pulsante.
  useEffect(() => {
    if (locked && !autoTried.current && document.visibilityState === 'visible') {
      autoTried.current = true
      void unlock()
    }
  }, [locked, unlock])

  if (!settings) return null
  if (!locked) return <>{children}</>

  return (
    <div className="px-safe pt-safe flex min-h-dvh flex-col items-center justify-center gap-6 bg-ox-900 text-center text-cream">
      <img src="/icons/icon-192.png" alt="" className="h-24 w-24 rounded-3xl" />
      <div>
        <h1 className="text-2xl font-bold">guidodelbue</h1>
        <p className="mt-1 opacity-70">Bloccata</p>
      </div>
      <Button className="bg-ochre! px-6 text-ox-950!" onClick={unlock} disabled={busy}>
        Sblocca con Face ID
      </Button>
      {error && <p className="max-w-xs text-sm text-cream/80">{error}</p>}
    </div>
  )
}
