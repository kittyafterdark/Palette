import type { DimensionUnit, DimensionValue } from './model'

export function finite(value: unknown, fallback = 0): number { return typeof value === 'number' && Number.isFinite(value) ? value : fallback }
export function bounded(value: unknown, fallback: number, min: number, max: number): number { return Math.max(min, Math.min(max, finite(value, fallback))) }
export function alpha(value: unknown, fallback = 1): number { return bounded(value, fallback, 0, 1) }
export function percentage(value: unknown, fallback = 0): number { return bounded(value, fallback, 0, 100) }
export function normalizedAngle(value: unknown, fallback = 0): number { const number = finite(value, fallback); return ((number % 360) + 360) % 360 }
export function isDimensionUnit(value: unknown): value is DimensionUnit { return ['px', 'rem', '%', 'vw', 'vh', 'em'].includes(String(value)) }
export function normalizeDimension(value: unknown, fallback: DimensionValue = { mode: 'native' }): DimensionValue {
  if (typeof value !== 'object' || value === null) return structuredClone(fallback)
  const record = value as Record<string, unknown>
  if (record.mode === 'native' || record.mode === 'auto') return { mode: 'native' }
  if (record.mode === 'content' || record.mode === 'fit') return { mode: 'content' }
  if (record.mode === 'parent' || record.mode === 'fill') return { mode: 'parent' }
  if (record.mode === 'fixed') return { mode: 'fixed', value: bounded(record.value, 0, -100_000, 100_000), unit: isDimensionUnit(record.unit) ? record.unit : 'px' }
  return structuredClone(fallback)
}
export function compileDimension(value: DimensionValue): string {
  if (value.mode !== 'fixed') return value.mode === 'native' ? '' : value.mode === 'content' ? 'fit-content' : '100%'
  const number = Math.round(finite(value.value, 0) * 1000) / 1000
  return `${number}${value.unit}`
}
