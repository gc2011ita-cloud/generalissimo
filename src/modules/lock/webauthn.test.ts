import { describe, expect, it } from 'vitest'
import { authenticatorFlags, fromBase64Url, toBase64Url } from './webauthn'

describe('Face ID (WebAuthn)', () => {
  it('base64url andata e ritorno', () => {
    const bytes = new Uint8Array([0, 251, 255, 62, 63, 1])
    const enc = toBase64Url(bytes)
    expect(enc).not.toMatch(/[+/=]/)
    expect([...fromBase64Url(enc)]).toEqual([...bytes])
  })

  it('legge il flag "utente verificato"', () => {
    const data = new Uint8Array(37)
    data[32] = 0x01
    expect(authenticatorFlags(data)).toEqual({ userPresent: true, userVerified: false })
    data[32] = 0x05
    expect(authenticatorFlags(data)).toEqual({ userPresent: true, userVerified: true })
  })
})
