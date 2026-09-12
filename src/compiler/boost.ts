import type { BoostColor, ProjectBoost } from '../project/model'
import { contrastRatio, mixRgba, parseHexColor, type RgbaColor } from './color'

export type BoostTransformRole = 'primary' | 'secondary' | 'canvas' | 'surface' | 'raised' | 'hover' | 'card' | 'glass' | 'glass-hover' | 'control' | 'text' | 'muted' | 'foreground' | 'border-subtle' | 'border' | 'border-hover' | 'neutral' | 'semantic' | 'preserve'
export interface BoostTransformSample { variable: string; role: BoostTransformRole; before: string; after: string }
export interface BoostTransformDiagnostics {
  sourceCount: number
  standaloneColorCount: number
  complexColorCount: number
  transformedColorTokenCount: number
  colorCount: number
  changedCount: number
  preservedCount: number
  skippedCount: number
  roleCounts: Record<BoostTransformRole, number>
  samples: BoostTransformSample[]
}
export interface BoostTransformResult { variables: Record<string, string>; diagnostics: BoostTransformDiagnostics }
export interface BoostCssValueTrace { json: string; normalizedJson: string; codePoints: number[]; prohibited: Array<{ index: number; codePoint: number }>; parsedAsColor: boolean }
interface Oklch { l: number; c: number; h: number; alpha: number }
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min))
const byte = (value: number) => Math.round(clamp(value, 0, 255))
const channel = (value: number) => byte(value).toString(16).padStart(2, '0')
const hueDelta = (from: number, to: number) => ((to - from + 540) % 360) - 180
const normalizeCssValueBoundary = (value: string) => value.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '')
const prohibitedControlCharacters = (value: string) => [...value].map((character, index) => ({ index, codePoint: character.codePointAt(0) ?? 0 })).filter(({ codePoint }) => codePoint <= 8 || codePoint === 11 || codePoint === 12 || (codePoint >= 14 && codePoint <= 31))
const TEXT_FAMILY = ['--lumiverse-text', '--lumiverse-text-primary', '--lumiverse-text-muted', '--lumiverse-text-secondary', '--lumiverse-text-dim', '--lumiverse-text-hint', '--lumiverse-icon', '--lumiverse-icon-muted', '--lumiverse-icon-dim'] as const
const BOOST_ROLES: BoostTransformRole[] = ['primary', 'secondary', 'canvas', 'surface', 'raised', 'hover', 'card', 'glass', 'glass-hover', 'control', 'text', 'muted', 'foreground', 'border-subtle', 'border', 'border-hover', 'neutral', 'semantic', 'preserve']

