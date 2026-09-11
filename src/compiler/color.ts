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

function linearChannel(value: number): number {
  const channel = clamp(value, 0, 255) / 255
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

/** WCAG relative luminance for an sRGB color. Alpha is intentionally ignored. */
export function relativeLuminance(value: RgbaColor): number {
  return 0.2126 * linearChannel(value.r) + 0.7152 * linearChannel(value.g) + 0.0722 * linearChannel(value.b)
}

/** WCAG contrast ratio for two sRGB colors. Alpha is intentionally ignored. */
export function contrastRatio(a: RgbaColor, b: RgbaColor): number {
  const first = relativeLuminance(a), second = relativeLuminance(b), light = Math.max(first, second), dark = Math.min(first, second)
  return (light + 0.05) / (dark + 0.05)
}

export function mixRgba(a: RgbaColor, b: RgbaColor, amount: number): RgbaColor {
  const t = clamp(Number.isFinite(amount) ? amount : 0, 0, 1)
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t, alpha: a.alpha + (b.alpha - a.alpha) * t }
}
