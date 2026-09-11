import { describe, expect, test } from 'bun:test'
import { createHappyDomWindow } from './support/happy-dom'

describe('Happy DOM Bun canary compatibility', () => {
  test('hydrates the missing selector realm intrinsics before Palette uses them', async () => {
    const window = createHappyDomWindow({ url: 'http://localhost/' })
    const realm = window as unknown as { SyntaxError?: typeof SyntaxError; CSS?: { escape?: (value: string) => string } }
    expect(typeof realm.SyntaxError).toBe('function')
    expect(typeof realm.CSS?.escape).toBe('function')
    expect(window.document.querySelector('body')).not.toBeNull()
    const escaped = realm.CSS!.escape!('packet:one')
    const probe = window.document.createElement('div'); probe.id = 'packet:one'; window.document.body.append(probe)
    expect(escaped).not.toBe('packet:one')
    expect(window.document.querySelector(`#${escaped}`)).toBe(probe)
    await window.close()
  })
})