function parseCssColor(value: string): RgbaColor | null {
  const normalized = normalizeCssValueBoundary(value)
  const hex = parseHexColor(normalized); if (hex) return hex
  const rgb = normalized.match(/^rgba?\(\s*([+-]?[\d.]+)(%)?[,\s]+([+-]?[\d.]+)(%)?[,\s]+([+-]?[\d.]+)(%)?(?:\s*[,/]\s*([\d.]+)(%)?)?\s*\)$/i)
  if (rgb) { const rScale = rgb[2] ? 2.55 : 1, gScale = rgb[4] ? 2.55 : 1, bScale = rgb[6] ? 2.55 : 1; const rawAlpha = rgb[7] === undefined ? 1 : Number(rgb[7]); return { r: byte(Number(rgb[1]) * rScale), g: byte(Number(rgb[3]) * gScale), b: byte(Number(rgb[5]) * bScale), alpha: clamp(rgb[8] ? rawAlpha / 100 : rawAlpha) } }
  const hsl = normalized.match(/^hsla?\(\s*([+-]?[\d.]+)(?:deg)?[,\s]+([\d.]+)%[,\s]+([\d.]+)%(?:\s*[,/]\s*([\d.]+)(%)?)?\s*\)$/i)
  if (!hsl) return null
  const h = ((Number(hsl[1]) % 360) + 360) % 360, s = clamp(Number(hsl[2]) / 100), l = clamp(Number(hsl[3]) / 100), a = s * Math.min(l, 1 - l)
  const f = (n: number) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)) }
  const rawAlpha = hsl[4] === undefined ? 1 : Number(hsl[4]); return { r: byte(f(0) * 255), g: byte(f(8) * 255), b: byte(f(4) * 255), alpha: clamp(hsl[5] ? rawAlpha / 100 : rawAlpha) }
}
export function inspectBoostCssValue(value: string): BoostCssValueTrace {
  const normalized = normalizeCssValueBoundary(value)
  return { json: JSON.stringify(value), normalizedJson: JSON.stringify(normalized), codePoints: [...value].map((character) => character.codePointAt(0) ?? 0), prohibited: prohibitedControlCharacters(value), parsedAsColor: parseCssColor(normalized) !== null }
}
function srgb(value: number): number { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4 }
function gamma(value: number): number { return 255 * (value <= .0031308 ? 12.92 * value : 1.055 * Math.max(0, value) ** (1 / 2.4) - .055) }
function toOklch(value: RgbaColor): Oklch {
  const r = srgb(value.r), g = srgb(value.g), b = srgb(value.b), ll = .4122214708 * r + .5363325363 * g + .0514459929 * b, m = .2119034982 * r + .6806995451 * g + .1073969566 * b, s = .0883024619 * r + .2817188376 * g + .6299787005 * b
  const l_ = Math.cbrt(ll), m_ = Math.cbrt(m), s_ = Math.cbrt(s), L = .2104542553 * l_ + .793617785 * m_ - .0040720468 * s_, A = 1.9779984951 * l_ - 2.428592205 * m_ + .4505937099 * s_, B = .0259040371 * l_ + .7827717662 * m_ - .808675766 * s_
  return { l: L, c: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180 / Math.PI) + 360) % 360, alpha: value.alpha }
}
function fromOklch(value: Oklch): RgbaColor {
  const angle = value.h * Math.PI / 180, A = value.c * Math.cos(angle), B = value.c * Math.sin(angle), l_ = value.l + .3963377774 * A + .2158037573 * B, m_ = value.l - .1055613458 * A - .0638541728 * B, s_ = value.l - .0894841775 * A - 1.291485548 * B, ll = l_ ** 3, m = m_ ** 3, s = s_ ** 3
  return { r: gamma(4.0767416621 * ll - 3.3077115913 * m + .2309699292 * s), g: gamma(-1.2684380046 * ll + 2.6097574011 * m - .3413193965 * s), b: gamma(-.0041960863 * ll - .7034186147 * m + 1.707614701 * s), alpha: value.alpha }
}
function inGamut(color: RgbaColor): boolean { return color.r >= 0 && color.r <= 255 && color.g >= 0 && color.g <= 255 && color.b >= 0 && color.b <= 255 }
function render(value: Oklch): string { let candidate = { ...value }, rgb = fromOklch(candidate); for (let i = 0; i < 20 && !inGamut(rgb); i++) { candidate.c *= .9; rgb = fromOklch(candidate) } const base = `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`; return value.alpha >= .9995 ? base : `rgba(${byte(rgb.r)}, ${byte(rgb.g)}, ${byte(rgb.b)}, ${Math.round(clamp(value.alpha) * 1000) / 1000})` }
function anchor(value: BoostColor | undefined, fallback: BoostColor): Oklch { return toOklch(parseCssColor(value?.color ?? fallback.color) ?? { r: 147, g: 112, b: 219, alpha: 1 }) }

