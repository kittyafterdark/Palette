import { describe, expect, test } from 'bun:test'
import { deriveFullImageSource, deriveImageSourceTier } from '../src/preview/image-source-runtime'

describe('image full-source URL derivation', () => {
  test('drops Lumiverse avatar thumbnail tiers while preserving other query params', () => {
    expect(deriveFullImageSource('/api/v1/characters/char-1/avatar?size=lg')).toBe('/api/v1/characters/char-1/avatar')
    expect(deriveFullImageSource('/api/v1/personas/p-1/avatar?size=sm&v=2')).toBe('/api/v1/personas/p-1/avatar?v=2')
  })

  test('upgrades supported image thumbnail routes and refuses to guess unknown URLs', () => {
    expect(deriveFullImageSource('/api/v1/images/image-1/thumbnail/lg')).toBe('/api/v1/images/image-1')
    expect(deriveFullImageSource('/api/v1/images/image-2?size=sm')).toBe('/api/v1/images/image-2')
    expect(deriveFullImageSource('/assets/avatar-thumb.webp')).toBeNull()
    expect(deriveFullImageSource('data:image/png;base64,abc')).toBeNull()
  })
})


describe('image auto-source tier derivation', () => {
  test('can promote supported sources without jumping straight to original', () => {
    expect(deriveImageSourceTier('/api/v1/images/image-1?size=sm', 'lg')).toBe('/api/v1/images/image-1?size=lg')
    expect(deriveImageSourceTier('/api/v1/characters/char-1/avatar?size=sm&v=2', 'lg')).toBe('/api/v1/characters/char-1/avatar?size=lg&v=2')
    expect(deriveImageSourceTier('/api/v1/images/image-1/thumbnail/sm', 'lg')).toBe('/api/v1/images/image-1?size=lg')
    expect(deriveImageSourceTier('/assets/avatar-thumb.webp', 'lg')).toBeNull()
  })
})
