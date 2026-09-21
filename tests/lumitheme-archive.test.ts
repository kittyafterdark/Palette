import { describe, expect, test } from 'bun:test'
import { readLumithemeArchiveSource } from '../src/nativeBridge/lumitheme-archive'

function storedZip(name: string, payload: Uint8Array): Uint8Array {
  const encoder = new TextEncoder()
  const filename = encoder.encode(name)
  const local = new Uint8Array(30 + filename.length + payload.length)
  const localView = new DataView(local.buffer)
  localView.setUint32(0, 0x04034b50, true)
  localView.setUint16(4, 20, true)
  localView.setUint16(6, 0, true)
  localView.setUint16(8, 0, true)
  localView.setUint32(18, payload.length, true)
  localView.setUint32(22, payload.length, true)
  localView.setUint16(26, filename.length, true)
  local.set(filename, 30)
  local.set(payload, 30 + filename.length)

  const central = new Uint8Array(46 + filename.length)
  const centralView = new DataView(central.buffer)
  centralView.setUint32(0, 0x02014b50, true)
  centralView.setUint16(4, 20, true)
  centralView.setUint16(6, 20, true)
  centralView.setUint16(8, 0, true)
  centralView.setUint16(10, 0, true)
  centralView.setUint32(20, payload.length, true)
  centralView.setUint32(24, payload.length, true)
  centralView.setUint16(28, filename.length, true)
  centralView.setUint32(42, 0, true)
  central.set(filename, 46)

  const eocd = new Uint8Array(22)
  const eocdView = new DataView(eocd.buffer)
  eocdView.setUint32(0, 0x06054b50, true)
  eocdView.setUint16(8, 1, true)
  eocdView.setUint16(10, 1, true)
  eocdView.setUint32(12, central.length, true)
  eocdView.setUint32(16, local.length, true)

  const archive = new Uint8Array(local.length + central.length + eocd.length)
  archive.set(local, 0)
  archive.set(central, local.length)
  archive.set(eocd, local.length + central.length)
  return archive
}

describe('.lumitheme archive source inspection', () => {
  test('reads authored theme.json CSS/TSX and asset manifest without host canonicalization', async () => {
    const theme = {
      format: 3,
      name: 'Slate',
      author: 'Rivelle',
      description: 'Source fidelity fixture',
      createdAt: 1789945136,
      bundleId: 'bundle-original',
      globalCSS: '@import url("https://example.com/global.css");\n:root { --fixture: 1; }',
      components: {
        MinimalMessage: {
          css: '@import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond");\n.minimal { display: grid; }',
          tsx: 'export default function MinimalMessage() { return null }',
          enabled: true,
        },
      },
      assets: [{ slug: 'assets/star.svg', originalFilename: 'star.svg', mimeType: 'image/svg+xml', archivePath: 'assets/001-star.svg' }],
    }
    const bytes = storedZip('theme.json', new TextEncoder().encode(JSON.stringify(theme)))
    const source = await readLumithemeArchiveSource(bytes)

    expect(source.format).toBe(3)
    expect(source.name).toBe('Slate')
    expect(source.globalCSS).toContain('@import url(')
    expect(source.components.MinimalMessage.css).toContain('fonts.googleapis.com')
    expect(source.components.MinimalMessage.tsx).toContain('MinimalMessage')
    expect(source.components.MinimalMessage.enabled).toBe(true)
    expect(source.assets).toEqual([{ slug: 'assets/star.svg', originalFilename: 'star.svg', mimeType: 'image/svg+xml', archivePath: 'assets/001-star.svg' }])
  })

  test('fails closed when theme.json is missing', async () => {
    const bytes = storedZip('not-theme.json', new TextEncoder().encode('{}'))
    await expect(readLumithemeArchiveSource(bytes)).rejects.toThrow('theme.json is missing')
  })
})