export function classifyBoostVariable(name: string): BoostTransformRole {
  if (/^--lumiverse-(?:danger|success|warning|error|info)(?:-|$)/i.test(name)) return 'semantic'
  // Paired foregrounds are neither accent paint nor prose. Keep the host's
  // foreground character intact, then optionally recalculate it against the
  // recolored control when Protect controls is enabled.
  if (/^--lumiverse-(?:primary(?:-deep)?-contrast|primary-fg|on-primary|accent-fg)$/i.test(name)) return 'foreground'
  if (/^--lumiverse-text-secondary$/i.test(name)) return 'muted'
  if (/^--lumiverse-(?:text-primary|text|icon)$/i.test(name)) return 'text'
  if (/^--lumiverse-(?:text-muted|text-dim|text-hint|icon-muted|icon-dim|muted)(?:-|$)?/i.test(name)) return 'muted'
  if (/^--lumiverse-(?:primary(?:-|$)|primary-soft$|accent(?:-|$))/i.test(name)) return 'primary'
  if (/^--lumiverse-secondary(?:-|$)/i.test(name)) return 'secondary'

  // Lumiverse now publishes semantic material aliases. Prefer those explicit
  // contracts before falling back to the older primitive variable names.
  if (/^--lumiverse-surface-raised$/i.test(name)) return 'raised'
  if (/^--lumiverse-surface-hover$/i.test(name)) return 'hover'
  if (/^--lumiverse-(?:surface-muted|input-bg)$/i.test(name)) return 'control'
  if (/^--lumiverse-surface$/i.test(name)) return 'surface'
  if (/^--lumiverse-border-subtle$/i.test(name)) return 'border-subtle'

  // Chat Shell glass is a material in its own right. Hover glass gets a
  // slightly stronger supporting-accent affinity than resting glass, while
  // its ordinary border stays quieter than an interactive hover border.
  if (/^--lcs-glass-bg-hover$/i.test(name)) return 'glass-hover'
  if (/^--lcs-glass-bg$/i.test(name)) return 'glass'
  if (/^--lcs-glass-border-hover$/i.test(name)) return 'border-hover'
  if (/^--lcs-glass-border$/i.test(name)) return 'border-subtle'
  if (/^--lcs-/i.test(name)) return 'preserve'

  // Compatibility for components that still consume the older primitives.
  if (/^--lumiverse-bg-elevated(?:-040)?$/i.test(name)) return 'raised'
  if (/^--lumiverse-bg-hover$/i.test(name)) return 'hover'
  if (/^--lumiverse-(?:card-bg(?:-(?:solid|top|bottom))?|card-image-bg|gradient-modal)$/i.test(name)) return 'card'
  if (/^--lumiverse-(?:bg-dark(?:er)?$|fill(?:-|$)|border-(?:light|neutral(?:-hover)?)$|swatch-border$|shadow(?:-|$)|highlight-inset(?:-|$)|modal-backdrop$|scene-text-scrim$)/i.test(name)) return 'neutral'
  if (/^--lumiverse-border-hover$/i.test(name)) return 'border-hover'
  if (/^--lumiverse-border(?:-|$)/i.test(name)) return 'border'
  if (/^--lumiverse-bg(?:$|-opaque$|-0(?:40|50|70)$|-deep(?:-080)?$|-deeper$)/i.test(name)) return 'canvas'
  if (/^--lumiverse-bg(?:-|$)/i.test(name)) return 'surface'
  return 'preserve'
}

interface BoostTransformContext {
  primaryReference?: Oklch
  secondaryReference?: Oklch
}
interface MaterialProfile { secondaryWeight: number; chromaScale: number; maxChroma: number }
const MATERIAL_PROFILES: Partial<Record<BoostTransformRole, MaterialProfile>> = {
  canvas: { secondaryWeight: .12, chromaScale: .34, maxChroma: .055 },
  surface: { secondaryWeight: .28, chromaScale: .42, maxChroma: .065 },
  raised: { secondaryWeight: .52, chromaScale: .48, maxChroma: .075 },
  hover: { secondaryWeight: .72, chromaScale: .58, maxChroma: .09 },
  card: { secondaryWeight: .62, chromaScale: .50, maxChroma: .08 },
  glass: { secondaryWeight: .22, chromaScale: .24, maxChroma: .035 },
  'glass-hover': { secondaryWeight: .52, chromaScale: .34, maxChroma: .05 },
  control: { secondaryWeight: .16, chromaScale: .18, maxChroma: .026 },
  'border-subtle': { secondaryWeight: .28, chromaScale: .38, maxChroma: .05 },
  border: { secondaryWeight: .55, chromaScale: .64, maxChroma: .095 },
  'border-hover': { secondaryWeight: .72, chromaScale: .76, maxChroma: .12 },
}

