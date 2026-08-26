import type { BoostColor, BoostPaletteRole, ProjectBoost } from '../project/model'
import { colorWithAlpha, parseHexColor, type RgbaColor } from './color'

export interface BoostTransformDiagnostics { sourceCount: number; standaloneColorCount: number; complexColorCount: number; transformedColorTokenCount: number; colorCount: number; changedCount: number; preservedCount: number; skippedCount: number; samples: Array<{ variable: string; before: string; after: string }> }
export interface BoostTransformResult { variables: Record<string, string>; diagnostics: BoostTransformDiagnostics }
export interface BoostCssValueTrace { json: string; normalizedJson: string; codePoints: number[]; prohibited: Array<{ index: number; codePoint: number }>; parsedAsColor: boolean }
interface Oklch { l: number; c: number; h: number; alpha: number }
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min))
const byte = (value: number) => Math.round(clamp(value, 0, 255))
const channel = (value: number) => byte(value).toString(16).padStart(2, '0')
const hueDelta = (from: number, to: number) => ((to - from + 540) % 360) - 180
const normalizeCssValueBoundary = (value: string) => value.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '')
const prohibitedControlCharacters = (value: string) => [...value].map((character, index) => ({ index, codePoint: character.codePointAt(0) ?? 0 })).filter(({ codePoint }) => codePoint <= 8 || codePoint === 11 || codePoint === 12 || (codePoint >= 14 && codePoint <= 31))

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
function useSecondary(name: string): boolean { return /(?:bg|surface|card|fill|border|shadow|overlay|modal|sidebar|panel)/i.test(name) }
function transformColor(name: string, source: RgbaColor, boost: ProjectBoost): string {
  const original = toOklch(source), primary = anchor(boost.primary, boost.primary), secondary = anchor(boost.secondary, boost.primary), selected = useSecondary(name) ? secondary : primary, retention = clamp(boost.originalSaturation), recolor = 1 - retention
  let l = boost.mode === 'smart-invert' ? 1 - original.l : original.l; l = clamp(.5 + (l - .5) * (1 + clamp(boost.contrast, -1, 1) * .9) + clamp(boost.brightness, -1, 1) * .28)
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
function transformColorTokens(name: string, value: string, boost: ProjectBoost): TokenTransform {
  let output = '', count = 0, index = 0
  while (index < value.length) {
    if (value[index] === '"' || value[index] === "'") { const end = quotedEnd(value, index); output += value.slice(index, end); index = end; continue }
    if (value.startsWith('/*', index)) { const end = commentEnd(value, index); output += value.slice(index, end); index = end; continue }
    if (value[index] === '#') {
      const match = value.slice(index).match(/^#([0-9a-fA-F]+)/), length = match?.[1].length ?? 0, end = index + 1 + length, boundary = value[end]
      if ([3, 4, 6, 8].includes(length) && (!boundary || !/[A-Za-z0-9_-]/.test(boundary))) { const token = value.slice(index, end), parsed = parseCssColor(token); if (parsed) { output += serializeColorLike(token, transformColor(name, parsed, boost)); count += 1; index = end; continue } }
    }
    const functionMatch = value.slice(index).match(/^(-?[A-Za-z][A-Za-z0-9-]*)([ \t\r\n]*)\(/)
    if (functionMatch) {
      const functionName = functionMatch[1].toLowerCase(), open = index + functionMatch[0].length - 1, close = functionEnd(value, open)
      if (close >= 0) {
        const whole = value.slice(index, close + 1)
        if (COLOR_FUNCTIONS.has(functionName)) { const parsed = parseCssColor(whole); if (parsed) { output += serializeColorLike(whole, transformColor(name, parsed, boost)); count += 1; index = close + 1; continue } }
        if (COLOR_CONTAINERS.has(functionName)) { const inner = transformColorTokens(name, value.slice(open + 1, close), boost); output += value.slice(index, open + 1) + inner.value + ')'; count += inner.count; index = close + 1; continue }
        // var(), url(), data payloads, and unrelated functions are deliberately opaque.
        output += whole; index = close + 1; continue
      }
    }
    if (value[index] === '\\' && index + 1 < value.length) { output += value.slice(index, index + 2); index += 2; continue }
    output += value[index]; index += 1
  }
  return { value: output, count }
}

function readableCss(value: string): string {
  const parsed = parseCssColor(value)
  if (!parsed) return '#ffffff'
  const luminance = (.2126 * parsed.r + .7152 * parsed.g + .0722 * parsed.b) / 255
  return luminance <= .58 ? '#ffffff' : '#17131f'
}
function protectInteractiveVariables(variables: Record<string, string>, baseline: Record<string, string>): void {
  // `--lumiverse-primary-text` is not control-only: native prose/dialogue variables
  // can reference it. Rewriting it made unrelated text unreadable. Keep the guard
  // deliberately surgical and only repair the explicit deep-surface contrast token
  // used by filled primary controls.
  const deep = variables['--lumiverse-primary-deep'] ?? baseline['--lumiverse-primary-deep']
  if (deep && '--lumiverse-primary-deep-contrast' in baseline) variables['--lumiverse-primary-deep-contrast'] = readableCss(deep)
}

export function transformThemeVariables(baseline: Record<string, string>, boost: ProjectBoost): BoostTransformResult {
  const variables: Record<string, string> = {}, samples: BoostTransformDiagnostics['samples'] = []; let standaloneColorCount = 0, complexColorCount = 0, transformedColorTokenCount = 0, changedCount = 0
  // Color Boost intentionally transforms the complete native map so complex
  // expressions keep their original structure while every safe literal color
  // participates. Typography-only Boost is deliberately sparse: changing the
  // app font should not resend hundreds of untouched theme variables.
  if (boost.enabled && boost.colorsEnabled) for (const [name, raw] of Object.entries(baseline)) {
    const before = normalizeCssValueBoundary(raw), parsed = parseCssColor(before)
    let after = before, tokenCount = 0
    if (parsed) { after = serializeColorLike(before, transformColor(name, parsed, boost)); standaloneColorCount += 1; tokenCount = 1 }
    else { const transformed = transformColorTokens(name, before, boost); after = transformed.value; tokenCount = transformed.count; if (tokenCount) complexColorCount += 1 }
    transformedColorTokenCount += tokenCount
    if (tokenCount) { changedCount += 1; if (samples.length < 8) samples.push({ variable: name, before, after }) }
    variables[name] = after
  }
  if (boost.enabled && boost.canvasEnabled) {
    // Lumiverse's scene wash is a small family, not one variable. ChatView's
    // wallpaper/text context layers can combine the explicit scene scrim with
    // the deep/70% background helpers. Fade the family together so wallpaper
    // visibility changes without making reusable card/elevated surfaces transparent.
    const canvasAlpha = clamp(boost.canvasOpacity, 0, 1)
    const canvasVariables = ['--lumiverse-scene-text-scrim', '--lumiverse-bg-deep-080', '--lumiverse-bg-070'] as const
    for (const name of canvasVariables) {
      if (!(name in baseline)) continue
      const source = variables[name] ?? normalizeCssValueBoundary(baseline[name])
      const parsed = parseCssColor(source)
      if (parsed) {
        const adjusted = `rgba(${byte(parsed.r)}, ${byte(parsed.g)}, ${byte(parsed.b)}, ${alphaText(parsed.alpha * canvasAlpha)})`
        const after = serializeColorLike(source, adjusted)
        variables[name] = after
        if (after !== source) {
          changedCount += 1
          if (samples.length < 8) samples.push({ variable: name, before: source, after })
        }
      } else variables[name] = source
    }
  }
  if (boost.enabled && boost.colorsEnabled) Object.assign(variables, deriveLegacyBoostOverrides(boost))
  if (boost.enabled && boost.colorsEnabled && boost.protectControls) protectInteractiveVariables(variables, baseline)
  if (boost.enabled && boost.typographyEnabled && boost.typography.fontFamily && '--lumiverse-font-family' in baseline) variables['--lumiverse-font-family'] = boost.typography.fontFamily
  if (boost.enabled && boost.typographyEnabled && boost.typography.scale !== undefined && '--lumiverse-font-scale' in baseline) variables['--lumiverse-font-scale'] = String(clamp(boost.typography.scale, .25, 4))
  for (const [name, value] of Object.entries(variables)) { const prohibited = prohibitedControlCharacters(value); if (prohibited.length) throw new Error(`Boost CSS value ${name} contains prohibited control characters: ${JSON.stringify(value)} (${prohibited.map((entry) => `index ${entry.index}=U+${entry.codePoint.toString(16).toUpperCase().padStart(4, '0')}`).join(', ')})`) }
  const sourceCount = Object.keys(baseline).length, colorCount = standaloneColorCount + complexColorCount, preservedCount = boost.enabled && (boost.colorsEnabled || boost.canvasEnabled) ? Math.max(0, sourceCount - changedCount) : sourceCount
  return { variables, diagnostics: { sourceCount, standaloneColorCount, complexColorCount, transformedColorTokenCount, colorCount, changedCount, preservedCount, skippedCount: preservedCount, samples } }
}

function mix(color: string, target: '#000000' | '#ffffff', amount: number): string { const source = parseHexColor(color), destination = parseHexColor(target); if (!source || !destination) return color; const value = clamp(amount); return `#${channel(source.r + (destination.r - source.r) * value)}${channel(source.g + (destination.g - source.g) * value)}${channel(source.b + (destination.b - source.b) * value)}` }
function readable(color: string): string { const value = parseHexColor(color); return !value || (.2126 * value.r + .7152 * value.g + .0722 * value.b) / 255 <= .58 ? '#ffffff' : '#17131f' }
function alpha(value: BoostColor, multiplier = 1): string { return colorWithAlpha(value.color, clamp(value.alpha * multiplier)) }
function valid(entries: Record<string, string>): Record<string, string> { return entries }
export function compilePrimaryFamily(value: BoostColor): Record<string, string> { return valid({ '--lumiverse-primary': alpha(value), '--lumiverse-primary-hover': colorWithAlpha(mix(value.color, '#ffffff', .12), value.alpha), '--lumiverse-primary-light': alpha(value, .1), '--lumiverse-primary-muted': alpha(value, .6), '--lumiverse-primary-text': colorWithAlpha(mix(value.color, '#ffffff', .18), Math.max(value.alpha, .92)), '--lumiverse-primary-010': alpha(value, .1), '--lumiverse-primary-015': alpha(value, .15), '--lumiverse-primary-020': alpha(value, .2), '--lumiverse-primary-050': alpha(value, .5), '--lumiverse-primary-deep': mix(value.color, '#000000', .72), '--lumiverse-primary-deep-hover': mix(value.color, '#000000', .62), '--lumiverse-primary-deep-contrast': readable(mix(value.color, '#000000', .72)) }) }
export function compileSecondaryFamily(value: BoostColor): Record<string, string> { return valid({ '--lumiverse-secondary': alpha(value, .35), '--lumiverse-secondary-hover': alpha(value, .5), '--lumiverse-secondary-border': alpha(value, .45) }) }
export function compileSurfaceFamily(value: BoostColor): Record<string, string> { const elevated = mix(value.color, '#ffffff', .07), hover = mix(value.color, '#ffffff', .12), deep = mix(value.color, '#000000', .22); return valid({ '--lumiverse-bg': alpha(value), '--lumiverse-bg-elevated': colorWithAlpha(elevated, value.alpha), '--lumiverse-bg-hover': colorWithAlpha(hover, value.alpha), '--lumiverse-bg-dark': mix(value.color, '#000000', .12), '--lumiverse-bg-darker': deep, '--lumiverse-bg-040': alpha(value, .4), '--lumiverse-bg-050': alpha(value, .5), '--lumiverse-bg-070': alpha(value, .7), '--lumiverse-card-bg': colorWithAlpha(elevated, value.alpha * .92), '--lumiverse-card-bg-solid': elevated, '--lumiverse-fill': colorWithAlpha(hover, .1), '--lumiverse-fill-hover': colorWithAlpha(hover, .15), '--lumiverse-fill-strong': colorWithAlpha(hover, .35) }) }
export function compileTextFamily(value: BoostColor): Record<string, string> { return valid({ '--lumiverse-text': alpha(value), '--lumiverse-text-muted': alpha(value, .68), '--lumiverse-text-dim': alpha(value, .48), '--lumiverse-text-hint': alpha(value, .36), '--lumiverse-icon': alpha(value, .9), '--lumiverse-icon-muted': alpha(value, .62), '--lumiverse-icon-dim': alpha(value, .42) }) }
export function compileMutedFamily(value: BoostColor): Record<string, string> { return valid({ '--lumiverse-text-muted': alpha(value), '--lumiverse-text-dim': alpha(value, .7), '--lumiverse-text-hint': alpha(value, .5), '--lumiverse-icon-muted': alpha(value, .9), '--lumiverse-icon-dim': alpha(value, .65) }) }
export function compileBorderFamily(value: BoostColor): Record<string, string> { return valid({ '--lumiverse-border': alpha(value, .45), '--lumiverse-border-hover': alpha(value, .68), '--lumiverse-border-light': alpha(value, .25), '--lumiverse-border-neutral': alpha(value, .34), '--lumiverse-border-neutral-hover': alpha(value, .55) }) }
export function deriveLegacyBoostOverrides(boost: ProjectBoost): Record<string, string> { const result: Record<string, string> = {}, compile: Partial<Record<BoostPaletteRole, (value: BoostColor) => Record<string, string>>> = { primary: compilePrimaryFamily, secondary: compileSecondaryFamily, surface: compileSurfaceFamily, text: compileTextFamily, muted: compileMutedFamily, border: compileBorderFamily }; for (const role of Object.keys(boost.legacyPalette ?? {}) as BoostPaletteRole[]) { const value = boost.legacyPalette?.[role], family = compile[role]; if (value && family) Object.assign(result, family(value)) } return result }
export function deriveBoostTokenOverrides(boost: ProjectBoost, baseline: Record<string, string> = {}): Record<string, string> { return boost.enabled ? transformThemeVariables(baseline, boost).variables : {} }
