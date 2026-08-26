import { parseHexColor } from '../compiler/color'
import { createStylePacket, type BoostColor, type SmartInvertConfig, type StylePacket } from './model'

export type SemanticColorRole = 'surface' | 'text' | 'border' | 'accent' | 'unknown'
interface Hsl { h: number; s: number; l: number }
function rgbToHsl(r: number, g: number, b: number): Hsl {
  const [rn, gn, bn] = [r, g, b].map((value) => value / 255); const max = Math.max(rn, gn, bn); const min = Math.min(rn, gn, bn)
  let h = 0; const l = (max + min) / 2; const delta = max - min; const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
  if (delta) { if (max === rn) h = 60 * (((gn - bn) / delta) % 6); else if (max === gn) h = 60 * ((bn - rn) / delta + 2); else h = 60 * ((rn - gn) / delta + 4) }
  return { h: h < 0 ? h + 360 : h, s, l }
}
function hslToRgb({ h, s, l }: Hsl): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s; const x = c * (1 - Math.abs(((h / 60) % 2) - 1)); const m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [r, g, b].map((value) => Math.round((value + m) * 255)) as [number, number, number]
}
function hex(r: number, g: number, b: number): string { return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}` }

export function smartInvertColor(color: string, role: SemanticColorRole, config: SmartInvertConfig): string {
  const parsed = parseHexColor(color); if (!parsed || config.strength <= 0) return color
  const source = rgbToHsl(parsed.r, parsed.g, parsed.b)
  let targetLightness = 1 - source.l
  if (role === 'surface') targetLightness = source.l >= 0.5 ? 0.12 : 0.9
  if (role === 'text') targetLightness = source.l >= 0.5 ? 0.12 : 0.92
  if (role === 'border') targetLightness = source.l >= 0.5 ? 0.28 : 0.7
  if (role === 'accent' && config.preserveAccents) targetLightness = Math.max(0.38, Math.min(0.68, targetLightness))
  const strength = Math.max(0, Math.min(1, config.strength)); const transformed = { ...source, l: source.l + (targetLightness - source.l) * strength }
  return hex(...hslToRgb(transformed))
}
export function inferColorRole(property: 'background-color' | 'color' | 'border-color', color: string): SemanticColorRole {
  if (property === 'background-color') return 'surface'
  if (property === 'color') return 'text'
  const parsed = parseHexColor(color); if (!parsed) return 'unknown'
  return rgbToHsl(parsed.r, parsed.g, parsed.b).s > 0.45 ? 'accent' : 'border'
}
export function isMediaElement(element: Element): boolean { return ['IMG', 'VIDEO', 'CANVAS', 'PICTURE', 'SOURCE'].includes(element.tagName) || Boolean(element.closest('picture')) }
export interface ComputedPresentation { backgroundColor?: string; color?: string; borderColor?: string }
function cssRgbToHex(value: string | undefined): string | null {
  if (!value || value === 'transparent') return null
  const hexColor = parseHexColor(value); if (hexColor) return hex(hexColor.r, hexColor.g, hexColor.b)
  const match = value.trim().match(/^rgba?\((.*)\)$/i)
  if (!match) return null
  const parts = match[1].replace('/', ' ').split(/[\s,]+/).filter(Boolean).map(Number)
  if (parts.length < 3 || parts.slice(0, 3).some((part) => !Number.isFinite(part)) || (parts[3] !== undefined && parts[3] <= 0)) return null
  return hex(...(parts.slice(0, 3).map((part) => Math.max(0, Math.min(255, Math.round(part)))) as [number, number, number]))
}
/** Convert computed presentation into ordinary editable packets; no runtime filters or computed objects are persisted. */
export function synthesizeSmartInvertPackets(presentation: ComputedPresentation, config: SmartInvertConfig): StylePacket[] {
  const result: StylePacket[] = []
  const background = cssRgbToHex(presentation.backgroundColor)
  if (background) { const packet = createStylePacket('background'); if (packet.type === 'background') { packet.solid.color = smartInvertColor(background, 'surface', config); result.push(packet) } }
  const foreground = cssRgbToHex(presentation.color)
  if (foreground) { const packet = createStylePacket('text'); if (packet.type === 'text') { packet.solid.color = smartInvertColor(foreground, 'text', config); result.push(packet) } }
  const border = cssRgbToHex(presentation.borderColor)
  if (border) { const packet = createStylePacket('border'); if (packet.type === 'border') { packet.color = smartInvertColor(border, inferColorRole('border-color', border), config); result.push(packet) } }
  return result
}
export function invertBoostColor(value: BoostColor, role: SemanticColorRole, config: SmartInvertConfig): BoostColor { return { ...value, color: smartInvertColor(value.color, role, config) } }
