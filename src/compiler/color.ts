function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)) }

export interface RgbaColor { r: number; g: number; b: number; alpha: number }

/** Small, dependency-free parser for the hex formats emitted by native color inputs. */
export function parseHexColor(value: string): RgbaColor | null {
  const hex = value.trim().replace(/^#/, '')
  if (![3, 4, 6, 8].includes(hex.length) || !/^[0-9a-f]+$/i.test(hex)) return null
  const expanded = hex.length <= 4 ? [...hex].map((char) => char + char).join('') : hex
  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
    alpha: expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1,
  }
}

function formatAlpha(value: number): string {
  return String(Math.round(clamp(Number.isFinite(value) ? value : 1, 0, 1) * 1000) / 1000)
}

export function colorWithAlpha(value: string, alpha = 1): string {
  const parsed = parseHexColor(value)
  if (!parsed) return alpha >= 1 && value.trim() && !/[;{}]/.test(value) ? value.trim() : 'transparent'
  const combined = parsed.alpha * clamp(Number.isFinite(alpha) ? alpha : 1, 0, 1)
  if (combined >= 0.9995 && parsed.alpha >= 0.9995) return value.trim()
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${formatAlpha(combined)})`
}
