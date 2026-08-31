/**
 * Return an RFC 4122 v4-style UUID without requiring a secure context.
 *
 * `crypto.randomUUID()` is secure-context-only in browsers, which means a
 * perfectly valid Lumiverse session opened over a plain HTTP LAN/Tailscale
 * address can have `crypto.getRandomValues()` but no `crypto.randomUUID()`.
 * Palette must still be able to boot and persist projects there.
 */
export function portableRandomUUID(): string {
  const cryptoApi = globalThis.crypto
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID()

  const bytes = new Uint8Array(16)
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    cryptoApi.getRandomValues(bytes)
  } else {
    // Last-ditch compatibility fallback. IDs here are local correlation keys,
    // not secrets; modern browsers should take the getRandomValues branch.
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256)
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`
}