function supportingAccentAnchor(boost: ProjectBoost, profile: MaterialProfile): Oklch {
  const primary = anchor(boost.primary, boost.primary), secondary = anchor(boost.secondary, boost.primary), weight = clamp(profile.secondaryWeight)
  // Do not literally average opposing hues: green + magenta should not turn a
  // supporting card into accidental beige. Accent affinity gives each material
  // a real chromatic owner. If the preferred owner is achromatic, borrow the
  // other accent's hue instead of amplifying the meaningless OKLCH hue carried
  // by gray/white/black values.
  const primaryChromatic = primary.c > .012, secondaryChromatic = secondary.c > .012
  const preferSecondary = weight >= .5
  const owner = preferSecondary
    ? (secondaryChromatic ? secondary : primaryChromatic ? primary : secondary)
    : (primaryChromatic ? primary : secondaryChromatic ? secondary : primary)
  const mixedChroma = primary.c * (1 - weight) + secondary.c * weight
  return { l: .5, c: Math.min(profile.maxChroma, mixedChroma * profile.chromaScale), h: owner.h, alpha: 1 }
}
function roleAnchor(role: BoostTransformRole, boost: ProjectBoost): Oklch | undefined {
  const profile = MATERIAL_PROFILES[role]
  if (profile) return supportingAccentAnchor(boost, profile)
  if ((role === 'text' || role === 'muted') && boost.textMode === 'custom' && boost.text) return anchor(boost.text, boost.text)
  return undefined
}
function transformLightness(value: number, boost: ProjectBoost, strength = 1): number {
  let l = boost.mode === 'smart-invert' ? 1 - value : value
  l = clamp(l, .001, .999)
  const contrast = clamp(boost.contrast, -1, 1), brightness = clamp(boost.brightness, -1, 1)
  // Work in log-odds instead of additive lightness. This keeps the native
  // material ordering intact even at the deliberately deranged +100/-100
  // smoke-test combination: every rung moves, but the ladder does not collapse.
  const logit = Math.log(l / (1 - l))
  const contrastScale = 1 + contrast * .45 * strength
  const exposureShift = brightness * 2 * strength
  return clamp(1 / (1 + Math.exp(-(logit * contrastScale + exposureShift))))
}
function accentVariant(role: 'primary' | 'secondary', original: Oklch, boost: ProjectBoost, context: BoostTransformContext): Oklch {
  const selected = role === 'primary' ? anchor(boost.primary, boost.primary) : anchor(boost.secondary, boost.primary)
  const reference = role === 'primary' ? context.primaryReference : context.secondaryReference
  if (!reference) return { ...selected, l: transformLightness(selected.l, boost, .85), alpha: original.alpha }
  const chromaticReference = reference.c > .008 && original.c > .008
  const hueOffset = chromaticReference ? hueDelta(reference.h, original.h) * .18 : 0
  const lightnessDelta = original.l - reference.l, variantScale = Math.abs(lightnessDelta) > .18 ? .82 : .42
  return {
    l: transformLightness(clamp(selected.l + lightnessDelta * variantScale), boost, .85),
    c: clamp(selected.c + (original.c - reference.c) * .28, 0, .4),
    h: selected.h + hueOffset,
    alpha: original.alpha,
  }
}
function transformColor(role: BoostTransformRole, source: RgbaColor, boost: ProjectBoost, context: BoostTransformContext): string {
  if (role === 'semantic' || role === 'preserve' || role === 'foreground') return render(toOklch(source))
  const original = toOklch(source)
  if (role === 'primary' || role === 'secondary') return render(accentVariant(role, original, boost, context))
  // Neutral overlays, shadows and scrims are structural. In Recolor mode they
  // keep their native black/white character so brightness cannot turn every
  // translucent control layer into the same pastel slab.
  if (role === 'neutral' && boost.mode === 'recolor') return render(original)
  const selected = roleAnchor(role, boost), retention = clamp(boost.originalSaturation), recolor = 1 - retention
  const l = transformLightness(original.l, boost)
  if (!selected) return render({ ...original, l, alpha: source.alpha })
  return render({ l, c: clamp(original.c * retention + selected.c * recolor, 0, .4), h: original.h + hueDelta(original.h, selected.h) * recolor, alpha: source.alpha })
}

