import { useState } from 'react'
import { Button } from '../../components/ui'
import { saveSettings } from '../../db/settings'
import { isLockSupported, registerPasskey, verifyPasskey } from '../lock/webauthn'

export function LockSection({ enabled, credentialId }: { enabled: boolean; credentialId: string | null }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setMessage(null)
    try {
      await fn()
    } catch (e) {
      const name = (e as DOMException).name
      setMessage(name === 'NotAllowedError' ? 'Operazione annullata.' : `Non riuscito: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const enable = () =>
    run(async () => {
      const id = await registerPasskey()
      await saveSettings({ lockEnabled: true, lockCredentialId: id })
      setMessage('Blocco attivo: Face ID verrà chiesto a ogni apertura.')
    })

  const disable = () =>
    run(async () => {
      if (credentialId && !(await verifyPasskey(credentialId))) throw new Error('verifica non riuscita')
      await saveSettings({ lockEnabled: false, lockCredentialId: null })
      setMessage('Blocco disattivato.')
    })

  if (!isLockSupported()) {
    return <p className="text-sm opacity-70">Questo dispositivo non supporta il blocco con Face ID nelle web app.</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ox-700 dark:text-cream/70">
        Chiede Face ID (o il codice del telefono) all'apertura e dopo un minuto in background. Usa una passkey nel
        Portachiavi di iCloud: nessun dato esce dal telefono.
      </p>
      {enabled ? (
        <Button onClick={disable} disabled={busy}>
          Disattiva blocco
        </Button>
      ) : (
        <Button variant="primary" onClick={enable} disabled={busy}>
          Attiva blocco con Face ID
        </Button>
      )}
      {message && <p className="text-sm font-medium">{message}</p>}
    </div>
  )
}
