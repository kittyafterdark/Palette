import { describe, expect, test } from 'bun:test'
import { createInitialState } from '../src/project/model'
import { portableRandomUUID } from '../src/utils/random-id'

function withCrypto<T>(value: unknown, run: () => T): T {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value })
  try { return run() }
  finally {
    if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor)
    else delete (globalThis as { crypto?: unknown }).crypto
  }
}

describe('portable browser IDs', () => {
  test('uses native randomUUID when the secure-context API exists', () => {
    const expected = '12345678-1234-4abc-8def-123456789abc'
    const id = withCrypto({ randomUUID: () => expected }, () => portableRandomUUID())
    expect(id).toBe(expected)
  })

  test('falls back to getRandomValues when randomUUID is unavailable on HTTP browser sessions', () => {
    const id = withCrypto({
      getRandomValues(bytes: Uint8Array) {
        for (let index = 0; index < bytes.length; index += 1) bytes[index] = index
        return bytes
      },
    }, () => portableRandomUUID())
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(id).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f')
  })

  test('Palette initial state can boot when crypto exists without randomUUID', () => {
    const state = withCrypto({
      getRandomValues(bytes: Uint8Array) {
        for (let index = 0; index < bytes.length; index += 1) bytes[index] = (index * 17 + 3) & 0xff
        return bytes
      },
    }, () => createInitialState())
    expect(state.activeProjectId).toMatch(/^project_[0-9a-f-]{36}$/)
    expect(state.projects[0]?.id).toBe(state.activeProjectId)
  })
})