function alphaText(value: number): string { return String(Math.round(clamp(value) * 1000) / 1000) }
function rgbToHsl(value: RgbaColor): { h: number; s: number; l: number } {
  const r = clamp(value.r / 255), g = clamp(value.g / 255), b = clamp(value.b / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min, l = (max + min) / 2
  if (!delta) return { h: 0, s: 0, l }
  const h = max === r ? 60 * (((g - b) / delta) % 6) : max === g ? 60 * ((b - r) / delta + 2) : 60 * ((r - g) / delta + 4)
  return { h: (h + 360) % 360, s: delta / (1 - Math.abs(2 * l - 1)), l }
}
function serializeColorLike(sourceToken: string, transformed: string): string {
  const color = parseCssColor(transformed); if (!color) return transformed
  const trimmed = sourceToken.trim(), hex = trimmed.match(/^#([0-9a-f]{3,8})$/i), fn = trimmed.match(/^([a-z]+)\s*\(/i)?.[1]
  if (hex) { const includeAlpha = hex[1].length === 4 || hex[1].length === 8 || color.alpha < .9995; return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}${includeAlpha ? channel(color.alpha * 255) : ''}` }
  if (fn?.toLowerCase() === 'rgb') return `${fn}(${byte(color.r)}, ${byte(color.g)}, ${byte(color.b)})`
  if (fn?.toLowerCase() === 'rgba') return `${fn}(${byte(color.r)}, ${byte(color.g)}, ${byte(color.b)}, ${alphaText(color.alpha)})`
  if (fn?.toLowerCase() === 'hsl' || fn?.toLowerCase() === 'hsla') { const hsl = rgbToHsl(color), body = `${Math.round(hsl.h * 1000) / 1000}, ${Math.round(hsl.s * 10000) / 100}%, ${Math.round(hsl.l * 10000) / 100}%`; return fn.toLowerCase() === 'hsla' ? `${fn}(${body}, ${alphaText(color.alpha)})` : `${fn}(${body})` }
  return transformed
}
function rgbaCss(value: RgbaColor): string { return `rgba(${byte(value.r)}, ${byte(value.g)}, ${byte(value.b)}, ${alphaText(value.alpha)})` }

function quotedEnd(value: string, start: number): number { const quote = value[start]; let index = start + 1; while (index < value.length) { if (value[index] === '\\') index += 2; else if (value[index++] === quote) break } return index }
function commentEnd(value: string, start: number): number { const close = value.indexOf('*/', start + 2); return close < 0 ? value.length : close + 2 }
function functionEnd(value: string, open: number): number {
  let depth = 1, index = open + 1
  while (index < value.length) {
    if (value[index] === '"' || value[index] === "'") { index = quotedEnd(value, index); continue }
    if (value.startsWith('/*', index)) { index = commentEnd(value, index); continue }
    if (value[index] === '\\') { index += 2; continue }
    if (value[index] === '(') depth += 1
    else if (value[index] === ')' && --depth === 0) return index
    index += 1
  }
  return -1
}
interface TokenTransform { value: string; count: number }
const COLOR_FUNCTIONS = new Set(['rgb', 'rgba', 'hsl', 'hsla'])
const COLOR_CONTAINERS = new Set(['linear-gradient', 'radial-gradient', 'color-mix'])
function transformColorTokens(role: BoostTransformRole, value: string, boost: ProjectBoost, context: BoostTransformContext): TokenTransform {
  let output = '', count = 0, index = 0
  while (index < value.length) {
    if (value[index] === '"' || value[index] === "'") { const end = quotedEnd(value, index); output += value.slice(index, end); index = end; continue }
    if (value.startsWith('/*', index)) { const end = commentEnd(value, index); output += value.slice(index, end); index = end; continue }
    if (value[index] === '#') {
      const match = value.slice(index).match(/^#([0-9a-fA-F]+)/), length = match?.[1].length ?? 0, end = index + 1 + length, boundary = value[end]
      if ([3, 4, 6, 8].includes(length) && (!boundary || !/[A-Za-z0-9_-]/.test(boundary))) { const token = value.slice(index, end), parsed = parseCssColor(token); if (parsed) { output += serializeColorLike(token, transformColor(role, parsed, boost, context)); count += 1; index = end; continue } }
    }
    const functionMatch = value.slice(index).match(/^(-?[A-Za-z][A-Za-z0-9-]*)([ \t\r\n]*)\(/)
    if (functionMatch) {
      const functionName = functionMatch[1].toLowerCase(), open = index + functionMatch[0].length - 1, close = functionEnd(value, open)
      if (close >= 0) {
        const whole = value.slice(index, close + 1)
        if (COLOR_FUNCTIONS.has(functionName)) { const parsed = parseCssColor(whole); if (parsed) { output += serializeColorLike(whole, transformColor(role, parsed, boost, context)); count += 1; index = close + 1; continue } }
        if (COLOR_CONTAINERS.has(functionName)) { const inner = transformColorTokens(role, value.slice(open + 1, close), boost, context); output += value.slice(index, open + 1) + inner.value + ')'; count += inner.count; index = close + 1; continue }
        // var(), url(), data payloads, and unrelated functions are deliberately opaque.
        output += whole; index = close + 1; continue
      }
    }
    if (value[index] === '\\' && index + 1 < value.length) { output += value.slice(index, index + 2); index += 2; continue }
    output += value[index]; index += 1
  }
  return { value: output, count }
}

function ensureContrast(candidate: RgbaColor, background: RgbaColor, minimum = 4.5): RgbaColor {
  const opaqueCandidate = { ...candidate, alpha: 1 }, opaqueBackground = { ...background, alpha: 1 }, targetRatio = minimum + .05
  if (contrastRatio(opaqueCandidate, opaqueBackground) >= targetRatio) return candidate
  const light: RgbaColor = { r: 255, g: 255, b: 255, alpha: 1 }, dark: RgbaColor = { r: 0, g: 0, b: 0, alpha: 1 }
  const target = contrastRatio(light, opaqueBackground) >= contrastRatio(dark, opaqueBackground) ? light : dark
  if (contrastRatio(target, opaqueBackground) < minimum) return { ...target, alpha: candidate.alpha }
  let low = 0, high = 1
  for (let i = 0; i < 18; i++) { const mid = (low + high) / 2, mixed = mixRgba(opaqueCandidate, target, mid); if (contrastRatio(mixed, opaqueBackground) >= targetRatio) high = mid; else low = mid }
  return { ...mixRgba(opaqueCandidate, target, high), alpha: candidate.alpha }
}
function applyTextTreatment(variables: Record<string, string>, baseline: Record<string, string>, boost: ProjectBoost): void {
  const referenceName = TEXT_FAMILY.find((name) => parseCssColor(variables[name] ?? baseline[name] ?? ''))
  if (!referenceName) return
  const currentReference = parseCssColor(variables[referenceName] ?? baseline[referenceName]); if (!currentReference) return
  let base: RgbaColor
  if (boost.textMode === 'custom' && boost.text) {
    const custom = parseCssColor(boost.text.color); if (!custom) return
    base = { ...custom, alpha: clamp(boost.text.alpha) }
  } else {
    const surface = parseCssColor(variables['--lumiverse-bg'] ?? baseline['--lumiverse-bg'] ?? '')
    base = surface ? ensureContrast(currentReference, surface, 4.5) : currentReference
  }
  for (const name of TEXT_FAMILY) {
    if (!(name in baseline) && !(name in variables)) continue
    const source = normalizeCssValueBoundary(baseline[name] ?? variables[name]), current = parseCssColor(variables[name] ?? source)
    if (!current) continue
    const alpha = boost.textMode === 'custom' && boost.text ? current.alpha * clamp(boost.text.alpha) : current.alpha
    variables[name] = serializeColorLike(source, rgbaCss({ r: base.r, g: base.g, b: base.b, alpha }))
  }
}
function readableCss(value: string): string {
  const parsed = parseCssColor(value)
  if (!parsed) return '#ffffff'
  const light = { r: 255, g: 255, b: 255, alpha: 1 }, dark = { r: 23, g: 19, b: 31, alpha: 1 }
  return contrastRatio(light, parsed) >= contrastRatio(dark, parsed) ? '#ffffff' : '#17131f'
}
function protectInteractiveVariables(variables: Record<string, string>, baseline: Record<string, string>): void {
  // `--lumiverse-primary-text` is not control-only: native prose/dialogue variables
  // can reference it. Repair only explicit foreground/background pairs. This also
  // keeps future host aliases safe without inventing variables the baseline did
  // not publish.
  const repair = (foreground: string, background: string): void => {
    if (!(foreground in baseline)) return
    const pairedSurface = variables[background] ?? baseline[background]
    if (pairedSurface) variables[foreground] = readableCss(pairedSurface)
  }
  repair('--lumiverse-primary-contrast', '--lumiverse-primary')
  repair('--lumiverse-primary-fg', '--lumiverse-primary')
  repair('--lumiverse-on-primary', '--lumiverse-primary')
  repair('--lumiverse-accent-fg', '--lumiverse-accent')
  repair('--lumiverse-primary-deep-contrast', '--lumiverse-primary-deep')
}

function emptyRoleCounts(): Record<BoostTransformRole, number> { return Object.fromEntries(BOOST_ROLES.map((role) => [role, 0])) as Record<BoostTransformRole, number> }
export function transformThemeVariables(baseline: Record<string, string>, boost: ProjectBoost): BoostTransformResult {
  if (boost.enabled) for (const [name, value] of Object.entries(baseline)) { const prohibited = prohibitedControlCharacters(value); if (prohibited.length) throw new Error(`Boost baseline CSS value ${name} contains prohibited control characters: ${JSON.stringify(value)} (${prohibited.map((entry) => `index ${entry.index}=U+${entry.codePoint.toString(16).toUpperCase().padStart(4, '0')}`).join(', ')})`) }
  const variables: Record<string, string> = {}, roleCounts = emptyRoleCounts(); let standaloneColorCount = 0, complexColorCount = 0, transformedColorTokenCount = 0
  const context: BoostTransformContext = {
    primaryReference: parseCssColor(normalizeCssValueBoundary(baseline['--lumiverse-primary'] ?? '')) ? toOklch(parseCssColor(normalizeCssValueBoundary(baseline['--lumiverse-primary']))!) : undefined,
    secondaryReference: parseCssColor(normalizeCssValueBoundary(baseline['--lumiverse-secondary'] ?? '')) ? toOklch(parseCssColor(normalizeCssValueBoundary(baseline['--lumiverse-secondary']))!) : undefined,
  }
  if (boost.enabled && boost.colorsEnabled) for (const [name, raw] of Object.entries(baseline)) {
    const before = normalizeCssValueBoundary(raw), role = classifyBoostVariable(name); roleCounts[role] += 1
    const parsed = parseCssColor(before); if (parsed) standaloneColorCount += 1
    if (role === 'semantic' || role === 'preserve') { variables[name] = before; continue }
    let after = before, tokenCount = 0
    if (parsed) { after = serializeColorLike(before, transformColor(role, parsed, boost, context)); tokenCount = 1 }
    else { const transformed = transformColorTokens(role, before, boost, context); after = transformed.value; tokenCount = transformed.count; if (tokenCount) complexColorCount += 1 }
    transformedColorTokenCount += tokenCount
    variables[name] = after
  }
  if (boost.enabled && boost.colorsEnabled) applyTextTreatment(variables, baseline, boost)
  if (boost.enabled && boost.canvasEnabled) {
    // Lumiverse's scene wash is a small family, not one variable. ChatView's
    // wallpaper/text context layers can combine the explicit scene scrim with
    // the deep/70% background helpers. Fade the family together so wallpaper
    // visibility changes without making reusable card/elevated surfaces transparent.
    const canvasAlpha = clamp(boost.canvasOpacity, 0, 1)
    const canvasVariables = ['--lumiverse-scene-text-scrim', '--lumiverse-bg-deep-080', '--lumiverse-bg-070'] as const
    for (const name of canvasVariables) {
      if (!(name in baseline)) continue
      const source = variables[name] ?? normalizeCssValueBoundary(baseline[name]), parsed = parseCssColor(source)
      if (parsed) variables[name] = serializeColorLike(source, rgbaCss({ ...parsed, alpha: parsed.alpha * canvasAlpha }))
      else variables[name] = source
    }
  }
  if (boost.enabled && boost.colorsEnabled && boost.protectControls) protectInteractiveVariables(variables, baseline)
  if (boost.enabled && boost.typographyEnabled && boost.typography.fontFamily && '--lumiverse-font-family' in baseline) variables['--lumiverse-font-family'] = boost.typography.fontFamily
  if (boost.enabled && boost.typographyEnabled && boost.typography.scale !== undefined && '--lumiverse-font-scale' in baseline) variables['--lumiverse-font-scale'] = String(clamp(boost.typography.scale, .25, 4))
  for (const [name, value] of Object.entries(variables)) { const prohibited = prohibitedControlCharacters(value); if (prohibited.length) throw new Error(`Boost CSS value ${name} contains prohibited control characters: ${JSON.stringify(value)} (${prohibited.map((entry) => `index ${entry.index}=U+${entry.codePoint.toString(16).toUpperCase().padStart(4, '0')}`).join(', ')})`) }
  const samples: BoostTransformSample[] = [], sourceCount = Object.keys(baseline).length
  let changedCount = 0
  for (const [name, raw] of Object.entries(baseline)) {
    const before = normalizeCssValueBoundary(raw), after = variables[name]
    if (after === undefined || after === before) continue
    changedCount += 1
    if (samples.length < 8) samples.push({ variable: name, role: classifyBoostVariable(name), before, after })
  }
  const colorCount = standaloneColorCount + complexColorCount, preservedCount = boost.enabled ? Math.max(0, sourceCount - changedCount) : sourceCount
  return { variables, diagnostics: { sourceCount, standaloneColorCount, complexColorCount, transformedColorTokenCount, colorCount, changedCount, preservedCount, skippedCount: preservedCount, roleCounts, samples } }
}

export function deriveBoostTokenOverrides(boost: ProjectBoost, baseline: Record<string, string> = {}): Record<string, string> { return boost.enabled ? transformThemeVariables(baseline, boost).variables : {} }
