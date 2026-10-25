// Blocco con Face ID tramite una passkey locale (WebAuthn), senza server.
// La verifica avviene sul dispositivo: se iOS restituisce un'asserzione con
// "user verified" la persona ha superato Face ID o il codice del telefono.

export function toBase64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Flag dell'authenticatorData (byte 32): bit 0 = presenza, bit 2 = utente verificato. */
export function authenticatorFlags(authData: ArrayBuffer | Uint8Array) {
  const bytes = authData instanceof Uint8Array ? authData : new Uint8Array(authData)
  const flags = bytes[32] ?? 0
  return { userPresent: (flags & 0x01) !== 0, userVerified: (flags & 0x04) !== 0 }
}

const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n))

export function isLockSupported() {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential && !!navigator.credentials
}

/** Crea la passkey (chiede Face ID). Ritorna il rawId in base64url. */
export async function registerPasskey(): Promise<string> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: 'guidodelbue', id: location.hostname },
      user: { id: randomBytes(16), name: 'guidodelbue', displayName: 'guidodelbue' },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null
  if (!cred) throw new Error('Passkey non creata.')
  return toBase64Url(cred.rawId)
}

/** Chiede Face ID con la passkey salvata. true se l'utente è stato verificato. */
export async function verifyPasskey(credentialId: string): Promise<boolean> {
  const cred = (await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      rpId: location.hostname,
      allowCredentials: [{ type: 'public-key', id: fromBase64Url(credentialId) }],
      userVerification: 'required',
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null
  if (!cred) return false
  const response = cred.response as AuthenticatorAssertionResponse
  return authenticatorFlags(response.authenticatorData).userVerified
}
